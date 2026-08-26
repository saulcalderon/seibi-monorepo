const GARAGE_KEY = 'seibi-garage'
/** Legacy single-vehicle key — migrated on read. */
const LEGACY_PROFILE_KEY = 'seibi-vehicle-profile'

export type VehicleProfile = {
  id: string
  brand: string
  model: string
  year: string
  mileage: string
  placa: string
}

export type GarageState = {
  vehicles: VehicleProfile[]
  activeId: string | null
}

export const VEHICLE_BRANDS = [
  'Toyota',
  'Honda',
  'Nissan',
  'Volkswagen',
  'Ford',
  'Chevrolet',
] as const

export type VehicleBrandOption = (typeof VEHICLE_BRANDS)[number] | 'other'

const emptyGarage: GarageState = { vehicles: [], activeId: null }

function createId() {
  return `veh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const PLACA_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

/** Stable preview plate for vehicles saved before `placa` existed. */
export function previewPlacaFromId(id: string) {
  let hash = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const u = hash >>> 0
  const a = PLACA_LETTERS[u % PLACA_LETTERS.length]
  const b = PLACA_LETTERS[(u >>> 5) % PLACA_LETTERS.length]
  const c = PLACA_LETTERS[(u >>> 10) % PLACA_LETTERS.length]
  const n1 = String((u >>> 15) % 100).padStart(2, '0')
  const n2 = String((u >>> 22) % 100).padStart(2, '0')
  return `${a}${b}${c}-${n1}-${n2}`
}

export function sanitizePlaca(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
}

function compactSearchText(value: string) {
  return value.toLocaleLowerCase('es').replace(/[^a-z0-9áéíóúüñ]/g, '')
}

export function vehicleMatchesFleetQuery(
  vehicle: Pick<VehicleProfile, 'brand' | 'model' | 'year' | 'mileage' | 'placa'>,
  query: string,
) {
  const needle = compactSearchText(query)
  if (!needle) return true
  const haystack = compactSearchText(
    `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.mileage} ${vehicle.placa}`,
  )
  return haystack.includes(needle)
}

function isVehicleRecord(value: unknown): value is Omit<VehicleProfile, 'placa'> & {
  placa?: unknown
} {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<VehicleProfile>
  return (
    typeof item.id === 'string' &&
    typeof item.brand === 'string' &&
    typeof item.model === 'string' &&
    typeof item.year === 'string' &&
    typeof item.mileage === 'string'
  )
}

function readVehicle(value: unknown): VehicleProfile | null {
  if (!isVehicleRecord(value)) return null
  return {
    id: value.id,
    brand: value.brand,
    model: value.model,
    year: value.year,
    mileage: value.mileage,
    placa: typeof value.placa === 'string' ? value.placa : previewPlacaFromId(value.id),
  }
}

function migrateLegacy(): GarageState | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<VehicleProfile>
    if (
      typeof parsed.brand !== 'string' ||
      typeof parsed.model !== 'string' ||
      typeof parsed.year !== 'string' ||
      typeof parsed.mileage !== 'string'
    ) {
      return null
    }
    const id = createId()
    const vehicle: VehicleProfile = {
      id,
      brand: parsed.brand,
      model: parsed.model,
      year: parsed.year,
      mileage: parsed.mileage,
      placa: previewPlacaFromId(id),
    }
    const garage: GarageState = { vehicles: [vehicle], activeId: vehicle.id }
    saveGarage(garage)
    localStorage.removeItem(LEGACY_PROFILE_KEY)
    return garage
  } catch {
    return null
  }
}

export function getGarage(): GarageState {
  try {
    const raw = localStorage.getItem(GARAGE_KEY)
    if (!raw) {
      return migrateLegacy() ?? emptyGarage
    }
    const parsed = JSON.parse(raw) as Partial<GarageState>
    const vehicles = Array.isArray(parsed.vehicles)
      ? parsed.vehicles
          .map(readVehicle)
          .filter((vehicle): vehicle is VehicleProfile => vehicle !== null)
      : []
    const activeId =
      typeof parsed.activeId === 'string' &&
      vehicles.some((vehicle) => vehicle.id === parsed.activeId)
        ? parsed.activeId
        : (vehicles[0]?.id ?? null)
    return { vehicles, activeId }
  } catch {
    return migrateLegacy() ?? emptyGarage
  }
}

export function saveGarage(garage: GarageState) {
  localStorage.setItem(GARAGE_KEY, JSON.stringify(garage))
  window.dispatchEvent(new Event('seibi-garage-change'))
}

export function getActiveVehicle(garage = getGarage()): VehicleProfile | null {
  if (!garage.activeId) return garage.vehicles[0] ?? null
  return garage.vehicles.find((vehicle) => vehicle.id === garage.activeId) ?? null
}

/** @deprecated Prefer getActiveVehicle / getGarage */
export function getVehicleProfile(): VehicleProfile | null {
  return getActiveVehicle()
}

export function addVehicle(
  input: Omit<VehicleProfile, 'id'>,
  garage = getGarage(),
): GarageState {
  const vehicle: VehicleProfile = {
    ...input,
    id: createId(),
    placa: sanitizePlaca(input.placa),
  }
  const next: GarageState = {
    vehicles: [...garage.vehicles, vehicle],
    activeId: vehicle.id,
  }
  saveGarage(next)
  return next
}

export function setActiveVehicle(id: string, garage = getGarage()): GarageState {
  if (!garage.vehicles.some((vehicle) => vehicle.id === id)) return garage
  const next = { ...garage, activeId: id }
  saveGarage(next)
  return next
}

export function updateVehicle(
  id: string,
  input: Omit<VehicleProfile, 'id'>,
  garage = getGarage(),
): GarageState {
  const vehicles = garage.vehicles.map((vehicle) =>
    vehicle.id === id ? { ...vehicle, ...input, id, placa: sanitizePlaca(input.placa) } : vehicle,
  )
  if (!vehicles.some((vehicle) => vehicle.id === id)) return garage
  const next: GarageState = {
    vehicles,
    activeId: garage.activeId === id ? id : garage.activeId,
  }
  saveGarage(next)
  return next
}

export function clearGarage() {
  localStorage.removeItem(GARAGE_KEY)
  localStorage.removeItem(LEGACY_PROFILE_KEY)
}

export function formatVehicleLabel(profile: Pick<VehicleProfile, 'brand' | 'model' | 'year'>) {
  return `${profile.brand} ${profile.model} ${profile.year}`
}

export function formatMileageAmount(mileage: string) {
  const value = Number(String(mileage).replace(/,/g, ''))
  if (!Number.isFinite(value)) return mileage
  return value.toLocaleString('es-MX')
}

export function formatMileage(mileage: string) {
  const value = Number(String(mileage).replace(/,/g, ''))
  if (!Number.isFinite(value)) return `${mileage} km`
  return `${value.toLocaleString('es-MX')} km`
}

export function resolveBrandName(brand: string, brandOther: string) {
  if (brand === 'other') return brandOther.trim()
  return brand.trim()
}

/** Visual art variants for the selector cards. */
export function vehicleArtSrc(index: number) {
  return index % 2 === 0 ? '/assets/info-car.png' : '/assets/info-car-km.png'
}

/** Oil interval used for preview reminders (km). */
export const OIL_INTERVAL_KM = 5_000

/** Remaining km until next oil change based on current odometer. */
export function oilKmRemaining(mileage: string) {
  const km = Number(String(mileage).replace(/,/g, '')) || 0
  return OIL_INTERVAL_KM - (km % OIL_INTERVAL_KM)
}

/**
 * Vehicle needs service when oil is nearly/fully due by km,
 * or when marked as the Honda Civic preview case.
 */
export function vehicleNeedsService(
  vehicle: Pick<VehicleProfile, 'brand' | 'model' | 'mileage'>,
) {
  const brand = vehicle.brand.trim().toLowerCase()
  const model = vehicle.model.trim().toLowerCase()
  const civicPreview = brand.includes('honda') && model.includes('civic')
  return civicPreview || oilKmRemaining(vehicle.mileage) <= 400
}
