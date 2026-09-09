const GARAGE_KEY = 'seibi-garage'
/** Legacy single-vehicle key — migrated on read. */
const LEGACY_PROFILE_KEY = 'seibi-vehicle-profile'

export type MileageUnit = 'km' | 'mi'

export type VehicleProfile = {
  id: string
  brand: string
  model: string
  year: string
  mileage: string
  mileageUnit: MileageUnit
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

export const VEHICLE_MODELS: Record<(typeof VEHICLE_BRANDS)[number], string[]> = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Hilux', 'Yaris', 'Tacoma', 'Prius'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Fit', 'Pilot', 'City'],
  Nissan: ['Sentra', 'Versa', 'March', 'X-Trail', 'NP300', 'Kicks', 'Altima'],
  Volkswagen: ['Jetta', 'Vento', 'Golf', 'Tiguan', 'Polo', 'Amarok', 'Taos'],
  Ford: ['Focus', 'Fiesta', 'Mustang', 'Escape', 'Explorer', 'Ranger', 'F-150'],
  Chevrolet: ['Aveo', 'Spark', 'Cruze', 'Tracker', 'Silverado', 'Onix', 'Equinox'],
}

export function modelsForBrand(brand: VehicleBrandOption | string | ''): string[] {
  if (!brand || brand === 'other') return []
  return VEHICLE_MODELS[brand as (typeof VEHICLE_BRANDS)[number]] ?? []
}

export function modelBelongsToBrand(model: string, brand: VehicleBrandOption | string | '') {
  const needle = model.trim().toLocaleLowerCase('es')
  if (!needle) return true
  const catalog = modelsForBrand(brand)
  if (catalog.length === 0) return true
  return catalog.some((item) => item.toLocaleLowerCase('es') === needle)
}

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
    mileageUnit: value.mileageUnit === 'mi' ? 'mi' : 'km',
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
      mileageUnit: parsed.mileageUnit === 'mi' ? 'mi' : 'km',
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
    mileageUnit: readMileageUnit(input.mileageUnit),
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
    vehicle.id === id
      ? {
          ...vehicle,
          ...input,
          id,
          mileageUnit: readMileageUnit(input.mileageUnit ?? vehicle.mileageUnit),
          placa: sanitizePlaca(input.placa),
        }
      : vehicle,
  )
  if (!vehicles.some((vehicle) => vehicle.id === id)) return garage
  const next: GarageState = {
    vehicles,
    activeId: garage.activeId === id ? id : garage.activeId,
  }
  saveGarage(next)
  return next
}

export function removeVehicle(id: string, garage = getGarage()): GarageState {
  const vehicles = garage.vehicles.filter((vehicle) => vehicle.id !== id)
  if (vehicles.length === garage.vehicles.length) return garage
  const keepActive =
    garage.activeId &&
    garage.activeId !== id &&
    vehicles.some((vehicle) => vehicle.id === garage.activeId)
  const next: GarageState = {
    vehicles,
    activeId: keepActive ? garage.activeId : vehicles[0]?.id ?? null,
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

const KM_PER_MILE = 1.60934

export function readMileageUnit(unit?: MileageUnit | string | null): MileageUnit {
  return unit === 'mi' ? 'mi' : 'km'
}

export function mileageToKm(mileage: string, unit?: MileageUnit | string | null) {
  const value = Number(String(mileage).replace(/,/g, '')) || 0
  return readMileageUnit(unit) === 'mi' ? Math.round(value * KM_PER_MILE) : value
}

export function formatMileageAmount(mileage: string) {
  const value = Number(String(mileage).replace(/,/g, ''))
  if (!Number.isFinite(value)) return mileage
  return value.toLocaleString('es-MX')
}

export function formatMileageUnit(unit?: MileageUnit | string | null) {
  return readMileageUnit(unit) === 'mi' ? 'mi' : 'km'
}

export function formatMileage(mileage: string, unit?: MileageUnit | string | null) {
  const value = Number(String(mileage).replace(/,/g, ''))
  const label = formatMileageUnit(unit)
  if (!Number.isFinite(value)) return `${mileage} ${label}`
  return `${value.toLocaleString('es-MX')} ${label}`
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
export function oilKmRemaining(mileage: string, unit?: MileageUnit | string | null) {
  const km = mileageToKm(mileage, unit)
  return OIL_INTERVAL_KM - (km % OIL_INTERVAL_KM)
}

/**
 * Vehicle needs service when oil is nearly/fully due by km,
 * or when marked as the Honda Civic preview case.
 */
export function vehicleNeedsService(
  vehicle: Pick<VehicleProfile, 'brand' | 'model' | 'mileage' | 'mileageUnit'>,
) {
  const brand = vehicle.brand.trim().toLowerCase()
  const model = vehicle.model.trim().toLowerCase()
  const civicPreview = brand.includes('honda') && model.includes('civic')
  return civicPreview || oilKmRemaining(vehicle.mileage, vehicle.mileageUnit) <= 400
}
