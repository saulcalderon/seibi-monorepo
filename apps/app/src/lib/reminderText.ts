import type { Reminder } from '@seibi/maintenance-engine/reminders'
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer'
import { daysBetween } from '@seibi/maintenance-engine/days'
import { formatNumber, relativeDays, todayIso } from './format'

/** One-line status for a derived Reminder, in plain Spanish. */
export function reminderDueText(r: Reminder, measure: OdometerMeasure): string {
  if (r.status === 'unknown') {
    return r.unknownReason === 'dont_know'
      ? 'No sabemos cuándo fue. Conviene revisarlo.'
      : '¿Cuándo fue la última vez?'
  }
  const km = r.remainingDistance
  const days = r.remainingDays
  if (r.status === 'overdue') {
    if (km != null && km <= 0) return `Vencido por ${formatNumber(Math.abs(km))} ${measure}`
    if (r.dueOn) {
      const ago = daysBetween(r.dueOn, todayIso())
      return ago <= 0 ? 'Vence hoy' : `Venció ${relativeDays(-ago)}`
    }
    return 'Vencido'
  }
  const parts: string[] = []
  if (km != null) parts.push(`En ${formatNumber(Math.max(0, km))} ${measure}`)
  if (days != null) parts.push(km != null ? `aprox. ${relativeDays(days)}` : relativeDays(days).replace(/^en /, 'En '))
  return parts.join(' · ') || 'Al día'
}

export function intervalText(r: Reminder, measure: OdometerMeasure): string | null {
  const parts: string[] = []
  if (r.interval.distance) parts.push(`${formatNumber(r.interval.distance)} ${measure}`)
  if (r.interval.months) parts.push(r.interval.months === 1 ? '1 mes' : `${r.interval.months} meses`)
  if (parts.length === 0) return null
  return `Cada ${parts.join(' o ')}${parts.length > 1 ? ', lo que llegue primero' : ''}`
}
