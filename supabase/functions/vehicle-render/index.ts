// Starts or reuses the Model render for a Vehicle (ADR-0008). Renders are
// shared per brand, model, year, and paint; generation is asynchronous and
// finishes in vehicle-render-webhook.

import { handler, json, readJson } from '../_shared/http.ts'
import {
  MAX_RENDER_ATTEMPTS,
  paintCode,
  renderKey,
  submitPoster,
} from '../_shared/fal.ts'
import { adminClient, ownedVehicle, requireUser } from '../_shared/supabase.ts'

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
    .select('id, status, attempts')
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
