import { supabase } from './supabase'
import { sanitizePlate, type MileageUnit, type VehicleProfile } from './vehicleProfile'

export const VEHICLES_QUERY_ROOT = 'vehicles' as const

export function vehiclesQueryKey(userId: string) {
  return [VEHICLES_QUERY_ROOT, userId] as const
}

export type VehicleWriteStage = 'session' | 'vehicle' | 'reading'

export class VehicleWriteError extends Error {
  readonly stage: VehicleWriteStage
  readonly vehicleId: string | null

  constructor(stage: VehicleWriteStage, message: string, vehicleId: string | null = null) {
    super(message)
    this.name = 'VehicleWriteError'
    this.stage = stage
    this.vehicleId = vehicleId
  }
}

export type VehicleCreateInput = {
  brand: string
  model: string
  year: number
  plate: string | null
  odometerMeasure: MileageUnit
  firstReading: number
  existingVehicleId?: string | null
}

export type VehicleIdentityInput = {
  id: string
  brand: string
  model: string
  year: number
  plate: string | null
}

type VehicleListRow = {
  id: string
  brand: string
  model: string
  year: number
  plate: string | null
  odometer_measure: MileageUnit
}

type MileageListRow = {
  vehicle_id: string
  reading: number
  recorded_on: string
}

export function plateOrNull(plate: string) {
  const clean = sanitizePlate(plate)
  return clean.length > 0 ? clean : null
}

export function parseMileageReading(mileage: string) {
  const value = Number(String(mileage).replace(/,/g, '').trim())
  if (!Number.isFinite(value) || value < 0) {
    throw new VehicleWriteError('reading', 'invalid-reading')
  }
  return Math.round(value)
}

export function pendingVehicleIdFrom(error: unknown) {
  return error instanceof VehicleWriteError ? error.vehicleId : null
}

export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function currentOdometerFromReadings(
  readings: readonly Pick<MileageListRow, 'reading' | 'recorded_on'>[],
) {
  if (readings.length === 0) return null
  let best = readings[0]
  for (const item of readings.slice(1)) {
    if (item.recorded_on > best.recorded_on) {
      best = item
      continue
    }
    if (item.recorded_on === best.recorded_on && item.reading > best.reading) {
      best = item
    }
  }
  return best.reading
}

function toVehicleProfile(row: VehicleListRow, odometer: number | null): VehicleProfile {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: String(row.year),
    mileage: odometer == null ? '' : String(odometer),
    mileageUnit: row.odometer_measure === 'mi' ? 'mi' : 'km',
    plate: row.plate ?? '',
  }
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user.id) {
    throw new VehicleWriteError('session', error?.message ?? 'signed-out')
  }
  return data.session.user.id
}

async function fetchVehicleProfile(vehicleId: string): Promise<VehicleProfile> {
  const { data: row, error } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, plate, odometer_measure')
    .eq('id', vehicleId)
    .is('deleted_at', null)
    .returns<VehicleListRow>()
    .maybeSingle()

  if (error || !row) {
    throw new VehicleWriteError('vehicle', error?.message ?? 'missing-vehicle', vehicleId)
  }

  const { data: readings, error: readingsError } = await supabase
    .from('mileage_readings')
    .select('vehicle_id, reading, recorded_on')
    .eq('vehicle_id', vehicleId)
    .returns<MileageListRow[]>()

  if (readingsError) {
    throw new VehicleWriteError('reading', readingsError.message, vehicleId)
  }

  return toVehicleProfile(row, currentOdometerFromReadings(readings ?? []))
}

export async function listVehicles(): Promise<VehicleProfile[]> {
  const { data: rows, error } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, plate, odometer_measure')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .returns<VehicleListRow[]>()

  if (error) throw error
  const vehicles = rows ?? []
  if (vehicles.length === 0) return []

  const { data: readings, error: readingsError } = await supabase
    .from('mileage_readings')
    .select('vehicle_id, reading, recorded_on')
    .in(
      'vehicle_id',
      vehicles.map((row) => row.id),
    )
    .returns<MileageListRow[]>()

  if (readingsError) throw readingsError

  const byVehicle = new Map<string, MileageListRow[]>()
  for (const reading of readings ?? []) {
    const list = byVehicle.get(reading.vehicle_id) ?? []
    list.push(reading)
    byVehicle.set(reading.vehicle_id, list)
  }

  return vehicles.map((row) =>
    toVehicleProfile(row, currentOdometerFromReadings(byVehicle.get(row.id) ?? [])),
  )
}

async function insertFirstReading(vehicleId: string, reading: number) {
  const { data: existing, error: existingError } = await supabase
    .from('mileage_readings')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .limit(1)

  if (existingError) {
    throw new VehicleWriteError('reading', existingError.message, vehicleId)
  }
  if (existing && existing.length > 0) return

  const { error } = await supabase.from('mileage_readings').insert({
    vehicle_id: vehicleId,
    reading,
    recorded_on: todayIsoDate(),
  })

  if (error) {
    throw new VehicleWriteError('reading', error.message, vehicleId)
  }
}

export async function createVehicle(input: VehicleCreateInput): Promise<VehicleProfile> {
  const userId = await requireUserId()
  let vehicleId = input.existingVehicleId ?? null

  if (!vehicleId) {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        user_id: userId,
        brand: input.brand,
        model: input.model,
        year: input.year,
        plate: input.plate,
        odometer_measure: input.odometerMeasure,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      throw new VehicleWriteError('vehicle', error?.message ?? 'insert-failed')
    }
    vehicleId = data.id as string
  }

  await insertFirstReading(vehicleId, input.firstReading)
  return fetchVehicleProfile(vehicleId)
}

export async function updateVehicleIdentity(input: VehicleIdentityInput): Promise<VehicleProfile> {
  await requireUserId()
  const { error } = await supabase
    .from('vehicles')
    .update({
      brand: input.brand,
      model: input.model,
      year: input.year,
      plate: input.plate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .is('deleted_at', null)

  if (error) {
    throw new VehicleWriteError('vehicle', error.message, input.id)
  }

  return fetchVehicleProfile(input.id)
}

export async function withdrawVehicle(id: string) {
  await requireUserId()
  const { error } = await supabase
    .from('vehicles')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    throw new VehicleWriteError('vehicle', error.message, id)
  }
}
