// Every write the app makes. Each one invalidates the garage query so all
// screens see the change. Mileage rules follow ADR-0004: a standalone
// reading is dated today and must beat the current odometer; a reading
// written with a Service may be any number (backfill).

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer'
import { useAuthSession } from './authSession'
import { invokeFunction } from './functions'
import { todayIso } from './format'
import { garageQueryKey, type VehicleView } from './garage'
import { supabase } from './supabase'

/** A validation problem the form can show next to the field. */
export class InputError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'InputError'
    this.field = field
  }
}

function useGarageMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const { user } = useAuthSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: garageQueryKey(user.id) })
    },
  })
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new InputError('session', 'Tu sesión expiró. Inicia sesión de nuevo.')
  return id
}

function nonNegativeInt(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new InputError(field, 'Escribe un número válido.')
  }
  return Math.round(value)
}

function trimmedOrNull(value: string | null | undefined) {
  const t = (value ?? '').trim()
  return t.length > 0 ? t : null
}

/** Ask the server for the schedule and render; failures stay silent (general schedule, silhouette). */
function refreshVehicleData(vehicleId: string, which: { lookup: boolean; render: boolean }) {
  if (which.lookup) {
    void invokeFunction('vehicle-lookup', { vehicleId }).catch((e) =>
      console.warn('[vehicle-lookup]', e),
    )
  }
  if (which.render) {
    void invokeFunction('vehicle-render', { vehicleId }).catch((e) =>
      console.warn('[vehicle-render]', e),
    )
  }
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export type VehicleInput = {
  brand: string
  model: string
  year: number
  plate: string | null
  engine: string | null
  trimLevel: string | null
  color: string | null
  measure: OdometerMeasure
}

function validateVehicle(input: VehicleInput) {
  if (!input.brand.trim()) throw new InputError('brand', 'Elige la marca.')
  if (!input.model.trim()) throw new InputError('model', 'Elige o escribe el modelo.')
  const maxYear = new Date().getFullYear() + 1
  if (!Number.isInteger(input.year) || input.year < 1950 || input.year > maxYear) {
    throw new InputError('year', 'Elige el año.')
  }
}

export function sanitizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
}

export function useCreateVehicle() {
  return useGarageMutation(async (input: VehicleInput & { odometer: number | null }) => {
    validateVehicle(input)
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        user_id: userId,
        brand: input.brand.trim(),
        model: input.model.trim(),
        year: input.year,
        plate: trimmedOrNull(input.plate ? sanitizePlate(input.plate) : null),
        engine: trimmedOrNull(input.engine),
        trim_level: trimmedOrNull(input.trimLevel),
        color: input.color,
        odometer_measure: input.measure,
      })
      .select('id')
      .single()
    if (error) throw error

    if (input.odometer != null) {
      const { error: readingError } = await supabase.from('mileage_readings').insert({
        vehicle_id: data.id,
        reading: nonNegativeInt(input.odometer, 'odometer'),
        recorded_on: todayIso(),
      })
      if (readingError) throw readingError
    }

    refreshVehicleData(data.id, { lookup: true, render: true })
    return data.id
  })
}

export function useUpdateVehicle() {
  return useGarageMutation(
    async ({ vehicle, input }: { vehicle: VehicleView; input: VehicleInput }) => {
      validateVehicle(input)
      const next = {
        brand: input.brand.trim(),
        model: input.model.trim(),
        year: input.year,
        plate: trimmedOrNull(input.plate ? sanitizePlate(input.plate) : null),
        engine: trimmedOrNull(input.engine),
        trim_level: trimmedOrNull(input.trimLevel),
        color: input.color,
        odometer_measure: input.measure,
      }
      const { error } = await supabase.from('vehicles').update(next).eq('id', vehicle.id)
      if (error) throw error

      const identityChanged =
        next.brand !== vehicle.brand ||
        next.model !== vehicle.model ||
        next.year !== vehicle.year ||
        next.engine !== vehicle.engine
      const paintChanged = next.color !== vehicle.color
      refreshVehicleData(vehicle.id, {
        lookup: identityChanged,
        render: identityChanged || paintChanged,
      })
    },
  )
}

/** Withdrawn, not destroyed: Services and readings stay (CONTEXT.md). */
export function useWithdrawVehicle() {
  return useGarageMutation(async (vehicleId: string) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', vehicleId)
    if (error) throw error
  })
}

export function useRestoreVehicle() {
  return useGarageMutation(async (vehicleId: string) => {
    const { error } = await supabase.from('vehicles').update({ deleted_at: null }).eq('id', vehicleId)
    if (error) throw error
  })
}

/** Retries the schedule lookup and render (for example after keys are configured). */
export function useRefreshVehicleData() {
  return useGarageMutation(async (vehicleId: string) => {
    await Promise.allSettled([
      invokeFunction('vehicle-lookup', { vehicleId }),
      invokeFunction('vehicle-render', { vehicleId }),
    ])
  })
}

// ---------------------------------------------------------------------------
// Mileage
// ---------------------------------------------------------------------------

/** Standalone reading: dated today, strictly greater than the current odometer. */
export function useAddReading() {
  return useGarageMutation(
    async ({ vehicle, reading }: { vehicle: VehicleView; reading: number }) => {
      const value = nonNegativeInt(reading, 'reading')
      if (vehicle.odometer != null && value <= vehicle.odometer) {
        throw new InputError(
          'reading',
          `Debe ser mayor que el kilometraje actual (${vehicle.odometer.toLocaleString('es-SV')}). Si el actual está mal, corrígelo en el historial.`,
        )
      }
      const { error } = await supabase
        .from('mileage_readings')
        .insert({ vehicle_id: vehicle.id, reading: value, recorded_on: todayIso() })
      if (error) throw error
    },
  )
}

/** A wrong number is corrected, not deleted (CONTEXT.md). Any non-negative value. */
export function useCorrectReading() {
  return useGarageMutation(async ({ readingId, reading }: { readingId: string; reading: number }) => {
    const { error } = await supabase
      .from('mileage_readings')
      .update({ reading: nonNegativeInt(reading, 'reading') })
      .eq('id', readingId)
    if (error) throw error
  })
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export type ServiceItemInput = {
  taskCode: string | null
  name: string
  cost: number | null
  partBrand?: string | null
  partNumber?: string | null
}

export type ServiceInput = {
  vehicleId: string
  serviceId?: string
  readingId?: string
  type: 'maintenance' | 'repair'
  performedOn: string
  reading: number
  shop: string | null
  notes: string | null
  totalCost: number | null
  items: ServiceItemInput[]
  invoice?: File | null
  appointmentId?: string | null
}

function validateService(input: ServiceInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.performedOn)) {
    throw new InputError('performedOn', 'Elige la fecha.')
  }
  if (input.performedOn > todayIso()) {
    throw new InputError('performedOn', 'Un Servicio ya realizado no puede tener fecha futura. Para una fecha futura crea una Cita.')
  }
  nonNegativeInt(input.reading, 'reading')
  if (input.items.length === 0) {
    throw new InputError('items', 'Agrega al menos un trabajo o pieza.')
  }
  if (input.totalCost != null && (!Number.isFinite(input.totalCost) || input.totalCost < 0)) {
    throw new InputError('totalCost', 'Escribe un costo válido.')
  }
}

async function uploadInvoice(userId: string, serviceId: string, file: File) {
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${userId}/${serviceId}/factura-${Date.now()}.${ext || 'jpg'}`
  const { error } = await supabase.storage
    .from('service-invoices')
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw error
  return path
}

/**
 * Records a Service with its Mileage reading (the reading's date is written
 * the same as the Service date) and its Service items. Editing replaces the
 * items and updates the reading's number.
 */
export function useSaveService() {
  return useGarageMutation(async (input: ServiceInput) => {
    validateService(input)
    const userId = await currentUserId()
    const reading = Math.round(input.reading)
    let serviceId = input.serviceId

    if (!serviceId) {
      const { data: r, error: rErr } = await supabase
        .from('mileage_readings')
        .insert({ vehicle_id: input.vehicleId, reading, recorded_on: input.performedOn })
        .select('id')
        .single()
      if (rErr) throw rErr
      const { data: s, error: sErr } = await supabase
        .from('services')
        .insert({
          vehicle_id: input.vehicleId,
          mileage_reading_id: r.id,
          type: input.type,
          performed_on: input.performedOn,
          shop: trimmedOrNull(input.shop),
          notes: trimmedOrNull(input.notes),
          total_cost: input.totalCost,
        })
        .select('id')
        .single()
      if (sErr) throw sErr
      serviceId = s.id
    } else {
      if (input.readingId) {
        const { error } = await supabase
          .from('mileage_readings')
          .update({ reading })
          .eq('id', input.readingId)
        if (error) throw error
      }
      const { error } = await supabase
        .from('services')
        .update({
          type: input.type,
          performed_on: input.performedOn,
          shop: trimmedOrNull(input.shop),
          notes: trimmedOrNull(input.notes),
          total_cost: input.totalCost,
        })
        .eq('id', serviceId)
      if (error) throw error
      const { error: delErr } = await supabase.from('service_items').delete().eq('service_id', serviceId)
      if (delErr) throw delErr
    }

    const { error: itemsErr } = await supabase.from('service_items').insert(
      input.items.map((i) => ({
        service_id: serviceId!,
        task_code: i.taskCode,
        name: i.name.trim(),
        cost: i.cost,
        part_brand: trimmedOrNull(i.partBrand),
        part_number: trimmedOrNull(i.partNumber),
      })),
    )
    if (itemsErr) throw itemsErr

    if (input.invoice) {
      const path = await uploadInvoice(userId, serviceId!, input.invoice)
      const { error } = await supabase.from('services').update({ invoice_path: path }).eq('id', serviceId!)
      if (error) throw error
    }

    // A recorded Service answers any "No sé" and clears a snooze for its tasks.
    const codes = input.items.map((i) => i.taskCode).filter((c): c is string => Boolean(c))
    if (codes.length > 0) {
      await supabase
        .from('reminder_states')
        .update({ last_unknown: false, snoozed_until: null })
        .eq('vehicle_id', input.vehicleId)
        .in('task_code', codes)
    }

    if (input.appointmentId) {
      const { error } = await supabase
        .from('appointments')
        .update({ service_id: serviceId! })
        .eq('id', input.appointmentId)
      if (error) throw error
    }
    return serviceId!
  })
}

/** Withdraws a Service; its Mileage reading stays (CONTEXT.md). */
export function useWithdrawService() {
  return useGarageMutation(async (serviceId: string) => {
    const { error } = await supabase
      .from('services')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', serviceId)
    if (error) throw error
  })
}

export async function invoiceUrl(path: string) {
  const { data, error } = await supabase.storage.from('service-invoices').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export type AppointmentInput = {
  id?: string
  vehicleId: string
  scheduledOn: string
  shop: string | null
  notes: string | null
  taskCodes: string[]
}

export function useSaveAppointment() {
  return useGarageMutation(async (input: AppointmentInput) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledOn)) {
      throw new InputError('scheduledOn', 'Elige la fecha.')
    }
    if (!input.id && input.scheduledOn < todayIso()) {
      throw new InputError('scheduledOn', 'Una Cita es para hoy o una fecha futura. Si ya lo hiciste, registra un Servicio.')
    }
    const row = {
      vehicle_id: input.vehicleId,
      scheduled_on: input.scheduledOn,
      shop: trimmedOrNull(input.shop),
      notes: trimmedOrNull(input.notes),
      task_codes: input.taskCodes,
    }
    const { error } = input.id
      ? await supabase.from('appointments').update(row).eq('id', input.id)
      : await supabase.from('appointments').insert(row)
    if (error) throw error
  })
}

export function useCancelAppointment() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ canceled_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  })
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

export type RoutineInput = {
  id?: string
  vehicleId: string
  name: string
  roundTripDistance: number
  daysPerWeek: number
}

export function useSaveRoutine() {
  return useGarageMutation(async (input: RoutineInput) => {
    if (!input.name.trim()) throw new InputError('name', 'Ponle un nombre, por ejemplo “Trabajo”.')
    if (!(input.roundTripDistance > 0) || input.roundTripDistance > 2000) {
      throw new InputError('roundTripDistance', 'Escribe la distancia de ida y vuelta.')
    }
    if (input.daysPerWeek < 1 || input.daysPerWeek > 7) {
      throw new InputError('daysPerWeek', 'Elige cuántos días a la semana.')
    }
    const row = {
      vehicle_id: input.vehicleId,
      name: input.name.trim(),
      round_trip_distance: Math.round(input.roundTripDistance * 10) / 10,
      days_per_week: input.daysPerWeek,
    }
    const { error } = input.id
      ? await supabase.from('routines').update(row).eq('id', input.id)
      : await supabase.from('routines').insert(row)
    if (error) throw error
  })
}

export function useDeleteRoutine() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) throw error
  })
}

// ---------------------------------------------------------------------------
// Hand-written Reminders and derived Reminder states
// ---------------------------------------------------------------------------

export function useSaveManualReminder() {
  return useGarageMutation(
    async (input: { id?: string; vehicleId: string; title: string; dueOn: string; notes: string | null }) => {
      if (!input.title.trim()) throw new InputError('title', 'Escribe qué quieres recordar.')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn)) throw new InputError('dueOn', 'Elige la fecha.')
      const row = {
        vehicle_id: input.vehicleId,
        title: input.title.trim(),
        due_on: input.dueOn,
        notes: trimmedOrNull(input.notes),
      }
      const { error } = input.id
        ? await supabase.from('reminders').update(row).eq('id', input.id)
        : await supabase.from('reminders').insert(row)
      if (error) throw error
    },
  )
}

export function useCompleteManualReminder() {
  return useGarageMutation(async ({ id, done }: { id: string; done: boolean }) => {
    const { error } = await supabase
      .from('reminders')
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) throw error
  })
}

export function useDeleteManualReminder() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  })
}

type StatePatch = {
  last_unknown?: boolean
  snoozed_until?: string | null
  remembered_on?: string | null
  remembered_reading?: number | null
}

async function upsertState(vehicleId: string, taskCode: string, patch: StatePatch) {
  const { error } = await supabase
    .from('reminder_states')
    .upsert({ vehicle_id: vehicleId, task_code: taskCode, ...patch }, { onConflict: 'vehicle_id,task_code' })
  if (error) throw error
}

export function useReminderState() {
  return useGarageMutation(
    async ({ vehicleId, taskCode, patch }: { vehicleId: string; taskCode: string; patch: StatePatch }) =>
      upsertState(vehicleId, taskCode, patch),
  )
}

/** Remembered last time for several tasks at once (Onboarding, "¿Cuándo fue?"). */
export async function rememberTasks(
  vehicleId: string,
  answers: Array<{ taskCode: string; rememberedOn: string | null; reading: number | null; unknown: boolean }>,
) {
  if (answers.length === 0) return
  const { error } = await supabase.from('reminder_states').upsert(
    answers.map((a) => ({
      vehicle_id: vehicleId,
      task_code: a.taskCode,
      last_unknown: a.unknown,
      remembered_on: a.unknown ? null : a.rememberedOn,
      remembered_reading: a.unknown ? null : a.reading,
    })),
    { onConflict: 'vehicle_id,task_code' },
  )
  if (error) throw error
}
