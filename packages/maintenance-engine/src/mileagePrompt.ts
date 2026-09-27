import { daysBetween } from './days.ts'
import {
  currentOdometer,
  measureToKm,
  type MileageReading,
  type OdometerMeasure,
  type UsageRate,
} from './odometer.ts'

/** Ask for a new Mileage reading this often by default. */
export const DEFAULT_PROMPT_DAYS = 14
/** Heavy use (about 18,000 km a year) is asked weekly. */
export const HEAVY_KM_PER_DAY = 50
export const HEAVY_PROMPT_DAYS = 7

export type MileagePrompt =
  | { due: false; nextOn: string | null }
  | {
      due: true
      reason: 'no_readings' | 'stale' | 'no_usage'
      daysSinceLast: number | null
    }

/**
 * Whether Seibi should ask the user to update the odometer. The cadence
 * follows the Usage rate; with no rate at all, Seibi asks for Routines or a
 * second reading.
 */
export function mileagePrompt(
  readings: readonly MileageReading[],
  usage: UsageRate | null,
  measure: OdometerMeasure,
  today: string,
): MileagePrompt {
  const current = currentOdometer(readings)
  if (!current) return { due: true, reason: 'no_readings', daysSinceLast: null }

  const daysSinceLast = daysBetween(current.recordedOn, today)
  const cadence =
    usage && measureToKm(usage.perDay, measure) >= HEAVY_KM_PER_DAY
      ? HEAVY_PROMPT_DAYS
      : DEFAULT_PROMPT_DAYS

  if (daysSinceLast >= cadence) return { due: true, reason: 'stale', daysSinceLast }
  if (!usage && daysSinceLast >= HEAVY_PROMPT_DAYS) {
    return { due: true, reason: 'no_usage', daysSinceLast }
  }
  const next = new Date(Date.parse(`${current.recordedOn}T00:00:00Z`) + cadence * 86_400_000)
  return { due: false, nextOn: next.toISOString().slice(0, 10) }
}
