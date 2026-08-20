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
}

function money(amount: number) {
  return `$${amount.toLocaleString('es-MX')}`
}

/** Preview Servicios for the active Vehículo until real data exists. */
export function servicesForVehicle(vehicle: VehicleProfile | null): ServiceItem[] {
  if (!vehicle) {
    return [
      {
        id: 'oil',
        name: 'Cambio de aceite',
        meta: '12 Mar, 10:20 AM',
        cost: '$850',
        icon: 'oil',
      },
      {
        id: 'brakes',
        name: 'Frenos delanteros',
        meta: '28 Feb, 04:15 PM',
        cost: '$2,400',
        icon: 'brakes',
      },
      {
        id: 'tires',
        name: 'Rotación de llantas',
        meta: '10 Ene, 11:40 AM',
        cost: '$650',
        icon: 'tires',
      },
      {
        id: 'filter',
        name: 'Filtro de aire',
        meta: '02 Dic, 03:10 PM',
        cost: '$480',
        icon: 'filter',
      },
      {
        id: 'alignment',
        name: 'Alineación',
        meta: '18 Nov, 09:45 AM',
        cost: '$900',
        icon: 'alignment',
      },
      {
        id: 'battery',
        name: 'Prueba de batería',
        meta: '05 Oct, 02:30 PM',
        cost: '$320',
        icon: 'battery',
      },
    ]
  }

  const km = Number(vehicle.mileage.replace(/,/g, '')) || 0
  const seed = km % 900
  const extras = loggedServicesForVehicle(vehicle.id)

  return [
    ...extras,
    {
      id: 'oil',
      name: 'Cambio de aceite',
      meta: '12 Mar, 10:20 AM',
      cost: money(850 + (seed % 120)),
      icon: 'oil',
    },
    {
      id: 'brakes',
      name: 'Frenos delanteros',
      meta: '28 Feb, 04:15 PM',
      cost: money(2_200 + (seed % 500)),
      icon: 'brakes',
    },
    {
      id: 'tires',
      name: 'Rotación de llantas',
      meta: '10 Ene, 11:40 AM',
      cost: money(600 + (seed % 90)),
      icon: 'tires',
    },
    {
      id: 'filter',
      name: 'Filtro de aire',
      meta: '02 Dic, 03:10 PM',
      cost: money(420 + (seed % 80)),
      icon: 'filter',
    },
    {
      id: 'alignment',
      name: 'Alineación',
      meta: '18 Nov, 09:45 AM',
      cost: money(850 + (seed % 150)),
      icon: 'alignment',
    },
    {
      id: 'battery',
      name: 'Prueba de batería',
      meta: '05 Oct, 02:30 PM',
      cost: money(280 + (seed % 60)),
      icon: 'battery',
    },
  ]
}

const LOGGED_KEY = 'seibi-logged-services'
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

function formatLoggedWhen(date = new Date()) {
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
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
    .map(({ vehicleId: _vehicleId, mileageKm: _mileageKm, loggedAt: _loggedAt, ...item }) => item)
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
  input: { name: string; cost?: string; mileage?: string },
): ServiceItem {
  const name = input.name.trim()
  const mileageKm = Number(String(input.mileage ?? '').replace(/,/g, ''))
  const item: LoggedService = {
    id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    vehicleId,
    name,
    meta: formatLoggedWhen(),
    cost: formatLoggedCost(input.cost ?? ''),
    icon: iconForName(name),
    mileageKm: Number.isFinite(mileageKm) ? mileageKm : undefined,
    loggedAt: Date.now(),
  }
  localStorage.setItem(LOGGED_KEY, JSON.stringify([item, ...readLoggedServices()]))
  window.dispatchEvent(new Event(SERVICES_CHANGE))
  return item
}

export function subscribeServicesChange(onChange: () => void) {
  window.addEventListener(SERVICES_CHANGE, onChange)
  return () => window.removeEventListener(SERVICES_CHANGE, onChange)
}

export function recentServicesForVehicle(
  vehicle: VehicleProfile | null,
  limit = 3,
): ServiceItem[] {
  return servicesForVehicle(vehicle).slice(0, limit)
}

export function serviceVehicleLabel(vehicle: VehicleProfile | null) {
  return vehicle ? formatVehicleLabel(vehicle) : null
}
