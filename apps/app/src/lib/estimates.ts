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
}

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
export function estimateForQuery(query: string): EstimateResult {
  const trimmed = query.trim()
  const hit = CATALOG.find((item) => item.match.test(trimmed))
  if (hit) {
    return {
      title: hit.title,
      meta: 'Rango típico en tu zona',
      price: money(hit.price),
      range: `${money(hit.low)} – ${money(hit.high)}`,
      laborPct: hit.laborPct,
      partsPct: hit.partsPct,
    }
  }

  const seed = [...trimmed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const price = 900 + (seed % 1600)
  const spread = 180 + (seed % 320)
  return {
    title: trimmed || 'Servicio consultado',
    meta: 'Rango típico en tu zona',
    price: money(price),
    range: `${money(price - spread)} – ${money(price + spread)}`,
    laborPct: 60 + (seed % 25),
    partsPct: 25 + (seed % 40),
  }
}
