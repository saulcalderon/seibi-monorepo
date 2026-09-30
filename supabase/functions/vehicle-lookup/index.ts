// Maintenance schedule and body type for a Vehicle's brand, model, year,
// engine, and market (ADR-0007). Cached in maintenance_schedules and shared
// by every Vehicle that matches. Runs in the background; the client polls
// the schedule row until it leaves `pending`.

import { handler, HttpError, json, readJson } from '../_shared/http.ts'
import { marketFor, normalizeKey, type Market } from '../_shared/keys.ts'
import { cleanSources, plainText, respond, SOURCE_SCHEMA, type Source } from '../_shared/openai.ts'
import {
  adminClient,
  ownedVehicle,
  profileFor,
  requireUser,
  spendAiLookup,
  type VehicleRow,
} from '../_shared/supabase.ts'

const BODY_TYPES = ['sedan', 'hatchback', 'suv', 'pickup', 'van', 'minivan', 'coupe', 'wagon']
/** A pending lookup older than this is treated as abandoned and retried. */
const STALE_PENDING_MS = 5 * 60_000

type LookupResult = {
  found: boolean
  body_type: string | null
  has_severe: boolean
  summary: string
  sources: Source[]
  items: Array<{
    task_code: string
    distance_km: number | null
    months: number | null
    severe_distance_km: number | null
    severe_months: number | null
    note: string | null
    source_url: string
  }>
}

const nullableInt = { type: ['integer', 'null'] }

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'body_type', 'has_severe', 'summary', 'sources', 'items'],
  properties: {
    found: { type: 'boolean' },
    body_type: { type: ['string', 'null'], enum: [...BODY_TYPES, null] },
    has_severe: { type: 'boolean' },
    summary: { type: 'string' },
    sources: { type: 'array', items: SOURCE_SCHEMA },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'task_code',
          'distance_km',
          'months',
          'severe_distance_km',
          'severe_months',
          'note',
          'source_url',
        ],
        properties: {
          task_code: { type: 'string' },
          distance_km: nullableInt,
          months: nullableInt,
          severe_distance_km: nullableInt,
          severe_months: nullableInt,
          note: { type: ['string', 'null'] },
          source_url: { type: 'string' },
        },
      },
    },
  },
}

function instructions(tasks: Array<{ code: string; name: string }>, market: Market) {
  const marketText = market === 'LATAM'
    ? 'the Central American / Latin American market (El Salvador). Prefer the manufacturer\'s Latin American maintenance guide; if only the U.S. schedule is available, use it and say so in the summary.'
    : 'the United States market.'
  return `You research official vehicle maintenance schedules for Seibi, a maintenance app.

Find the manufacturer's scheduled maintenance for the exact vehicle given, as sold in ${marketText}

Rules — follow all of them:
- Use only information published by a verifiable source: the owner's manual, the manufacturer's warranty and maintenance guide, the manufacturer's website, or a reputable publication that quotes the manufacturer. Every item must have the URL of the page that states it.
- Never estimate, extrapolate, or fill gaps with typical values. If a task's interval is not stated by a source, leave the task out.
- If you cannot find a trustworthy source for this vehicle's schedule, return found=false and an empty items list.
- Map each interval to exactly one of these task codes and use no other codes:
${tasks.map((t) => `  ${t.code}: ${t.name}`).join('\n')}
- distance_km is in kilometers. If the source gives miles, convert (1 mi = 1.609344 km) and round to the nearest 500 km. months is the time interval. Use null when the source gives none.
- If the source has a separate "severe" or "special operating conditions" schedule, fill severe_distance_km/severe_months and set has_severe=true.
- Inspections count only when the source schedules them at a fixed interval.
- body_type is the vehicle's body style (${BODY_TYPES.join(', ')}), or null if unsure.
- summary: one or two sentences in Spanish, for the vehicle owner, naming the source (for example "Según el manual del propietario de Toyota…"). If found=false, explain in Spanish that no official schedule was found. Plain text only: no URLs, no Markdown, no citations in the summary.
- sources: every page you relied on.`
}

async function runLookup(scheduleId: string, vehicle: VehicleRow, market: Market) {
  const db = adminClient()
  try {
    const { data: tasks, error: tasksError } = await db
      .from('maintenance_tasks')
      .select('code, name')
      .order('sort_order')
    if (tasksError) throw tasksError
    const codes = new Set((tasks ?? []).map((t) => t.code))

    const vehicleText = [vehicle.year, vehicle.brand, vehicle.model, vehicle.trim_level, vehicle.engine]
      .filter(Boolean)
      .join(' ')
    const { data, citations } = await respond<LookupResult>({
      instructions: instructions(tasks ?? [], market),
      input: `Vehicle: ${vehicleText}`,
      schemaName: 'maintenance_schedule',
      schema: SCHEMA,
      location: { country: market === 'LATAM' ? 'SV' : 'US' },
      timeoutMs: 300_000,
    })

    const sources = cleanSources(data.sources ?? [], citations)
    const items = (data.items ?? []).filter(
      (i) =>
        codes.has(i.task_code) &&
        /^https?:\/\//.test(i.source_url ?? '') &&
        (positive(i.distance_km) || positive(i.months)),
    )
    const found = data.found && items.length > 0 && sources.length > 0
    const bodyType = BODY_TYPES.includes(data.body_type ?? '') ? data.body_type : null

    if (found) {
      const byTask = new Map(items.map((i) => [i.task_code, i]))
      const { error: itemsError } = await db.from('maintenance_schedule_items').insert(
        [...byTask.values()].map((i) => ({
          schedule_id: scheduleId,
          task_code: i.task_code,
          distance_km: positive(i.distance_km) ? i.distance_km : null,
          months: positive(i.months) ? i.months : null,
          severe_distance_km: positive(i.severe_distance_km) ? i.severe_distance_km : null,
          severe_months: positive(i.severe_months) ? i.severe_months : null,
          note: i.note,
          source_url: i.source_url,
        })),
      )
      if (itemsError) throw itemsError
    }

    const { error } = await db
      .from('maintenance_schedules')
      .update({
        status: found ? 'ready' : 'general',
        body_type: bodyType,
        has_severe: found && data.has_severe,
        sources: found ? sources : [],
        summary: plainText(data.summary ?? ''),
        error: null,
        looked_up_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
    if (error) throw error

    if (bodyType) {
      await db.from('vehicles').update({ body_type: bodyType }).eq('id', vehicle.id).is('body_type', null)
    }
  } catch (error) {
    console.error('vehicle-lookup failed', error)
    await db
      .from('maintenance_schedules')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 500) : 'unknown',
      })
      .eq('id', scheduleId)
  }
}

function positive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

Deno.serve(handler(async (req) => {
  const user = await requireUser(req)
  const { vehicleId } = await readJson<{ vehicleId: string }>(req)
  const vehicle = await ownedVehicle(req, vehicleId)
  if (!Deno.env.get('OPENAI_API_KEY')) {
    // Not configured: the app shows the general schedule. Write nothing so a
    // later call, once the key exists, still runs the lookup.
    return json(req, { scheduleId: null, status: 'unavailable' }, 200)
  }
  const profile = await profileFor(user.id)
  const market = marketFor(profile.country)
  const db = adminClient()

  const key = {
    brand_key: normalizeKey(vehicle.brand),
    model_key: normalizeKey(vehicle.model),
    year: vehicle.year,
    engine_key: normalizeKey(vehicle.engine),
    market,
  }

  const { data: existing, error: findError } = await db
    .from('maintenance_schedules')
    .select('id, status, updated_at, body_type')
    .match(key)
    .maybeSingle()
  if (findError) throw findError

  let scheduleId = existing?.id as string | undefined
  let start = false

  if (!existing) {
    await spendAiLookup(user.id)
    const { data: created, error } = await db
      .from('maintenance_schedules')
      .insert({ ...key, status: 'pending' })
      .select('id')
      .single()
    if (error) {
      // Another request created it first; use theirs.
      if (error.code !== '23505') throw error
      const { data: raced } = await db.from('maintenance_schedules').select('id').match(key).single()
      scheduleId = raced!.id
    } else {
      scheduleId = created.id
      start = true
    }
  } else if (
    existing.status === 'failed' ||
    (existing.status === 'pending' &&
      Date.now() - Date.parse(existing.updated_at) > STALE_PENDING_MS)
  ) {
    await spendAiLookup(user.id)
    await db
      .from('maintenance_schedules')
      .update({ status: 'pending', error: null })
      .eq('id', existing.id)
    await db.from('maintenance_schedule_items').delete().eq('schedule_id', existing.id)
    start = true
  }

  if (!scheduleId) throw new HttpError(500, 'internal', 'No pudimos preparar el plan.')

  const link: Record<string, unknown> = {}
  if (vehicle.schedule_id !== scheduleId) link.schedule_id = scheduleId
  if (!vehicle.body_type && existing?.body_type) link.body_type = existing.body_type
  if (Object.keys(link).length > 0) {
    const { error } = await db.from('vehicles').update(link).eq('id', vehicle.id)
    if (error) throw error
  }

  if (start) {
    // @ts-ignore EdgeRuntime is provided by Supabase Edge Functions.
    EdgeRuntime.waitUntil(runLookup(scheduleId, vehicle, market))
  }

  return json(req, { scheduleId, status: start ? 'pending' : existing?.status ?? 'pending' }, 202)
}))
