// fal calls this when a Model render's poster finishes. The URL carries an
// HMAC token we minted, so only our own jobs are accepted (verify_jwt is off).
// Renders are image-only: a 3D result left over from before SEI-48 carries a
// token for its old step and is refused.

import { timingSafeEqual } from '../_shared/keys.ts'
import { webhookToken } from '../_shared/fal.ts'
import { completePoster, failPoster } from '../_shared/renderPoster.ts'
import { adminClient } from '../_shared/supabase.ts'

type FalWebhook = {
  request_id?: string
  status?: 'OK' | 'ERROR'
  error?: string
  payload?: Record<string, unknown>
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const renderId = url.searchParams.get('render') ?? ''
  const token = url.searchParams.get('token') ?? ''
  if (!renderId) return new Response('bad request', { status: 400 })
  if (!timingSafeEqual(token, await webhookToken(renderId))) {
    return new Response('forbidden', { status: 403 })
  }

  const db = adminClient()
  const { data: render } = await db
    .from('model_renders')
    .select('id, render_key')
    .eq('id', renderId)
    .maybeSingle()
  if (!render) return new Response('ok')

  const body = (await req.json().catch(() => ({}))) as FalWebhook

  try {
    if (body.status !== 'OK' || !body.payload) throw new Error(body.error ?? 'fal poster failed')
    await completePoster(db, render, body.payload)
  } catch (error) {
    console.error('vehicle-render-webhook', error)
    await failPoster(db, renderId, error instanceof Error ? error.message : 'failed')
  }

  return new Response('ok')
})
