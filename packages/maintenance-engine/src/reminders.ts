import { addDays, addMonths, daysBetween, minDay } from './days.ts'
import {
  currentOdometer,
  isSevereUse,
  kmToMeasure,
  projectedOdometer,
  usageRate,
  type MileageReading,
  type OdometerMeasure,
  type Routine,
  type UsageRate,
} from './odometer.ts'

/** One Maintenance task's interval, in km and months (either may be null). */
export type TaskInterval = {
  taskCode: string
  distanceKm: number | null
  months: number | null
  severeDistanceKm?: number | null
  severeMonths?: number | null
  /** `model` when a cited Maintenance schedule sets it, `general` otherwise (ADR-0007). */
  source?: 'model' | 'general'
}

/** A Service item with a Maintenance task, flattened with its Service. */
export type TaskEvent = {
  taskCode: string
  performedOn: string
  /** The Service's Mileage reading. */
  reading: number | null
}

export type ReminderState = {
  taskCode: string
  lastUnknown: boolean
  snoozedUntil: string | null
  /** Remembered last time, used only when no Service item exists for the task. */
  rememberedOn?: string | null
  rememberedReading?: number | null
}

export type ReminderStatus = 'overdue' | 'soon' | 'unknown' | 'ok'

export type Reminder = {
  taskCode: string
  status: ReminderStatus
  /**
   * For `unknown`: `ask` when Seibi has never asked about the last Service,
   * `dont_know` when the user said they do not know.
   */
  unknownReason?: 'ask' | 'dont_know'
  /** Interval actually applied, in the Vehicle's measure and months. */
  interval: { distance: number | null; months: number | null }
  source: 'model' | 'general'
  severe: boolean
  lastDone: { performedOn: string; reading: number | null; remembered: boolean } | null
  /** Odometer at which the task is due, in the Vehicle's measure. */
  dueReading: number | null
  /** Distance left (negative when overdue), in the Vehicle's measure. */
  remainingDistance: number | null
  /** Calendar day the time interval runs out. */
  dueOn: string | null
  /** Best guess of the day it comes due by distance or time, whichever first. */
  expectedOn: string | null
  remainingDays: number | null
  /** Share of the interval used, 0..1+ (above 1 when overdue). */
  used: number
  snoozed: boolean
}

export type ComputeInput = {
  measure: OdometerMeasure
  schedule: readonly TaskInterval[]
  readings: readonly MileageReading[]
  events: readonly TaskEvent[]
  routines: readonly Routine[]
  states?: readonly ReminderState[]
  today: string
}

export type ComputeResult = {
  reminders: Reminder[]
  usage: UsageRate | null
  severe: boolean
  odometer: number | null
}

/** Within this share of the distance interval, a task is `soon`. */
export const SOON_SHARE = 0.1
/** Within this many days, a task is `soon`. */
export const SOON_DAYS = 30

const STATUS_RANK: Record<ReminderStatus, number> = {
  overdue: 0,
  soon: 1,
  unknown: 2,
  ok: 3,
}

function lastEvent(events: readonly TaskEvent[], taskCode: string): TaskEvent | null {
  let best: TaskEvent | null = null
  for (const e of events) {
    if (e.taskCode !== taskCode) continue
    if (
      !best ||
      e.performedOn > best.performedOn ||
      (e.performedOn === best.performedOn && (e.reading ?? -1) > (best.reading ?? -1))
    ) {
      best = e
    }
  }
  return best
}

/** Derived Reminders for one Vehicle, most urgent first (ADR-0010). */
export function computeReminders(input: ComputeInput): ComputeResult {
  const { measure, schedule, readings, events, routines, today } = input
  const states = new Map((input.states ?? []).map((s) => [s.taskCode, s]))
  const usage = usageRate(readings, routines, today)
  const severe = isSevereUse(usage, routines, measure)
  const odometer = projectedOdometer(currentOdometer(readings), usage, today)

  const reminders: Reminder[] = []
  for (const item of schedule) {
    const useSevere =
      severe && (item.severeDistanceKm != null || item.severeMonths != null)
    const distanceKm = useSevere ? (item.severeDistanceKm ?? item.distanceKm) : item.distanceKm
    const months = useSevere ? (item.severeMonths ?? item.months) : item.months
    if (distanceKm == null && months == null) continue

    const interval = {
      distance: distanceKm == null ? null : Math.round(kmToMeasure(distanceKm, measure)),
      months,
    }
    const state = states.get(item.taskCode)
    const snoozed = !!state?.snoozedUntil && state.snoozedUntil >= today
    const recorded = lastEvent(events, item.taskCode)
    const last: (TaskEvent & { remembered: boolean }) | null = recorded
      ? { ...recorded, remembered: false }
      : state?.rememberedOn
        ? {
            taskCode: item.taskCode,
            performedOn: state.rememberedOn,
            reading: state.rememberedReading ?? null,
            remembered: true,
          }
        : null

    if (!last) {
      reminders.push({
        taskCode: item.taskCode,
        status: 'unknown',
        unknownReason: state?.lastUnknown ? 'dont_know' : 'ask',
        interval,
        source: item.source ?? 'general',
        severe: useSevere,
        lastDone: null,
        dueReading: null,
        remainingDistance: null,
        dueOn: null,
        expectedOn: null,
        remainingDays: null,
        used: 0,
        snoozed,
      })
      continue
    }

    let dueReading: number | null = null
    let remainingDistance: number | null = null
    let distanceDueOn: string | null = null
    let usedDistance = 0
    if (interval.distance != null && last.reading != null && odometer != null) {
      dueReading = last.reading + interval.distance
      remainingDistance = dueReading - odometer
      usedDistance = (odometer - last.reading) / interval.distance
      if (usage && usage.perDay > 0) {
        distanceDueOn = addDays(today, Math.max(0, remainingDistance) / usage.perDay)
      }
    }

    let dueOn: string | null = null
    let usedTime = 0
    if (months != null) {
      dueOn = addMonths(last.performedOn, months)
      const span = Math.max(1, daysBetween(last.performedOn, dueOn))
      usedTime = daysBetween(last.performedOn, today) / span
    }

    const expectedOn =
      dueOn && distanceDueOn ? minDay(dueOn, distanceDueOn) : (dueOn ?? distanceDueOn)
    const remainingDays = expectedOn ? daysBetween(today, expectedOn) : null

    let status: ReminderStatus = 'ok'
    const distanceOverdue = remainingDistance != null && remainingDistance <= 0
    const timeOverdue = dueOn != null && dueOn <= today
    if (distanceOverdue || timeOverdue) {
      status = 'overdue'
    } else if (
      (remainingDistance != null &&
        interval.distance != null &&
        remainingDistance <= interval.distance * SOON_SHARE) ||
      (remainingDays != null && remainingDays <= SOON_DAYS)
    ) {
      status = 'soon'
    }

    reminders.push({
      taskCode: item.taskCode,
      status,
      interval,
      source: item.source ?? 'general',
      severe: useSevere,
      lastDone: { performedOn: last.performedOn, reading: last.reading, remembered: last.remembered },
      dueReading,
      remainingDistance: remainingDistance == null ? null : Math.round(remainingDistance),
      dueOn,
      expectedOn,
      remainingDays,
      used: Math.max(0, usedDistance, usedTime),
      snoozed,
    })
  }

  reminders.sort(compareReminders)
  return { reminders, usage, severe, odometer: odometer == null ? null : Math.round(odometer) }
}

export function compareReminders(a: Reminder, b: Reminder): number {
  if (a.snoozed !== b.snoozed) return a.snoozed ? 1 : -1
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  if (rank !== 0) return rank
  if (a.expectedOn && b.expectedOn && a.expectedOn !== b.expectedOn) {
    return a.expectedOn < b.expectedOn ? -1 : 1
  }
  if (a.expectedOn && !b.expectedOn) return -1
  if (!a.expectedOn && b.expectedOn) return 1
  return b.used - a.used
}

export type VehicleHealth = ReminderStatus

/**
 * The worst status among the Reminders Seibi can date; snoozed ones count as
 * ok. Tasks with no known last Service do not make the Vehicle look worse:
 * a new Vehicle would otherwise read "unknown" until every task is filled
 * in. With nothing dated at all, the health is `unknown`.
 */
export function vehicleHealth(reminders: readonly Reminder[]): VehicleHealth {
  let worst: ReminderStatus = 'ok'
  let known = false
  for (const r of reminders) {
    if (r.status === 'unknown') continue
    known = true
    const status = r.snoozed && r.status !== 'overdue' ? 'ok' : r.status
    if (STATUS_RANK[status] < STATUS_RANK[worst]) worst = status
  }
  return known ? worst : 'unknown'
}

/** The next Reminder to act on: the first that is not snoozed and has a date. */
export function nextReminder(reminders: readonly Reminder[]): Reminder | null {
  return (
    reminders.find((r) => !r.snoozed && r.status !== 'unknown') ??
    reminders.find((r) => !r.snoozed) ??
    null
  )
}

/** Count of Reminders that need action (overdue or soon, not snoozed). */
export function pendingCount(reminders: readonly Reminder[]): number {
  return reminders.filter(
    (r) => !r.snoozed && (r.status === 'overdue' || r.status === 'soon'),
  ).length
}

export type GeneralTask = {
  code: string
  generalDistanceKm: number | null
  generalMonths: number | null
}

/**
 * The intervals a Vehicle runs on: its cited Maintenance schedule, plus the
 * general interval for any task the schedule does not cover. With no cited
 * schedule, the general schedule alone.
 */
export function effectiveSchedule(
  model: readonly TaskInterval[] | null,
  general: readonly GeneralTask[],
): TaskInterval[] {
  const out: TaskInterval[] = (model ?? []).map((i) => ({ ...i, source: 'model' as const }))
  const covered = new Set(out.map((i) => i.taskCode))
  for (const t of general) {
    if (covered.has(t.code)) continue
    if (t.generalDistanceKm == null && t.generalMonths == null) continue
    out.push({
      taskCode: t.code,
      distanceKm: t.generalDistanceKm,
      months: t.generalMonths,
      source: 'general',
    })
  }
  return out
}
