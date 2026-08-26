const HUD_KEY = 'seibi-hud-slots'

export const HUD_SLOTS = ['top', 'right', 'bottom', 'left'] as const

export type HudSlot = (typeof HUD_SLOTS)[number]

export type HudLayout = Record<HudSlot, string>

export const DEFAULT_HUD_LAYOUT: HudLayout = {
  top: 'oil',
  right: 'tires',
  bottom: 'battery',
  left: 'brakes',
}

function isSlot(value: string): value is HudSlot {
  return HUD_SLOTS.includes(value as HudSlot)
}

function normalize(value: unknown): HudLayout {
  if (!value || typeof value !== 'object') return { ...DEFAULT_HUD_LAYOUT }
  const raw = value as Record<string, unknown>
  const next = { ...DEFAULT_HUD_LAYOUT }
  for (const slot of HUD_SLOTS) {
    const id = raw[slot]
    if (typeof id === 'string' && id.trim()) next[slot] = id
  }
  return next
}

function readAll(): Record<string, HudLayout> {
  try {
    const raw = localStorage.getItem(HUD_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, HudLayout> = {}
    for (const [vehicleId, layout] of Object.entries(parsed)) {
      if (typeof vehicleId === 'string') out[vehicleId] = normalize(layout)
    }
    return out
  } catch {
    return {}
  }
}

export function hudLayoutForVehicle(vehicleId: string): HudLayout {
  return readAll()[vehicleId] ?? { ...DEFAULT_HUD_LAYOUT }
}

export function assignHudSlot(
  vehicleId: string,
  slot: HudSlot,
  reminderId: string,
): HudLayout {
  if (!isSlot(slot)) return hudLayoutForVehicle(vehicleId)
  const current = hudLayoutForVehicle(vehicleId)
  const next = { ...current }
  const occupied = HUD_SLOTS.find((other) => other !== slot && next[other] === reminderId)
  if (occupied) next[occupied] = current[slot]
  next[slot] = reminderId
  const all = readAll()
  all[vehicleId] = next
  localStorage.setItem(HUD_KEY, JSON.stringify(all))
  return next
}
