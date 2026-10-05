// The garage: every Vehicle the user owns with its readings, Services,
// Routines, Reminders, Appointments, schedule, and render, fetched in one
// request and turned into derived Reminders by the shared engine
// (ADR-0010). Every screen reads from this one query so they never disagree.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { currentOdometer, type OdometerMeasure, type UsageRate } from '@seibi/maintenance-engine/odometer'
import {
  computeReminders,
  effectiveSchedule,
  nextReminder,
  pendingCount,
  vehicleHealth,
  type Reminder,
  type TaskInterval,
  type VehicleHealth,
} from '@seibi/maintenance-engine/reminders'
import { mileagePrompt, type MileagePrompt } from '@seibi/maintenance-engine/mileage-prompt'
import { useAuthSession } from './authSession'
import { todayIso } from './format'
import { publicRenderUrl, supabase } from './supabase'
import { useTasks, type MaintenanceTask } from './tasks'

const WITHDRAWN_KEEP_MS = 30 * 86_400_000

export function withdrawnStillRestorable(withdrawnAt: string) {
  return Date.now() - Date.parse(withdrawnAt) < WITHDRAWN_KEEP_MS
}

export function withdrawnDaysLeft(withdrawnAt: string) {
  const leftMs = WITHDRAWN_KEEP_MS - (Date.now() - Date.parse(withdrawnAt))
  return Math.max(1, Math.ceil(leftMs / 86_400_000))
}

export type BodyType =
  | 'sedan'
  | 'hatchback'
  | 'suv'
  | 'pickup'
  | 'van'
  | 'minivan'
  | 'coupe'
  | 'wagon'

export type ServiceItem = {
  id: string
  taskCode: string | null
  name: string
  cost: number | null
  partBrand: string | null
  partNumber: string | null
}

export type ServiceRecord = {
  id: string
  type: 'maintenance' | 'repair'
  performedOn: string
  shop: string | null
  notes: string | null
  totalCost: number | null
  invoicePath: string | null
  readingId: string
  reading: number | null
  items: ServiceItem[]
}

export type Appointment = {
  id: string
  scheduledOn: string
  shop: string | null
  notes: string | null
  taskCodes: string[]
  serviceId: string | null
  canceledAt: string | null
}

export type ManualReminder = {
  id: string
  title: string
  notes: string | null
  dueOn: string
  doneAt: string | null
}

export type RoutineRecord = {
  id: string
  name: string
  roundTripDistance: number
  daysPerWeek: number
}

export type ScheduleInfo = {
  id: string
  status: 'pending' | 'ready' | 'general' | 'failed'
  hasSevere: boolean
  summary: string | null
  sources: Array<{ title: string; url: string }>
  items: TaskInterval[]
}

export type RenderInfo = {
  status: 'pending' | 'poster_ready' | 'ready' | 'failed'
  posterUrl: string | null
  glbUrl: string | null
  /** Still waiting on fal: no poster yet, or a poster whose 3D step has not failed. */
  generating: boolean
}

export type VehicleRecord = {
  id: string
  brand: string
  model: string
  year: number
  plate: string | null
  engine: string | null
  trimLevel: string | null
  color: string | null
  bodyType: BodyType | null
  measure: OdometerMeasure
  withdrawnAt: string | null
  createdAt: string
  readings: Array<{ id: string; reading: number; recordedOn: string }>
  services: ServiceRecord[]
  routines: RoutineRecord[]
  states: Array<{
    taskCode: string
    lastUnknown: boolean
    snoozedUntil: string | null
    rememberedOn: string | null
    rememberedReading: number | null
  }>
  manualReminders: ManualReminder[]
  appointments: Appointment[]
  schedule: ScheduleInfo | null
  render: RenderInfo | null
}

export type VehicleView = VehicleRecord & {
  /** Current odometer (ADR-0005), not projected. */
  odometer: number | null
  odometerOn: string | null
  /** Odometer projected to today with the Usage rate. */
  projectedOdometer: number | null
  usage: UsageRate | null
  severe: boolean
  reminders: Reminder[]
  health: VehicleHealth
  next: Reminder | null
  pending: number
  mileagePrompt: MileagePrompt
  /** Manual Reminders not done, soonest first. */
  openManualReminders: ManualReminder[]
  /** Appointments from today on, not canceled or completed. */
  upcomingAppointments: Appointment[]
  /** Whether Reminders run on a cited schedule for this model. */
  scheduleSource: 'model' | 'general' | 'pending'
}

export function garageQueryKey(userId: string) {
  return ['garage', userId] as const
}

const SELECT = `
  id, brand, model, year, plate, engine, trim_level, color, body_type, odometer_measure,
  deleted_at, created_at,
  readings:mileage_readings(id, reading, recorded_on),
  services(
    id, type, performed_on, shop, notes, total_cost, invoice_path, deleted_at, mileage_reading_id,
    reading:mileage_readings(reading),
    items:service_items(id, task_code, name, cost, part_brand, part_number)
  ),
  routines(id, name, round_trip_distance, days_per_week),
  states:reminder_states(task_code, last_unknown, snoozed_until, remembered_on, remembered_reading),
  reminders(id, title, notes, due_on, done_at, deleted_at),
  appointments(id, scheduled_on, shop, notes, task_codes, service_id, canceled_at),
  schedule:maintenance_schedules(
    id, status, has_severe, summary, sources,
    items:maintenance_schedule_items(task_code, distance_km, months, severe_distance_km, severe_months)
  ),
  render:model_renders(status, poster_path, glb_path, error)
`

export async function fetchGarage(userId: string): Promise<VehicleRecord[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data ?? []).map((v) => {
    const schedule = v.schedule as unknown as {
      id: string
      status: ScheduleInfo['status']
      has_severe: boolean
      summary: string | null
      sources: Array<{ title: string; url: string }>
      items: Array<{
        task_code: string
        distance_km: number | null
        months: number | null
        severe_distance_km: number | null
        severe_months: number | null
      }>
    } | null
    const render = v.render as unknown as {
      status: RenderInfo['status']
      poster_path: string | null
      glb_path: string | null
      error: string | null
    } | null

    return {
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plate: v.plate,
      engine: v.engine,
      trimLevel: v.trim_level,
      color: v.color,
      bodyType: v.body_type,
      measure: v.odometer_measure,
      withdrawnAt: v.deleted_at,
      createdAt: v.created_at,
      readings: (v.readings ?? []).map((r) => ({
        id: r.id,
        reading: r.reading,
        recordedOn: r.recorded_on,
      })),
      services: (v.services ?? [])
        .filter((s) => !s.deleted_at)
        .map((s) => ({
          id: s.id,
          type: s.type,
          performedOn: s.performed_on,
          shop: s.shop,
          notes: s.notes,
          totalCost: s.total_cost,
          invoicePath: s.invoice_path,
          readingId: s.mileage_reading_id,
          reading: (s.reading as unknown as { reading: number } | null)?.reading ?? null,
          items: (s.items ?? []).map((i) => ({
            id: i.id,
            taskCode: i.task_code,
            name: i.name,
            cost: i.cost,
            partBrand: i.part_brand,
            partNumber: i.part_number,
          })),
        }))
        .sort((a, b) =>
          a.performedOn === b.performedOn
            ? (b.reading ?? 0) - (a.reading ?? 0)
            : a.performedOn < b.performedOn
              ? 1
              : -1,
        ),
      routines: (v.routines ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        roundTripDistance: Number(r.round_trip_distance),
        daysPerWeek: r.days_per_week,
      })),
      states: (v.states ?? []).map((s) => ({
        taskCode: s.task_code,
        lastUnknown: s.last_unknown,
        snoozedUntil: s.snoozed_until,
        rememberedOn: s.remembered_on,
        rememberedReading: s.remembered_reading,
      })),
      manualReminders: (v.reminders ?? [])
        .filter((r) => !r.deleted_at)
        .map((r) => ({
          id: r.id,
          title: r.title,
          notes: r.notes,
          dueOn: r.due_on,
          doneAt: r.done_at,
        })),
      appointments: (v.appointments ?? []).map((a) => ({
        id: a.id,
        scheduledOn: a.scheduled_on,
        shop: a.shop,
        notes: a.notes,
        taskCodes: a.task_codes ?? [],
        serviceId: a.service_id,
        canceledAt: a.canceled_at,
      })),
      schedule: schedule
        ? {
            id: schedule.id,
            status: schedule.status,
            hasSevere: schedule.has_severe,
            summary: schedule.summary,
            sources: Array.isArray(schedule.sources) ? schedule.sources : [],
            items: (schedule.items ?? []).map((i) => ({
              taskCode: i.task_code,
              distanceKm: i.distance_km,
              months: i.months,
              severeDistanceKm: i.severe_distance_km,
              severeMonths: i.severe_months,
            })),
          }
        : null,
      render: render
        ? {
            status: render.status,
            posterUrl: publicRenderUrl(render.poster_path),
            glbUrl: publicRenderUrl(render.glb_path),
            generating:
              render.status === 'pending' || (render.status === 'poster_ready' && !render.error),
          }
        : null,
    } satisfies VehicleRecord
  })
}

export function deriveVehicle(
  v: VehicleRecord,
  tasks: readonly MaintenanceTask[],
  today: string,
): VehicleView {
  const cited = v.schedule?.status === 'ready' ? v.schedule.items : null
  const schedule = effectiveSchedule(
    cited,
    tasks.map((t) => ({
      code: t.code,
      generalDistanceKm: t.generalDistanceKm,
      generalMonths: t.generalMonths,
    })),
  )
  const readings = v.readings.map((r) => ({ reading: r.reading, recordedOn: r.recordedOn }))
  const events = v.services.flatMap((s) =>
    s.items
      .filter((i) => i.taskCode)
      .map((i) => ({ taskCode: i.taskCode!, performedOn: s.performedOn, reading: s.reading })),
  )
  const result = computeReminders({
    measure: v.measure,
    schedule,
    readings,
    events,
    routines: v.routines,
    states: v.states,
    today,
  })
  const current = currentOdometer(readings)

  return {
    ...v,
    odometer: current?.reading ?? null,
    odometerOn: current?.recordedOn ?? null,
    projectedOdometer: result.odometer,
    usage: result.usage,
    severe: result.severe,
    reminders: result.reminders,
    health: vehicleHealth(result.reminders),
    next: nextReminder(result.reminders),
    pending: pendingCount(result.reminders),
    mileagePrompt: mileagePrompt(readings, result.usage, v.measure, today),
    openManualReminders: v.manualReminders
      .filter((r) => !r.doneAt)
      .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1)),
    upcomingAppointments: v.appointments
      .filter((a) => !a.canceledAt && !a.serviceId && a.scheduledOn >= today)
      .sort((a, b) => (a.scheduledOn < b.scheduledOn ? -1 : 1)),
    scheduleSource:
      v.schedule?.status === 'ready'
        ? 'model'
        : v.schedule?.status === 'pending'
          ? 'pending'
          : 'general',
  }
}

/** All the user's Vehicles, derived. Withdrawn ones are listed separately. */
export function useGarage() {
  const { user, status } = useAuthSession()
  const tasks = useTasks()
  const signedIn = status === 'signed_in' && Boolean(user?.id)

  const query = useQuery({
    queryKey: garageQueryKey(user?.id ?? 'signed-out'),
    queryFn: () => fetchGarage(user!.id),
    enabled: signedIn,
    refetchOnWindowFocus: true,
    // While a schedule or render is being generated, check back.
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (v) =>
          !v.withdrawnAt &&
          (v.schedule?.status === 'pending' || v.render?.generating),
      )
        ? 8_000
        : false,
  })

  const today = todayIso()
  const derived = useMemo(() => {
    if (!query.data || !tasks.data) return null
    const all = query.data.map((v) => deriveVehicle(v, tasks.data, today))
    return {
      vehicles: all.filter((v) => !v.withdrawnAt),
      withdrawn: all.filter((v) => v.withdrawnAt && withdrawnStillRestorable(v.withdrawnAt)),
    }
  }, [query.data, tasks.data, today])

  return {
    vehicles: derived?.vehicles ?? [],
    withdrawn: derived?.withdrawn ?? [],
    tasks: tasks.data ?? [],
    isLoading: signedIn && (query.isPending || tasks.isPending),
    isError: query.isError || tasks.isError,
    error: query.error ?? tasks.error,
    refetch: () => {
      void query.refetch()
      void tasks.refetch()
    },
    isFetching: query.isFetching,
  }
}

const HEALTH_RANK: Record<VehicleHealth, number> = { overdue: 0, soon: 1, unknown: 2, ok: 3 }

export function byUrgency(a: VehicleView, b: VehicleView) {
  const rank = HEALTH_RANK[a.health] - HEALTH_RANK[b.health]
  if (rank !== 0) return rank
  const ae = a.next?.expectedOn ?? '9999'
  const be = b.next?.expectedOn ?? '9999'
  return ae < be ? -1 : ae > be ? 1 : 0
}
