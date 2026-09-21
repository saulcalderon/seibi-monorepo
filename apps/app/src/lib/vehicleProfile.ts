export type MileageUnit = 'km' | 'mi'

export type VehicleProfile = {
  id: string
  brand: string
  model: string
  year: string
  mileage: string
  mileageUnit: MileageUnit
  plate: string
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

export function sanitizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
}

function compactSearchText(value: string) {
  return value.toLocaleLowerCase('es').replace(/[^a-z0-9áéíóúüñ]/g, '')
}

export function vehicleMatchesFleetQuery(
  vehicle: Pick<VehicleProfile, 'brand' | 'model' | 'year' | 'mileage' | 'plate'>,
  query: string,
) {
  const needle = compactSearchText(query)
  if (!needle) return true
  const haystack = compactSearchText(
    `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.mileage} ${vehicle.plate}`,
  )
  return haystack.includes(needle)
}

export function getActiveVehicle(
  vehicles: VehicleProfile[],
  activeId: string | null,
): VehicleProfile | null {
  if (activeId) {
    const found = vehicles.find((vehicle) => vehicle.id === activeId)
    if (found) return found
  }
  return vehicles[0] ?? null
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
  const raw = String(mileage).replace(/,/g, '').trim()
  if (!raw) return ''
  const value = Number(raw)
  if (!Number.isFinite(value)) return mileage
  return value.toLocaleString('es-MX')
}

export function formatMileageUnit(unit?: MileageUnit | string | null) {
  return readMileageUnit(unit) === 'mi' ? 'mi' : 'km'
}

export function formatMileage(mileage: string, unit?: MileageUnit | string | null) {
  const raw = String(mileage).replace(/,/g, '').trim()
  const label = formatMileageUnit(unit)
  if (!raw) return ''
  const value = Number(raw)
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
