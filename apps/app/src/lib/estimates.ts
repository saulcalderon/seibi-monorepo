import {
  formatVehicleLabel,
  type VehicleProfile,
} from './vehicleProfile'

export type EstimateResult = {
  title: string
  meta: string
  price: string
  range: string
  laborPct: number
  partsPct: number
  radiusKm?: number
  placeLabel?: string
}

export type EstimateLocation = {
  lat: number
  lon: number
  label: string
  country: string
}

/** Default demo pin — San Salvador, El Salvador. */
export const DEFAULT_ESTIMATE_LOCATION: EstimateLocation = {
  lat: 13.6929,
  lon: -89.2182,
  label: 'San Salvador',
  country: 'El Salvador',
}

export const ESTIMATE_RADIUS_MIN = 5
export const ESTIMATE_RADIUS_MAX = 50
export const ESTIMATE_RADIUS_DEFAULT = 10

/** @deprecated Prefer ESTIMATE_RADIUS_MIN/MAX slider range. */
export const ESTIMATE_RADIUS_OPTIONS = [5, 10, 25, 50] as const
export type EstimateRadiusKm = number

const CATALOG: Array<{
  match: RegExp
  title: string
  price: number
  low: number
  high: number
  laborPct: number
  partsPct: number
}> = [
  {
    match: /aceite|oil|10w/i,
    title: 'Cambio de aceite sintético 10W-30',
    price: 1180,
    low: 980,
    high: 1450,
    laborPct: 72,
    partsPct: 38,
  },
  {
    match: /freno/i,
    title: 'Revisión y balatas delanteras',
    price: 2400,
    low: 1900,
    high: 3200,
    laborPct: 55,
    partsPct: 70,
  },
  {
    match: /llanta|rotaci[oó]n|neum[aá]tico/i,
    title: 'Rotación de llantas',
    price: 620,
    low: 450,
    high: 850,
    laborPct: 80,
    partsPct: 20,
  },
  {
    match: /alineaci[oó]n/i,
    title: 'Alineación',
    price: 900,
    low: 700,
    high: 1200,
    laborPct: 85,
    partsPct: 15,
  },
]

function money(amount: number) {
  return `$${amount.toLocaleString('es-MX')}`
}

/** Wider radius → wider price band (more talleres / refacciones). */
function spreadForRadius(baseSpread: number, radiusKm: number) {
  const factor = 0.55 + Math.min(radiusKm, 50) / 50
  return Math.round(baseSpread * factor)
}

export function mapEmbedUrl(location: EstimateLocation, radiusKm: number) {
  // Rough degrees: 1° lat ≈ 111 km. Lon scale shrinks near equator (~cos(lat)).
  const latDelta = (radiusKm / 111) * 1.35
  const lonDelta = (radiusKm / (111 * Math.cos((location.lat * Math.PI) / 180))) * 1.35
  const left = location.lon - lonDelta
  const right = location.lon + lonDelta
  const top = location.lat + latDelta
  const bottom = location.lat - latDelta
  const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat}%2C${location.lon}`
}

export const ESTIMATE_SUGGESTIONS = [
  'Cambio de aceite sintético 10W-30',
  'Revisión de frenos',
  'Rotación de llantas',
  'Alineación',
] as const

export function estimateVehicleLabel(vehicle: VehicleProfile | null) {
  return vehicle ? formatVehicleLabel(vehicle) : null
}

/** Demo Estimado lookup until a real pricing source exists. */
export function estimateForQuery(
  query: string,
  options?: { radiusKm?: number; location?: EstimateLocation | null },
): EstimateResult {
  const trimmed = query.trim()
  const radiusKm = options?.radiusKm ?? 10
  const place = options?.location?.label
  const zoneMeta = place
    ? `Rango en ${place} · ${radiusKm} km a la redonda`
    : `Rango típico en tu zona · ${radiusKm} km`

  const hit = CATALOG.find((item) => item.match.test(trimmed))
  if (hit) {
    const mid = hit.price
    const baseSpread = (hit.high - hit.low) / 2
    const spread = spreadForRadius(baseSpread, radiusKm)
    return {
      title: hit.title,
      meta: zoneMeta,
      price: money(mid),
      range: `${money(mid - spread)} – ${money(mid + spread)}`,
      laborPct: hit.laborPct,
      partsPct: hit.partsPct,
      radiusKm,
      placeLabel: place,
    }
  }

  const seed = [...trimmed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const price = 900 + (seed % 1600)
  const spread = spreadForRadius(180 + (seed % 320), radiusKm)
  return {
    title: trimmed || 'Servicio consultado',
    meta: zoneMeta,
    price: money(price),
    range: `${money(price - spread)} – ${money(price + spread)}`,
    laborPct: 60 + (seed % 25),
    partsPct: 25 + (seed % 40),
    radiusKm,
    placeLabel: place,
  }
}
