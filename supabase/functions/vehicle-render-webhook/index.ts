// fal calls this when a render step finishes. The URL carries an HMAC token
// we minted, so only our own jobs are accepted (verify_jwt is off).

import { timingSafeEqual } from '../_shared/keys.ts'
import {
  glbUrlFrom,
  MAX_GLB_BYTES,
  posterUrlFrom,
  RENDER_BUCKET,
  submitGlb,
  webhookToken,
  type RenderStep,
} from '../_shared/fal.ts'
import { adminClient } from '../_shared/supabase.ts'


type FalWebhook = {
  request_id?: string
  status?: 'OK' | 'ERROR'
  error?: string
  payload?: Record<string, unknown>
}

async function copyToStorage(url: string, path: string, contentType: string, maxBytes: number) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength > maxBytes) throw new Error(`file too large: ${bytes.byteLength}`)
  const { error } = await adminClient()
    .storage.from(RENDER_BUCKET)
    .upload(path, bytes, { contentType, upsert: true, cacheControl: '31536000' })
  if (error) throw error
  return path
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const renderId = url.searchParams.get('render') ?? ''
  const step = url.searchParams.get('step') as RenderStep | null
  const token = url.searchParams.get('token') ?? ''
  if (!renderId || (step !== 'poster' && step !== 'glb')) {
    return new Response('bad request', { status: 400 })
  }
  if (!timingSafeEqual(token, await webhookToken(renderId, step))) {
    return new Response('forbidden', { status: 403 })
  }

  const db = adminClient()
  const { data: render } = await db
    .from('model_renders')
    .select('id, render_key, status')
    .eq('id', renderId)
    .maybeSingle()
  if (!render) return new Response('ok')

  const body = (await req.json().catch(() => ({}))) as FalWebhook

  try {
    if (body.status !== 'OK' || !body.payload) {
      throw new Error(body.error ?? `fal ${step} failed`)
    }

    if (step === 'poster') {
      const imageUrl = posterUrlFrom(body.payload)
      if (!imageUrl) throw new Error('no poster in payload')
      const path = await copyToStorage(
        imageUrl,
        `${render.render_key}/poster.png`,
        'image/png',
        15 * 1024 * 1024,
      )
      await db.from('model_renders').update({ status: 'poster_ready', poster_path: path, error: null })
        .eq('id', renderId)
      const publicUrl = db.storage.from(RENDER_BUCKET).getPublicUrl(path).data.publicUrl
      const requestId = await submitGlb(renderId, publicUrl)
      await db.from('model_renders').update({ fal_request_id: requestId }).eq('id', renderId)
    } else {
      const glbUrl = glbUrlFrom(body.payload)
      if (!glbUrl) throw new Error('no glb in payload')
      const path = await copyToStorage(
        glbUrl,
        `${render.render_key}/model.glb`,
        'model/gltf-binary',
        MAX_GLB_BYTES,
      )
      await db.from('model_renders').update({ status: 'ready', glb_path: path, error: null })
        .eq('id', renderId)
    }
  } catch (error) {
    console.error('vehicle-render-webhook', step, error)
    const message = error instanceof Error ? error.message.slice(0, 500) : 'failed'
    // A failed 3D step keeps the poster; only a failed poster fails the render.
    await db
      .from('model_renders')
      .update(step === 'poster' ? { status: 'failed', error: message } : { error: message })
      .eq('id', renderId)
  }

  return new Response('ok')
})
