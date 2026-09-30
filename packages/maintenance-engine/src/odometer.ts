import { daysBetween } from './days.ts'

export type OdometerMeasure = 'km' | 'mi'

export type MileageReading = {
  reading: number
  recordedOn: string
}

export type Routine = {
  /** Round trip, in the Vehicle's Odometer measure. */
  roundTripDistance: number
  daysPerWeek: number
}

export type UsageRate = {
  /** Distance per day in the Vehicle's Odometer measure. */
  perDay: number
  source: 'readings' | 'routines'
}

export const KM_PER_MILE = 1.609344

export function kmToMeasure(km: number, measure: OdometerMeasure): number {
  return measure === 'km' ? km : km / KM_PER_MILE
}

export function measureToKm(distance: number, measure: OdometerMeasure): number {
  return measure === 'km' ? distance : distance * KM_PER_MILE
}

/**
 * The reading for the latest calendar date; if several share that date, the
 * highest number (ADR-0005).
 */
export function currentOdometer(readings: readonly MileageReading[]): MileageReading | null {
  let best: MileageReading | null = null
  for (const r of readings) {
    if (
      !best ||
      r.recordedOn > best.recordedOn ||
      (r.recordedOn === best.recordedOn && r.reading > best.reading)
    ) {
      best = r
    }
  }
  return best
}

/** Readings older than this do not describe current use. */
export const USAGE_WINDOW_DAYS = 180
/** Two readings closer than this are too noisy to give a rate. */
export const MIN_USAGE_SPAN_DAYS = 7

/**
 * Usage rate from recent Mileage readings (at least two, a week apart);
 * otherwise from Routines; otherwise null and Seibi asks.
 */
export function usageRate(
  readings: readonly MileageReading[],
  routines: readonly Routine[],
  today: string,
): UsageRate | null {
  const perDate = new Map<string, number>()
  for (const r of readings) {
    const age = daysBetween(r.recordedOn, today)
    if (age < 0 || age > USAGE_WINDOW_DAYS) continue
    perDate.set(r.recordedOn, Math.max(perDate.get(r.recordedOn) ?? 0, r.reading))
  }
  const points = [...perDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
  if (points.length >= 2) {
    const [firstDay, firstReading] = points[0]
    const [lastDay, lastReading] = points[points.length - 1]
    const span = daysBetween(firstDay, lastDay)
    const distance = lastReading - firstReading
    if (span >= MIN_USAGE_SPAN_DAYS && distance > 0) {
      return { perDay: distance / span, source: 'readings' }
    }
  }

  const weekly = routines.reduce(
    (sum, r) => sum + Math.max(0, r.roundTripDistance) * clampDays(r.daysPerWeek),
    0,
  )
  if (weekly > 0) return { perDay: weekly / 7, source: 'routines' }
  return null
}

function clampDays(days: number) {
  return Math.min(7, Math.max(0, Math.round(days)))
}

/**
 * Odometer projected to today from the current odometer and Usage rate.
 * Never below the current odometer.
 */
export function projectedOdometer(
  current: MileageReading | null,
  usage: UsageRate | null,
  today: string,
): number | null {
  if (!current) return null
  if (!usage) return current.reading
  const elapsed = Math.max(0, daysBetween(current.recordedOn, today))
  return current.reading + usage.perDay * elapsed
}

/** Heavy daily use (about 29,000 km a year) calls for the severe schedule. */
export const SEVERE_KM_PER_DAY = 80
/** Manuals count trips under about 8 km (5 mi) one way as short trips. */
export const SHORT_TRIP_KM = 8

/**
 * Whether the Vehicle's use matches the "severe" conditions that manuals
 * describe in terms of distance: heavy daily use, or mostly short trips.
 */
export function isSevereUse(
  usage: UsageRate | null,
  routines: readonly Routine[],
  measure: OdometerMeasure,
): boolean {
  if (usage && measureToKm(usage.perDay, measure) >= SEVERE_KM_PER_DAY) return true
  const trips = routines.filter((r) => r.roundTripDistance > 0 && r.daysPerWeek > 0)
  if (trips.length === 0) return false
  const totalDays = trips.reduce((sum, r) => sum + clampDays(r.daysPerWeek), 0)
  const weightedOneWay =
    trips.reduce((sum, r) => sum + (r.roundTripDistance / 2) * clampDays(r.daysPerWeek), 0) /
    totalDays
  return measureToKm(weightedOneWay, measure) < SHORT_TRIP_KM
}
