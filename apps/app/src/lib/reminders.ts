import {
  formatVehicleLabel,
  oilKmRemaining,
  OIL_INTERVAL_KM,
  vehicleNeedsService,
  type VehicleProfile,
} from './vehicleProfile'
import { loggedPartResetsForVehicle, type PartReset } from './services'

export type ReminderTone = 'danger' | 'warn' | 'ok'

export type WearLevel = 'optimal' | 'medium' | 'high' | 'replace'

export type ReminderItem = {
  id: string
  name: string
  meta: string
  due: string
  tone: ReminderTone
  remainingPct: number
  remainingKm?: number
}

const TONE_ORDER: Record<ReminderTone, number> = {
  danger: 0,
  warn: 1,
  ok: 2,
}

export const WEAR_COLOR: Record<WearLevel, string> = {
  optimal: '#3ecf6a',
  medium: '#f5c542',
  high: '#ff8a3d',
  replace: '#ff3b30',
}

export function wearLevelFromPct(pct: number): WearLevel {
  const value = Math.round(Math.min(100, Math.max(0, pct)))
  if (value >= 70) return 'optimal'
  if (value >= 40) return 'medium'
  if (value >= 15) return 'high'
  return 'replace'
}

const KM_INTERVAL = {
  oil: OIL_INTERVAL_KM,
  tires: 10_000,
  'air-filter': 8_000,
  spark: 20_000,
} as const

const DAY_INTERVAL = {
  brakes: 365,
  alignment: 365,
  coolant: 730,
  battery: 730,
} as const

function remainingPct(left: number, interval: number) {
  if (interval <= 0 || left <= 0) return 0
  return Math.min(100, Math.round((left / interval) * 100))
}

function daysSince(at: number) {
  return Math.max(0, Math.floor((Date.now() - at) / 86_400_000))
}

function kmLeftAfterReset(
  fallback: number,
  interval: number,
  currentKm: number,
  reset: PartReset | undefined,
) {
  if (!reset) return fallback
  if (reset.km == null) return interval
  return Math.max(0, interval - Math.max(0, currentKm - reset.km))
}

function daysLeftAfterReset(
  fallback: number,
  interval: number,
  reset: PartReset | undefined,
) {
  if (!reset) return fallback
  return Math.max(0, interval - daysSince(reset.at))
}

function oilTone(needsService: boolean, kmLeft: number): ReminderTone {
  if (needsService || kmLeft <= 0) return 'danger'
  if (kmLeft <= 1_500) return 'warn'
  return 'ok'
}

function kmTone(kmLeft: number): ReminderTone {
  if (kmLeft <= 0) return 'danger'
  if (kmLeft <= 1_500) return 'warn'
  return 'ok'
}

function timeTone(daysLeft: number): ReminderTone {
  if (daysLeft <= 0) return 'danger'
  if (daysLeft <= 7) return 'danger'
  if (daysLeft <= 30) return 'warn'
  return 'ok'
}

function formatKmLeft(km: number) {
  return km.toLocaleString('es-MX')
}

function kmItem(
  id: string,
  name: string,
  meta: string,
  left: number,
  interval: number,
  overdue?: boolean,
): ReminderItem {
  const remainingKm = overdue ? 0 : left
  return {
    id,
    name,
    meta,
    due: remainingKm <= 0 ? `Vencido · haz ${name.toLowerCase()}` : `Quedan ${formatKmLeft(remainingKm)} km`,
    tone: oilTone(Boolean(overdue), remainingKm),
    remainingPct: overdue ? 0 : remainingPct(remainingKm, interval),
    remainingKm,
  }
}

function dayItem(
  id: string,
  name: string,
  meta: string,
  left: number,
): ReminderItem {
  return {
    id,
    name,
    meta,
    due: left <= 0 ? `Vencido · haz ${name.toLowerCase()}` : `En ${left} días`,
    tone: timeTone(left),
    remainingPct: remainingPct(left, DAY_INTERVAL[id as keyof typeof DAY_INTERVAL] ?? 365),
  }
}

/** Most urgent upcoming maintenance for the active Vehículo (preview strip). */
export function upcomingMaintenanceForVehicle(
  vehicle: VehicleProfile | null,
  limit = 2,
): ReminderItem[] {
  const items = remindersForVehicle(vehicle)
  const soon = items.filter((item) => item.tone === 'danger' || item.tone === 'warn')
  const pool = soon.length > 0 ? soon : items
  return pool.slice(0, limit)
}

/** Preview Recordatorios for the active Vehículo until real data exists. */
export function remindersForVehicle(vehicle: VehicleProfile | null): ReminderItem[] {
  if (!vehicle) {
    return [
      kmItem('oil', 'Cambio de aceite', 'Cada 5,000 km', 320, KM_INTERVAL.oil),
      dayItem('brakes', 'Revisión de frenos', 'Cada 12 meses', 18),
      kmItem('tires', 'Rotación de llantas', 'Cada 10,000 km', 4_200, KM_INTERVAL.tires),
    ]
  }

  const km = Number(vehicle.mileage.replace(/,/g, '')) || 0
  const resets = loggedPartResetsForVehicle(vehicle.id)
  const needsService = vehicleNeedsService(vehicle) && !resets.oil
  const oilLeft = kmLeftAfterReset(
    oilKmRemaining(vehicle.mileage),
    KM_INTERVAL.oil,
    km,
    resets.oil,
  )
  const brakeDays = daysLeftAfterReset(12 + (km % 40), DAY_INTERVAL.brakes, resets.brakes)
  const tireLeft = kmLeftAfterReset(10_000 - (km % 10_000), KM_INTERVAL.tires, km, resets.tires)
  const alignDays = daysLeftAfterReset(40 + (km % 50), DAY_INTERVAL.alignment, resets.alignment)
  const filterLeft = kmLeftAfterReset(
    8_000 - (km % 8_000),
    KM_INTERVAL['air-filter'],
    km,
    resets['air-filter'],
  )
  const coolantDays = daysLeftAfterReset(90 + (km % 60), DAY_INTERVAL.coolant, resets.coolant)
  const sparkLeft = kmLeftAfterReset(20_000 - (km % 20_000), KM_INTERVAL.spark, km, resets.spark)
  const batteryDays = daysLeftAfterReset(120 + (km % 80), DAY_INTERVAL.battery, resets.battery)

  const items: ReminderItem[] = [
    kmItem(
      'oil',
      'Cambio de aceite',
      'Cada 5,000 km',
      oilLeft,
      KM_INTERVAL.oil,
      needsService || oilLeft <= 0,
    ),
    dayItem('brakes', 'Revisión de frenos', 'Cada 12 meses', brakeDays),
    {
      ...kmItem('tires', 'Rotación de llantas', 'Cada 10,000 km', tireLeft, KM_INTERVAL.tires),
      tone: kmTone(tireLeft),
    },
    dayItem('alignment', 'Alineación y balanceo', 'Cada 12 meses', alignDays),
    {
      ...kmItem('air-filter', 'Filtro de aire', 'Cada 15,000 km', filterLeft, KM_INTERVAL['air-filter']),
      tone: kmTone(filterLeft),
    },
    dayItem('coolant', 'Refrigerante', 'Cada 24 meses', coolantDays),
    {
      ...kmItem('spark', 'Cambio de bujías', 'Cada 40,000 km', sparkLeft, KM_INTERVAL.spark),
      tone: kmTone(sparkLeft),
    },
    dayItem('battery', 'Revisión de batería', 'Cada 24 meses', batteryDays),
  ]

  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}

export type ServiceUrgency = 'ok' | 'warn' | 'danger'

/**
 * Selector status from that vehicle's mantenimientos.
 * Listo = apto para circular. Requiere servicio = hay algo vencido o crítico.
 */
export function vehicleServiceHealth(vehicle: VehicleProfile): {
  needsService: boolean
  urgency: ServiceUrgency
} {
  const blocking = remindersForVehicle(vehicle).filter((item) => item.tone === 'danger')
  if (blocking.length === 0) {
    return { needsService: false, urgency: 'ok' }
  }
  const worstPct = blocking.reduce((min, item) => Math.min(min, item.remainingPct), 100)
  return {
    needsService: true,
    urgency: worstPct <= 0 ? 'danger' : 'warn',
  }
}

export function reminderVehicleLabel(vehicle: VehicleProfile | null) {
  return vehicle ? formatVehicleLabel(vehicle) : null
}

export function batteryLifeForVehicle(vehicle: VehicleProfile | null) {
  if (!vehicle) return null
  const km = Number(vehicle.mileage.replace(/,/g, '')) || 0
  const resets = loggedPartResetsForVehicle(vehicle.id)
  if (resets.battery) {
    const daysLeft = daysLeftAfterReset(DAY_INTERVAL.battery, DAY_INTERVAL.battery, resets.battery)
    return { daysLeft, pct: remainingPct(daysLeft, DAY_INTERVAL.battery) }
  }
  const daysLeft = 120 + (km % 80)
  const pct = Math.min(96, Math.max(12, Math.round((daysLeft / 200) * 100)))
  return { daysLeft, pct }
}
