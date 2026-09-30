import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer'

const LOCALE = 'es-SV'

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usdCents = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatNumber(value: number) {
  return integer.format(value)
}

export function measureLabel(measure: OdometerMeasure) {
  return measure === 'mi' ? 'mi' : 'km'
}

export function formatDistance(value: number, measure: OdometerMeasure) {
  return `${integer.format(Math.round(value))} ${measureLabel(measure)}`
}

export function formatUsd(value: number, cents = false) {
  return (cents ? usdCents : usd).format(value)
}

export function formatUsdRange(range: { min: number; max: number } | null | undefined) {
  if (!range) return null
  if (Math.round(range.min) === Math.round(range.max)) return formatUsd(range.min)
  return `${formatUsd(range.min)} – ${formatUsd(range.max)}`
}

/** Local calendar day as YYYY-MM-DD. */
export function todayIso(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayToDate(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDay(day: string, style: 'short' | 'long' = 'short') {
  const date = dayToDate(day)
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

export function formatMonth(day: string) {
  const date = dayToDate(day)
  const text = date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "hoy", "mañana", "en 5 días", "hace 3 días", "en 2 meses". */
export function relativeDays(days: number) {
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  if (days === -1) return 'ayer'
  const abs = Math.abs(days)
  let text: string
  if (abs < 45) text = `${abs} días`
  else if (abs < 330) text = `${Math.round(abs / 30)} meses`
  else {
    const years = Math.round(abs / 365)
    text = years === 1 ? '1 año' : `${years} años`
  }
  return days > 0 ? `en ${text}` : `hace ${text}`
}

export function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function vehicleName(v: { brand: string; model: string }) {
  return `${v.brand} ${v.model}`
}
