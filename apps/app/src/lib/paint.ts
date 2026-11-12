// Paint codes stored on vehicles.color (English, per ADR-0002) with the
// Spanish label and a swatch for the UI. The render function uses the same
// codes.
export const PAINTS: Array<{ code: string; label: string; hex: string }> = [
  { code: 'white', label: 'Blanco', hex: '#f4f5f7' },
  { code: 'silver', label: 'Plata', hex: '#c3c7cd' },
  { code: 'gray', label: 'Gris', hex: '#6d7178' },
  { code: 'black', label: 'Negro', hex: '#16171a' },
  { code: 'red', label: 'Rojo', hex: '#c8261d' },
  { code: 'burgundy', label: 'Vino', hex: '#6b1a24' },
  { code: 'blue', label: 'Azul', hex: '#1f4f9a' },
  { code: 'green', label: 'Verde', hex: '#2f6b45' },
  { code: 'yellow', label: 'Amarillo', hex: '#e9c030' },
  { code: 'orange', label: 'Naranja', hex: '#e8702a' },
  { code: 'brown', label: 'Café', hex: '#6b4a32' },
  { code: 'beige', label: 'Beige', hex: '#d8c7a6' },
  { code: 'gold', label: 'Dorado', hex: '#b8964d' },
]

export function paintHex(code: string | null | undefined) {
  return PAINTS.find((p) => p.code === code)?.hex ?? '#c3c7cd'
}

export function paintLabel(code: string | null | undefined) {
  return PAINTS.find((p) => p.code === code)?.label ?? null
}

// Paint → UI accent (Seibi v3). The active Vehicle's paint is the only
// accent on Home: pager dot and interval bars. Low-chroma or very light
// paints fall back to a tinted graphite; the rest keep their hue with
// lightness capped so the accent passes 4.5:1 on white.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
const unit = (x: number) => Math.min(1, Math.max(0, x))

function hexToOklch(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = toLinear(((n >> 16) & 255) / 255)
  const g = toLinear(((n >> 8) & 255) / 255)
  const b = toLinear((n & 255) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}

function oklchToHex(L: number, C: number, H: number) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return `#${rgb.map((c) => Math.round(unit(toGamma(unit(c))) * 255).toString(16).padStart(2, '0')).join('')}`
}

export function paintAccent(hex: string) {
  const { L, C, H } = hexToOklch(hex)
  if (C < 0.04 || L > 0.78) return oklchToHex(0.36, 0.02, H)
  return oklchToHex(Math.min(L, 0.5), Math.max(C, 0.12), H)
}
