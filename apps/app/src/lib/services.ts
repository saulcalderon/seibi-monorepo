import {
  formatVehicleLabel,
  type VehicleProfile,
} from './vehicleProfile'

export type ServiceIcon = 'oil' | 'brakes' | 'tires' | 'filter' | 'battery' | 'alignment'

export type ServiceItem = {
  id: string
  name: string
  meta: string
  cost: string
  icon: ServiceIcon
  /** Epoch ms when the Servicio was performed. */
  performedAt: number
  taller?: string
  comment?: string
}

/** Window used by “Servicios recientes”. Historial ignores this. */
export const RECENT_SERVICE_DAYS = 30
const RECENT_WINDOW_MS = RECENT_SERVICE_DAYS * 24 * 60 * 60 * 1000

function money(amount: number) {
  return `$${amount.toLocaleString('es-MX')}`
}

function daysAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function formatServiceWhen(at: number) {
  return new Date(at).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function demoServices(seed = 0): ServiceItem[] {
  const oilAt = daysAgo(4)
  const brakesAt = daysAgo(12)
  const tiresAt = daysAgo(22)
  const filterAt = daysAgo(48)
  const alignAt = daysAgo(95)
  const batteryAt = daysAgo(140)

  const items: ServiceItem[] = [
    {
      id: 'oil',
      name: 'Cambio de aceite',
      meta: formatServiceWhen(oilAt),
      cost: money(850 + (seed % 120)),
      icon: 'oil',
      performedAt: oilAt,
      taller: 'Taller Express Norte',
    },
    {
      id: 'brakes',
      name: 'Frenos delanteros',
      meta: formatServiceWhen(brakesAt),
      cost: money(2_200 + (seed % 500)),
      icon: 'brakes',
      performedAt: brakesAt,
      taller: 'Frenos y Más',
    },
    {
      id: 'tires',
      name: 'Rotación de llantas',
      meta: formatServiceWhen(tiresAt),
      cost: money(600 + (seed % 90)),
      icon: 'tires',
      performedAt: tiresAt,
      taller: 'Llantas del Valle',
    },
    {
      id: 'filter',
      name: 'Filtro de aire',
      meta: formatServiceWhen(filterAt),
      cost: money(420 + (seed % 80)),
      icon: 'filter',
      performedAt: filterAt,
      taller: 'Taller Express Norte',
    },
    {
      id: 'alignment',
      name: 'Alineación',
      meta: formatServiceWhen(alignAt),
      cost: money(850 + (seed % 150)),
      icon: 'alignment',
      performedAt: alignAt,
      taller: 'Alineación Rápida',
    },
    {
      id: 'battery',
      name: 'Prueba de batería',
      meta: formatServiceWhen(batteryAt),
      cost: money(280 + (seed % 60)),
      icon: 'battery',
      performedAt: batteryAt,
      taller: 'Autoeléctrica Centro',
    },
  ]
  return items.sort((a, b) => b.performedAt - a.performedAt)
}

/** Full Historial for the active Vehículo (any date). */
export function servicesForVehicle(vehicle: VehicleProfile | null): ServiceItem[] {
  if (!vehicle) {
    return withServiceNotes(null, demoServices())
  }

  const km = Number(vehicle.mileage.replace(/,/g, '')) || 0
  const seed = km % 900
  const extras = loggedServicesForVehicle(vehicle.id)

  return withServiceNotes(vehicle.id, [...extras, ...demoServices(seed)].sort(
    (a, b) => b.performedAt - a.performedAt,
  ))
}

const LOGGED_KEY = 'seibi-logged-services'
const NOTES_KEY = 'seibi-service-notes'
const SERVICES_CHANGE = 'seibi-services-change'

type LoggedService = ServiceItem & {
  vehicleId: string
  mileageKm?: number
  loggedAt?: number
}

export type PartReset = {
  reminderId: string
  km: number | null
  at: number
}

function iconForName(name: string): ServiceIcon {
  const text = name.toLowerCase()
  if (text.includes('aceite')) return 'oil'
  if (text.includes('freno')) return 'brakes'
  if (text.includes('llanta')) return 'tires'
  if (text.includes('bater')) return 'battery'
  if (text.includes('aline')) return 'alignment'
  return 'filter'
}

export function reminderIdForPartName(name: string): string | null {
  const text = name.toLowerCase()
  if (text.includes('aceite')) return 'oil'
  if (text.includes('freno')) return 'brakes'
  if (text.includes('llanta')) return 'tires'
  if (text.includes('aline')) return 'alignment'
  if (text.includes('refriger') || text.includes('anticongel')) return 'coolant'
  if (text.includes('buj')) return 'spark'
  if (text.includes('bater')) return 'battery'
  if (text.includes('filtro')) return 'air-filter'
  return null
}

function formatLoggedCost(raw: string) {
  const amount = Number(String(raw).replace(/[^\d]/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return `$${amount.toLocaleString('es-MX')}`
}

function readLoggedServices(): LoggedService[] {
  try {
    const raw = localStorage.getItem(LOGGED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LoggedService[]
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

export function loggedServicesForVehicle(vehicleId: string): ServiceItem[] {
  return readLoggedServices()
    .filter((item) => item.vehicleId === vehicleId)
    .map(({ vehicleId: _vehicleId, mileageKm: _mileageKm, loggedAt, ...item }) => {
      const performedAt =
        typeof item.performedAt === 'number'
          ? item.performedAt
          : typeof loggedAt === 'number'
            ? loggedAt
            : 0
      return {
        ...item,
        performedAt,
        meta: item.meta || (performedAt ? formatServiceWhen(performedAt) : '—'),
      }
    })
}

export function loggedPartResetsForVehicle(vehicleId: string): Partial<Record<string, PartReset>> {
  const resets: Partial<Record<string, PartReset>> = {}
  for (const item of readLoggedServices()) {
    if (item.vehicleId !== vehicleId) continue
    if (typeof item.mileageKm !== 'number' && typeof item.loggedAt !== 'number') continue
    const reminderId = reminderIdForPartName(item.name)
    if (!reminderId || resets[reminderId]) continue
    resets[reminderId] = {
      reminderId,
      km: typeof item.mileageKm === 'number' ? item.mileageKm : null,
      at: typeof item.loggedAt === 'number' ? item.loggedAt : Date.now(),
    }
  }
  return resets
}

export function addLoggedService(
  vehicleId: string,
  input: { name: string; cost?: string; mileage?: string; taller?: string },
): ServiceItem {
  const name = input.name.trim()
  const mileageKm = Number(String(input.mileage ?? '').replace(/,/g, ''))
  const taller = input.taller?.trim() || undefined
  const performedAt = Date.now()
  const when = formatServiceWhen(performedAt)
  const item: LoggedService = {
    id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    vehicleId,
    name,
    meta: taller ? `${when} · ${taller}` : when,
    cost: formatLoggedCost(input.cost ?? ''),
    icon: iconForName(name),
    performedAt,
    mileageKm: Number.isFinite(mileageKm) ? mileageKm : undefined,
    loggedAt: performedAt,
    taller,
  }
  localStorage.setItem(LOGGED_KEY, JSON.stringify([item, ...readLoggedServices()]))
  window.dispatchEvent(new Event(SERVICES_CHANGE))
  return item
}

function noteStorageKey(vehicleId: string | null, serviceId: string) {
  return `${vehicleId ?? 'none'}:${serviceId}`
}

function readServiceNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function withServiceNotes(
  vehicleId: string | null,
  items: ServiceItem[],
): ServiceItem[] {
  const notes = readServiceNotes()
  return items.map((item) => {
    const saved = notes[noteStorageKey(vehicleId, item.id)]
    return saved ? { ...item, comment: saved } : item
  })
}

export function saveServiceComment(
  vehicleId: string | null,
  serviceId: string,
  comment: string,
) {
  const notes = readServiceNotes()
  const key = noteStorageKey(vehicleId, serviceId)
  const trimmed = comment.trim()
  if (trimmed) notes[key] = trimmed
  else delete notes[key]
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  window.dispatchEvent(new Event(SERVICES_CHANGE))
}

export function subscribeServicesChange(onChange: () => void) {
  window.addEventListener(SERVICES_CHANGE, onChange)
  return () => window.removeEventListener(SERVICES_CHANGE, onChange)
}

/** Servicios performed within the last 30 days (newest first). */
export function recentServicesForVehicle(
  vehicle: VehicleProfile | null,
  limit?: number,
): ServiceItem[] {
  const cutoff = Date.now() - RECENT_WINDOW_MS
  const recent = servicesForVehicle(vehicle)
    .filter((item) => item.performedAt >= cutoff)
    .sort((a, b) => b.performedAt - a.performedAt)
  return typeof limit === 'number' ? recent.slice(0, limit) : recent
}

export function serviceVehicleLabel(vehicle: VehicleProfile | null) {
  return vehicle ? formatVehicleLabel(vehicle) : null
}

export function parseServiceCost(cost: string) {
  const amount = Number(String(cost).replace(/[^\d]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

/** Total spent on Servicios in the current calendar month. */
export function monthlySpendForVehicle(vehicle: VehicleProfile | null) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const items = servicesForVehicle(vehicle).filter((item) => {
    if (!item.performedAt) return false
    const date = new Date(item.performedAt)
    return date.getFullYear() === year && date.getMonth() === month
  })
  const total = items.reduce((sum, item) => sum + parseServiceCost(item.cost), 0)
  return {
    total,
    count: items.length,
    label: now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
    formatted: money(total),
  }
}
