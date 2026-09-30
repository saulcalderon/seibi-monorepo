// Finishing a Model render step (ADR-0008). Two paths reach here: fal's
// webhook, and vehicle-render polling fal when the webhook never arrives
// (a local stack fal cannot reach, or a lost delivery). Each step advances
// with a status check-and-set, so the two paths never both submit the 3D job.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  FAL_3D_MODEL,
  FAL_IMAGE_MODEL,
  glbUrlFrom,
  MAX_GLB_BYTES,
  posterUrlFrom,
  RENDER_BUCKET,
  submitGlb,
  type RenderStep,
} from './fal.ts'

/** Only fal's own file hosts; never fetch an arbitrary URL from a payload. */
function isFalFile(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && /(^|\.)fal\.(media|run|ai)$/.test(u.hostname)
  } catch {
    return false
  }
}

async function copyToStorage(
  db: SupabaseClient,
  url: string,
  path: string,
  contentType: string,
  maxBytes: number,
) {
  if (!isFalFile(url)) throw new Error(`unexpected file host: ${url.slice(0, 80)}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength > maxBytes) throw new Error(`file too large: ${bytes.byteLength}`)
  const { error } = await db.storage
    .from(RENDER_BUCKET)
    .upload(path, bytes, { contentType, upsert: true, cacheControl: '31536000' })
  if (error) throw error
  return path
}

/** The status a render is in while waiting for a step's result. */
export function statusWaitingFor(step: RenderStep) {
  return step === 'poster' ? 'pending' : 'poster_ready'
}

/**
 * Stores a finished step. For the poster, also submits the 3D job. Returns
 * false when another path already advanced this step.
 */
export async function completeStep(
  db: SupabaseClient,
  render: { id: string; render_key: string },
  step: RenderStep,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (step === 'poster') {
    const imageUrl = posterUrlFrom(payload)
    if (!imageUrl) throw new Error('no poster in payload')
    const path = await copyToStorage(db, imageUrl, `${render.render_key}/poster.png`, 'image/png', 15 * 1024 * 1024)
    const { data: claimed, error } = await db
      .from('model_renders')
      .update({ status: 'poster_ready', poster_path: path, error: null })
      .eq('id', render.id)
      .eq('status', 'pending')
      .select('id')
    if (error) throw error
    if (!claimed?.length) return false
    // Hand fal its own copy of the image: our Storage URL is not reachable
    // from fal on a local stack, and fal's CDN is closest to its workers.
    const requestId = await submitGlb(render.id, imageUrl)
    await db.from('model_renders').update({ fal_request_id: requestId }).eq('id', render.id)
    return true
  }

  const glbUrl = glbUrlFrom(payload)
  if (!glbUrl) throw new Error('no glb in payload')
  const path = await copyToStorage(db, glbUrl, `${render.render_key}/model.glb`, 'model/gltf-binary', MAX_GLB_BYTES)
  const { data: claimed, error } = await db
    .from('model_renders')
    .update({ status: 'ready', glb_path: path, error: null })
    .eq('id', render.id)
    .eq('status', 'poster_ready')
    .select('id')
  if (error) throw error
  return Boolean(claimed?.length)
}

/**
 * Records a failed step. A failed poster fails the render; a failed 3D step
 * keeps the poster and records the error, which ends "generating" in the UI.
 */
export async function failStep(db: SupabaseClient, renderId: string, step: RenderStep, message: string) {
  await db
    .from('model_renders')
    .update(step === 'poster' ? { status: 'failed', error: message.slice(0, 500) } : { error: message.slice(0, 500) })
    .eq('id', renderId)
    .eq('status', statusWaitingFor(step))
}

/** fal's queue routes requests by app id: the first two segments of the model id. */
function falApp(model: string) {
  return model.split('/').slice(0, 2).join('/')
}

export type FalPoll =
  | { state: 'running' }
  | { state: 'done'; payload: Record<string, unknown> }
  | { state: 'failed'; error: string }

/** Asks fal's queue where a request is, and fetches its result when finished. */
export async function pollFal(step: RenderStep, requestId: string): Promise<FalPoll> {
  const key = Deno.env.get('FAL_KEY')
  if (!key) return { state: 'running' }
  const base = `https://queue.fal.run/${falApp(step === 'poster' ? FAL_IMAGE_MODEL : FAL_3D_MODEL)}/requests/${requestId}`
  const headers = { Authorization: `Key ${key}` }

  const statusRes = await fetch(`${base}/status`, { headers })
  if (statusRes.status === 404) return { state: 'failed', error: 'fal request not found' }
  if (!statusRes.ok) return { state: 'running' }
  const status = (await statusRes.json()) as { status?: string }
  if (status.status !== 'COMPLETED') return { state: 'running' }

  const resultRes = await fetch(base, { headers })
  const body = (await resultRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!resultRes.ok) {
    return { state: 'failed', error: `fal ${step} ${resultRes.status}: ${JSON.stringify(body.detail ?? body).slice(0, 300)}` }
  }
  return { state: 'done', payload: body }
}
