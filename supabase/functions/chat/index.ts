// Chat de Seibi: follow-up questions about the user's Vehicles, maintenance,
// repairs, and prices. Answers adapt to the user's Knowledge level and cite
// sources. Off-topic questions are declined.

import { handler, HttpError, json, readJson } from '../_shared/http.ts'
import { cleanSources, respond, SOURCE_SCHEMA, type Source } from '../_shared/openai.ts'
import {
  adminClient,
  ownedVehicle,
  profileFor,
  requireUser,
  spendAiLookup,
  type VehicleRow,
} from '../_shared/supabase.ts'

const HISTORY = 12

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'sources'],
  properties: {
    answer: { type: 'string' },
    sources: { type: 'array', items: SOURCE_SCHEMA },
  },
}

const LEVEL_GUIDE = {
  none: 'The user knows nothing about cars. Use everyday words, explain any technical term in a short parenthesis, and give one clear next step.',
  basic: 'The user knows the basics. Keep it simple; explain less common terms briefly.',
  intermediate: 'The user is comfortable with maintenance terms. Be concise and specific.',
  advanced: 'The user is experienced. Be technical and precise: specs, part numbers, fluid types, torque when relevant.',
} as const

function instructions(
  level: keyof typeof LEVEL_GUIDE,
  place: string,
  vehicle: VehicleRow | null,
) {
  const vehicleText = vehicle
    ? [vehicle.year, vehicle.brand, vehicle.model, vehicle.trim_level, vehicle.engine]
      .filter(Boolean)
      .join(' ')
    : 'not specified'
  return `You are the Seibi assistant inside a vehicle maintenance app. Always answer in Spanish.

Scope: only the user's vehicle maintenance, repairs, services, parts, warning signs, and their prices. If the question is outside that scope, say briefly and kindly that you can only help with vehicle maintenance, and suggest a related question.

Vehicle: ${vehicleText}. Location: ${place}. Currency: USD.

${LEVEL_GUIDE[level]}

Rules:
- Base facts and numbers on sources you find; list them in "sources". Never invent specifications, intervals, or prices. If you are not sure, say so.
- Prices are always ranges and always estimates, not quotes. Mention that they vary by city, part quality and origin, shop type, and labor.
- For anything that affects safety (brakes, steering, tires, overheating, warning lights), recommend having a mechanic check it.
- Keep answers short: at most 120 words, short paragraphs or a short list. Plain text, no Markdown headings.`
}

Deno.serve(handler(async (req) => {
  const user = await requireUser(req)
  const { message, vehicleId } = await readJson<{ message: string; vehicleId?: string | null }>(req)
  const text = (message ?? '').trim()
  if (text.length < 2) throw new HttpError(400, 'bad_request', 'Escribe tu pregunta.')
  if (text.length > 1000) throw new HttpError(400, 'bad_request', 'Tu pregunta es muy larga.')

  const vehicle = vehicleId ? await ownedVehicle(req, vehicleId) : null
  const profile = await profileFor(user.id)
  await spendAiLookup(user.id)

  const db = adminClient()
  const { data: history } = await db
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(HISTORY)

  const place = [profile.city, profile.country === 'SV' ? 'El Salvador' : profile.country === 'US' ? 'Estados Unidos' : null]
    .filter(Boolean)
    .join(', ') || 'unknown'

  const { data, citations } = await respond<{ answer: string; sources: Source[] }>({
    instructions: instructions(profile.knowledge_level ?? 'basic', place, vehicle),
    input: [
      ...(history ?? []).reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: text },
    ],
    schemaName: 'chat_answer',
    schema: SCHEMA,
    location: profile.country ? { country: profile.country, city: profile.city } : undefined,
  })
  const sources = cleanSources(data.sources ?? [], citations)

  const now = Date.now()
  const { data: saved, error } = await db
    .from('chat_messages')
    .insert([
      {
        user_id: user.id,
        vehicle_id: vehicle?.id ?? null,
        role: 'user',
        content: text,
        sources: [],
        created_at: new Date(now - 1).toISOString(),
      },
      {
        user_id: user.id,
        vehicle_id: vehicle?.id ?? null,
        role: 'assistant',
        content: data.answer,
        sources,
        created_at: new Date(now).toISOString(),
      },
    ])
    .select('id, role, content, sources, created_at, vehicle_id')
  if (error) throw error

  return json(req, { messages: saved })
}))
