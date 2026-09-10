import {
  formatVehicleLabel,
  mileageToKm,
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
  remainingDays?: number
  lastServicedAt?: number
}

const TONE_ORDER: Record<ReminderTone, number> = {
  danger: 0,
  warn: 1,
  ok: 2,
}

const EXTRA_REMINDERS_KEY = 'seibi-extra-reminders'

type ExtraReminder = {
  id: string
  vehicleId: string
  name: string
  meta: string
  due: string
  createdAt: number
}

function readExtraReminders(): ExtraReminder[] {
  try {
    const raw = localStorage.getItem(EXTRA_REMINDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExtraReminder[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.vehicleId === 'string' &&
        typeof item.name === 'string',
    )
  } catch {
    return []
  }
}

function extraItemsForVehicle(vehicleId: string): ReminderItem[] {
  return readExtraReminders()
    .filter((item) => item.vehicleId === vehicleId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      meta: item.meta,
      due: item.due,
      tone: 'danger' as const,
      remainingPct: 0,
      remainingDays: 0,
    }))
}

export function addVehicleReminder(input: {
  vehicleId: string
  id: string
  name: string
  meta: string
  due: string
}) {
  const next = readExtraReminders().filter(
    (item) => !(item.vehicleId === input.vehicleId && item.id === input.id),
  )
  next.unshift({
    id: input.id,
    vehicleId: input.vehicleId,
    name: input.name,
    meta: input.meta,
    due: input.due,
    createdAt: Date.now(),
  })
  localStorage.setItem(EXTRA_REMINDERS_KEY, JSON.stringify(next))
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

const KM_PER_DAY = 40

function estimateDaysFromKm(kmLeft: number) {
  return Math.max(0, Math.round(kmLeft / KM_PER_DAY))
}

function lastAtFromDays(intervalDays: number, daysLeft: number) {
  return Date.now() - Math.max(0, intervalDays - daysLeft) * 86_400_000
}

function lastAtFromKm(intervalKm: number, kmLeft: number) {
  const elapsedKm = Math.max(0, intervalKm - kmLeft)
  return Date.now() - Math.round(elapsedKm / KM_PER_DAY) * 86_400_000
}

function kmItem(
  id: string,
  name: string,
  meta: string,
  left: number,
  interval: number,
  overdue?: boolean,
  lastServicedAt?: number,
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
    remainingDays: estimateDaysFromKm(remainingKm),
    lastServicedAt: lastServicedAt ?? lastAtFromKm(interval, remainingKm),
  }
}

function dayItem(
  id: string,
  name: string,
  meta: string,
  left: number,
  lastServicedAt?: number,
): ReminderItem {
  const interval = DAY_INTERVAL[id as keyof typeof DAY_INTERVAL] ?? 365
  return {
    id,
    name,
    meta,
    due: left <= 0 ? `Vencido · haz ${name.toLowerCase()}` : `En ${left} días`,
    tone: timeTone(left),
    remainingPct: remainingPct(left, interval),
    remainingDays: left,
    lastServicedAt: lastServicedAt ?? lastAtFromDays(interval, left),
  }
}

/** Most urgent upcoming maintenance for the active Vehículo (preview strip). */
export function upcomingMaintenanceForVehicle(
  vehicle: VehicleProfile | null,
  limit = 3,
): ReminderItem[] {
  const items = remindersForVehicle(vehicle)
  return [...items]
    .sort(
      (a, b) =>
        TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.remainingPct - b.remainingPct,
    )
    .slice(0, limit)
}

/** Recordatorios for the active Vehículo. Empty until a Vehículo exists. */
export function remindersForVehicle(vehicle: VehicleProfile | null): ReminderItem[] {
  if (!vehicle) return []

  const km = mileageToKm(vehicle.mileage, vehicle.mileageUnit)
  const resets = loggedPartResetsForVehicle(vehicle.id)
  const needsService = vehicleNeedsService(vehicle) && !resets.oil
  const oilLeft = kmLeftAfterReset(
    oilKmRemaining(vehicle.mileage, vehicle.mileageUnit),
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
    ...extraItemsForVehicle(vehicle.id),
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

  return items
    .map((item) => {
      const reset = resets[item.id]
      return reset ? { ...item, lastServicedAt: reset.at } : item
    })
    .sort(
      (a, b) =>
        a.remainingPct - b.remainingPct || TONE_ORDER[a.tone] - TONE_ORDER[b.tone],
    )
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
  const km = mileageToKm(vehicle.mileage, vehicle.mileageUnit)
  const resets = loggedPartResetsForVehicle(vehicle.id)
  if (resets.battery) {
    const daysLeft = daysLeftAfterReset(DAY_INTERVAL.battery, DAY_INTERVAL.battery, resets.battery)
    return { daysLeft, pct: remainingPct(daysLeft, DAY_INTERVAL.battery) }
  }
  const daysLeft = 120 + (km % 80)
  const pct = Math.min(96, Math.max(12, Math.round((daysLeft / 200) * 100)))
  return { daysLeft, pct }
}
