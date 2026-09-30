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
