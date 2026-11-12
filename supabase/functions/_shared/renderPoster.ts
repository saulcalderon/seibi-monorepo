// Finishing a Model render's poster, its only step. Two paths reach here:
// fal's webhook, and vehicle-render polling fal when the webhook never
// arrives (a local stack fal cannot reach, or a lost delivery). Each writes
// with a status check-and-set, so whichever path is second changes nothing.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { FAL_IMAGE_MODEL, posterUrlFrom, RENDER_BUCKET } from './fal.ts'

const MAX_POSTER_BYTES = 15 * 1024 * 1024

/** Only fal's own file hosts; never fetch an arbitrary URL from a payload. */
function isFalFile(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && /(^|\.)fal\.(media|run|ai)$/.test(u.hostname)
  } catch {
    return false
  }
}

async function copyToStorage(db: SupabaseClient, url: string, path: string) {
  if (!isFalFile(url)) throw new Error(`unexpected file host: ${url.slice(0, 80)}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength > MAX_POSTER_BYTES) throw new Error(`file too large: ${bytes.byteLength}`)
  const { error } = await db.storage
    .from(RENDER_BUCKET)
    .upload(path, bytes, { contentType: 'image/png', upsert: true, cacheControl: '31536000' })
  if (error) throw error
  return path
}

/**
 * Stores the finished poster and marks the render `ready`: the image is the
 * whole render. Returns false when another path already finished it.
 */
export async function completePoster(
  db: SupabaseClient,
  render: { id: string; render_key: string },
  payload: Record<string, unknown>,
): Promise<boolean> {
  const imageUrl = posterUrlFrom(payload)
  if (!imageUrl) throw new Error('no poster in payload')
  const path = await copyToStorage(db, imageUrl, `${render.render_key}/poster.png`)
  const { data: claimed, error } = await db
    .from('model_renders')
    .update({ status: 'ready', poster_path: path, error: null })
    .eq('id', render.id)
    .eq('status', 'pending')
    .select('id')
  if (error) throw error
  return Boolean(claimed?.length)
}

/** Records a failed poster, which fails the render. */
export async function failPoster(db: SupabaseClient, renderId: string, message: string) {
  await db
    .from('model_renders')
    .update({ status: 'failed', error: message.slice(0, 500) })
    .eq('id', renderId)
    .eq('status', 'pending')
}

/** fal's queue routes requests by app id: the first two segments of the model id. */
function falApp(model: string) {
  return model.split('/').slice(0, 2).join('/')
}

export type FalPoll =
  | { state: 'running' }
  | { state: 'done'; payload: Record<string, unknown> }
  | { state: 'failed'; error: string }

/** Asks fal's queue where a poster request is, and fetches its result when finished. */
export async function pollPoster(requestId: string): Promise<FalPoll> {
  const key = Deno.env.get('FAL_KEY')
  if (!key) return { state: 'running' }
  const base = `https://queue.fal.run/${falApp(FAL_IMAGE_MODEL)}/requests/${requestId}`
  const headers = { Authorization: `Key ${key}` }

  const statusRes = await fetch(`${base}/status`, { headers })
  if (statusRes.status === 404) return { state: 'failed', error: 'fal request not found' }
  if (!statusRes.ok) return { state: 'running' }
  const status = (await statusRes.json()) as { status?: string }
  if (status.status !== 'COMPLETED') return { state: 'running' }

  const resultRes = await fetch(base, { headers })
  const body = (await resultRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!resultRes.ok) {
    return { state: 'failed', error: `fal poster ${resultRes.status}: ${JSON.stringify(body.detail ?? body).slice(0, 300)}` }
  }
  return { state: 'done', payload: body }
}
