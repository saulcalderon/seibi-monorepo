// Estimate lookup: a USD price range for a Maintenance task, repair, or part
// on one Vehicle in one city, with sources. Cached 30 days and shared by
// everyone asking the same thing for the same model and city.

import { handler, HttpError, json, readJson } from '../_shared/http.ts'
import { normalizeKey, sha256 } from '../_shared/keys.ts'
import { cleanSources, respond, SOURCE_SCHEMA, type Source } from '../_shared/openai.ts'
import {
  adminClient,
  ownedVehicle,
  profileFor,
  requireUser,
  spendAiLookup,
} from '../_shared/supabase.ts'

type Range = { min: number; max: number } | null

export type EstimateResult = {
  found: boolean
  title: string
  summary: string
  parts_economy: Range
  parts_oem: Range
  labor: Range
  total_independent: Range
  total_dealership: Range
  includes: string[]
  factors: string[]
  confidence: 'low' | 'medium' | 'high'
  sources: Source[]
}

const RANGE = {
  type: ['object', 'null'],
  additionalProperties: false,
  required: ['min', 'max'],
  properties: { min: { type: 'number' }, max: { type: 'number' } },
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'found',
    'title',
    'summary',
    'parts_economy',
    'parts_oem',
    'labor',
    'total_independent',
    'total_dealership',
    'includes',
    'factors',
    'confidence',
    'sources',
  ],
  properties: {
    found: { type: 'boolean' },
    title: { type: 'string' },
    summary: { type: 'string' },
    parts_economy: RANGE,
    parts_oem: RANGE,
    labor: RANGE,
    total_independent: RANGE,
    total_dealership: RANGE,
    includes: { type: 'array', items: { type: 'string' } },
    factors: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    sources: { type: 'array', items: SOURCE_SCHEMA },
  },
}

const COUNTRY_NAME = { SV: 'El Salvador', US: 'the United States' } as const

function instructions(country: 'SV' | 'US', city: string) {
  const place = city ? `${city}, ${COUNTRY_NAME[country]}` : COUNTRY_NAME[country]
  return `You are Seibi's price researcher. Seibi filters what the web says about car maintenance prices and shows the owner an organized, honest range. Answer in Spanish.

Research the current price, in U.S. dollars, of the requested work for the exact vehicle, in ${place}.

Rules — follow all of them:
- Every number must come from sources you found: parts retailers, shop or dealership price lists, repair-cost guides, or local listings. Prefer sources from ${COUNTRY_NAME[country]}; if you use prices from elsewhere, say so in "factors" and lower the confidence.
- Give ranges (min and max), never a single price. Use null for any range you could not support with a source. Never make up a number.
- parts_economy: aftermarket or economy parts. parts_oem: original (OEM) parts. labor: labor only. total_independent: parts plus labor at an independent shop. total_dealership: parts plus labor at a dealership.
- includes: short list of what the job usually includes (for example "Aceite sintético 5W-30, 4.4 L" or "Filtro de aceite").
- factors: what moves the price for this vehicle and place (engine, part origin, shop type, labor hours, local availability).
- confidence: high only with several consistent, recent, local sources; low when sources are scarce, old, or foreign.
- If you cannot find enough information, set found=false, leave the ranges null, and explain in summary what is missing.
- title: short Spanish name of the job. summary: two sentences, plain Spanish, no jargon.
- If the request is not about vehicle maintenance, repairs, services, or parts, set found=false and say in summary that Seibi only estimates vehicle maintenance.`
}

Deno.serve(handler(async (req) => {
  const user = await requireUser(req)
  const { vehicleId, taskCode, query } = await readJson<{
    vehicleId: string
    taskCode?: string | null
    query?: string | null
  }>(req)
  const vehicle = await ownedVehicle(req, vehicleId)
  const profile = await profileFor(user.id)
  if (!profile.country) {
    throw new HttpError(
      409,
      'profile_location',
      'Dinos tu país y ciudad en Perfil para calcular precios de tu zona.',
    )
  }
  const db = adminClient()

  let label = (query ?? '').trim().slice(0, 200)
  if (taskCode) {
    const { data: task } = await db
      .from('maintenance_tasks')
      .select('name')
      .eq('code', taskCode)
      .maybeSingle()
    if (!task) throw new HttpError(400, 'bad_request', 'Esa tarea no existe.')
    label = task.name
  }
  if (label.length < 3) {
    throw new HttpError(400, 'bad_request', 'Escribe qué servicio, reparación o pieza quieres cotizar.')
  }

  const city = (profile.city ?? '').trim()
  const cacheKey = await sha256(
    [
      normalizeKey(vehicle.brand),
      normalizeKey(vehicle.model),
      vehicle.year,
      normalizeKey(vehicle.engine),
      taskCode ?? normalizeKey(label),
      profile.country,
      normalizeKey(city),
    ].join('|'),
  )

  const { data: cached } = await db
    .from('estimates')
    .select('id, result, sources, created_at, expires_at')
    .eq('cache_key', cacheKey)
    .maybeSingle()

  let estimate = cached && Date.parse(cached.expires_at) > Date.now() ? cached : null

  if (!estimate) {
    await spendAiLookup(user.id)
    const vehicleText = [vehicle.year, vehicle.brand, vehicle.model, vehicle.trim_level, vehicle.engine]
      .filter(Boolean)
      .join(' ')
    const { data, citations } = await respond<EstimateResult>({
      instructions: instructions(profile.country, city),
      input: `Vehicle: ${vehicleText}\nRequested work: ${label}`,
      schemaName: 'estimate',
      schema: SCHEMA,
      location: { country: profile.country, city },
    })
    const sources = cleanSources(data.sources ?? [], citations)
    const result: EstimateResult = {
      ...data,
      // No sources means no numbers we can stand behind.
      found: data.found && sources.length > 0,
      sources,
    }
    if (!result.found) {
      result.parts_economy = null
      result.parts_oem = null
      result.labor = null
      result.total_independent = null
      result.total_dealership = null
      result.confidence = 'low'
    }

    const row = {
      cache_key: cacheKey,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      task_code: taskCode ?? null,
      query: label,
      country: profile.country,
      city,
      result,
      sources,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    }
    const { data: saved, error } = await db
      .from('estimates')
      .upsert(row, { onConflict: 'cache_key' })
      .select('id, result, sources, created_at, expires_at')
      .single()
    if (error) throw error
    estimate = saved
  }

  const { error: requestError } = await db
    .from('estimate_requests')
    .insert({ user_id: user.id, vehicle_id: vehicle.id, estimate_id: estimate!.id })
  if (requestError) throw requestError

  return json(req, {
    id: estimate!.id,
    query: label,
    taskCode: taskCode ?? null,
    city,
    country: profile.country,
    createdAt: estimate!.created_at,
    result: estimate!.result,
  })
}))
