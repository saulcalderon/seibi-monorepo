const PENDIENTES_KEY = 'seibi-pendientes'

export type Pendiente = {
  id: string
  vehicleId: string
  note: string
  createdAt: number
  date?: string
}

function readPendientes(): Pendiente[] {
  try {
    const raw = localStorage.getItem(PENDIENTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Pendiente[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.vehicleId === 'string' &&
        typeof item.note === 'string',
    )
  } catch {
    return []
  }
}

function writePendientes(items: Pendiente[]) {
  localStorage.setItem(PENDIENTES_KEY, JSON.stringify(items))
}

export function pendientesForVehicle(vehicleId: string): Pendiente[] {
  return readPendientes().filter((item) => item.vehicleId === vehicleId)
}

export function addPendiente(input: { vehicleId: string; note: string }): Pendiente {
  const item: Pendiente = {
    id: `pen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    vehicleId: input.vehicleId,
    note: input.note.trim(),
    createdAt: Date.now(),
  }
  writePendientes([item, ...readPendientes()])
  return item
}

export function schedulePendiente(id: string, date: string): Pendiente | null {
  let updated: Pendiente | null = null
  const next = readPendientes().map((item) => {
    if (item.id !== id) return item
    updated = { ...item, date }
    return updated
  })
  if (!updated) return null
  writePendientes(next)
  return updated
}

export function removePendiente(id: string) {
  writePendientes(readPendientes().filter((item) => item.id !== id))
}
