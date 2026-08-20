const APPT_KEY = 'seibi-appointments'

export type Appointment = {
  id: string
  vehicleId: string
  date: string
  note: string
}

function readAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(APPT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Appointment[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.vehicleId === 'string' &&
        typeof item.date === 'string',
    )
  } catch {
    return []
  }
}

export function addAppointment(input: {
  vehicleId: string
  date: string
  note: string
}): Appointment {
  const item: Appointment = {
    id: `apt_${Date.now().toString(36)}`,
    vehicleId: input.vehicleId,
    date: input.date,
    note: input.note.trim(),
  }
  localStorage.setItem(APPT_KEY, JSON.stringify([item, ...readAppointments()]))
  return item
}

export function formatAppointmentDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
