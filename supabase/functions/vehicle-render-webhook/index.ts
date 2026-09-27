// fal calls this when a render step finishes. The URL carries an HMAC token
// we minted, so only our own jobs are accepted (verify_jwt is off).

import { timingSafeEqual } from '../_shared/keys.ts'
import { webhookToken, type RenderStep } from '../_shared/fal.ts'
import { completeStep, failStep } from '../_shared/renderSteps.ts'
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
    .select('id, render_key')
    .eq('id', renderId)
    .maybeSingle()
  if (!render) return new Response('ok')

  const body = (await req.json().catch(() => ({}))) as FalWebhook

  try {
    if (body.status !== 'OK' || !body.payload) throw new Error(body.error ?? `fal ${step} failed`)
    await completeStep(db, render, step, body.payload)
  } catch (error) {
    console.error('vehicle-render-webhook', step, error)
    await failStep(db, renderId, step, error instanceof Error ? error.message : 'failed')
  }

  return new Response('ok')
})
