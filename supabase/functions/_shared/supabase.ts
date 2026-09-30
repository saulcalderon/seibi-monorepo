import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './http.ts'

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/** A client that acts as the caller, so RLS applies. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUser(req: Request): Promise<User> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'unauthorized', 'Inicia sesión para continuar.')
  const { data, error } = await adminClient().auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'unauthorized', 'Inicia sesión para continuar.')
  return data.user
}

export const AI_DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '20')

/** Spends one AI lookup for the user, or throws when today's limit is used up. */
export async function spendAiLookup(userId: string): Promise<void> {
  const { data, error } = await adminClient().rpc('spend_ai_lookup', {
    p_user_id: userId,
    p_limit: AI_DAILY_LIMIT,
  })
  if (error) throw error
  if (data !== true) {
    throw new HttpError(
      429,
      'ai_limit',
      `Llegaste al límite de ${AI_DAILY_LIMIT} consultas de hoy. Vuelve mañana.`,
    )
  }
}

export type VehicleRow = {
  id: string
  user_id: string
  brand: string
  model: string
  year: number
  engine: string | null
  trim_level: string | null
  color: string | null
  body_type: string | null
  odometer_measure: 'km' | 'mi'
  schedule_id: string | null
  render_id: string | null
}

/** Loads a Vehicle the caller owns (RLS), or throws 404. */
export async function ownedVehicle(req: Request, vehicleId: string): Promise<VehicleRow> {
  if (!vehicleId) throw new HttpError(400, 'bad_request', 'Falta el Vehículo.')
  const { data, error } = await userClient(req)
    .from('vehicles')
    .select(
      'id, user_id, brand, model, year, engine, trim_level, color, body_type, odometer_measure, schedule_id, render_id',
    )
    .eq('id', vehicleId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'not_found', 'No encontramos ese Vehículo.')
  return data as VehicleRow
}

export type ProfileRow = {
  display_name: string | null
  country: 'SV' | 'US' | null
  city: string | null
  knowledge_level: 'none' | 'basic' | 'intermediate' | 'advanced' | null
}

export async function profileFor(userId: string): Promise<ProfileRow> {
  const { data, error } = await adminClient()
    .from('profiles')
    .select('display_name, country, city, knowledge_level')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow | null) ?? {
    display_name: null,
    country: null,
    city: null,
    knowledge_level: null,
  }
}
