// Starts or reuses the Model render for a Vehicle (ADR-0008). Renders are
// shared per brand, model, year, and paint; generation is asynchronous and
// normally finishes in vehicle-render-webhook. When a step has waited longer
// than the webhook should take, this function asks fal directly and
// finishes it, so a lost or unreachable webhook never leaves a render
// "generating" forever. The app calls it again while a render is pending.

import { handler, json, readJson } from '../_shared/http.ts'
import {
  MAX_RENDER_ATTEMPTS,
  paintCode,
  renderKey,
  submitPoster,
} from '../_shared/fal.ts'
import { completeStep, failStep, pollFal } from '../_shared/renderSteps.ts'
import { adminClient, ownedVehicle, requireUser } from '../_shared/supabase.ts'

/** Give the webhook this long before polling fal ourselves. */
const POLL_AFTER_MS = 20_000
/** A step still unfinished after this is abandoned. */
const GIVE_UP_AFTER_MS = 20 * 60_000

Deno.serve(handler(async (req) => {
  await requireUser(req)
  const { vehicleId } = await readJson<{ vehicleId: string }>(req)
  const vehicle = await ownedVehicle(req, vehicleId)
  if (!Deno.env.get('FAL_KEY')) {
    // Not configured: the app keeps the body-type silhouette.
    return json(req, { renderId: null, status: 'unavailable' }, 200)
  }
  const db = adminClient()

  const color = paintCode(vehicle.color)
  const key = renderKey(vehicle.brand, vehicle.model, vehicle.year, color)

  const { data: existing, error: findError } = await db
    .from('model_renders')
    .select('id, render_key, status, attempts, fal_request_id, error, updated_at')
    .eq('render_key', key)
    .maybeSingle()
  if (findError) throw findError

  let renderId = existing?.id as string | undefined
  let start = false

  if (!existing) {
    const { data: created, error } = await db
      .from('model_renders')
      .insert({
        render_key: key,
        brand: vehicle.brand.trim(),
        model: vehicle.model.trim(),
        year: vehicle.year,
        color,
        body_type: vehicle.body_type,
      })
      .select('id')
      .single()
    if (error) {
      if (error.code !== '23505') throw error
      const { data: raced } = await db.from('model_renders').select('id').eq('render_key', key).single()
      renderId = raced!.id
    } else {
      renderId = created.id
      start = true
    }
  } else if (existing.status === 'failed' && existing.attempts < MAX_RENDER_ATTEMPTS) {
    start = true
  } else if (
    (existing.status === 'pending' || (existing.status === 'poster_ready' && !existing.error)) &&
    existing.fal_request_id
  ) {
    const waited = Date.now() - Date.parse(existing.updated_at)
    if (waited > POLL_AFTER_MS) {
      const step = existing.status === 'pending' ? 'poster' : 'glb'
      try {
        const poll = await pollFal(step, existing.fal_request_id)
        if (poll.state === 'done') {
          await completeStep(db, existing, step, poll.payload)
        } else if (poll.state === 'failed') {
          await failStep(db, existing.id, step, poll.error)
        } else if (waited > GIVE_UP_AFTER_MS) {
          await failStep(db, existing.id, step, `fal ${step} still unfinished after 20 minutes`)
        }
      } catch (error) {
        console.error('vehicle-render poll failed', error)
        await failStep(db, existing.id, step, error instanceof Error ? error.message : 'poll failed')
      }
    }
  }

  if (vehicle.render_id !== renderId) {
    const { error } = await db.from('vehicles').update({ render_id: renderId }).eq('id', vehicle.id)
    if (error) throw error
  }

  if (start && renderId) {
    try {
      const requestId = await submitPoster(renderId, {
        brand: vehicle.brand.trim(),
        model: vehicle.model.trim(),
        year: vehicle.year,
        color,
      })
      await db
        .from('model_renders')
        .update({
          status: 'pending',
          fal_request_id: requestId,
          error: null,
          attempts: (existing?.attempts ?? 0) + 1,
        })
        .eq('id', renderId)
    } catch (error) {
      console.error('vehicle-render submit failed', error)
      await db
        .from('model_renders')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message.slice(0, 500) : 'submit failed',
          attempts: (existing?.attempts ?? 0) + 1,
        })
        .eq('id', renderId)
    }
  }

  return json(req, { renderId }, 202)
}))
