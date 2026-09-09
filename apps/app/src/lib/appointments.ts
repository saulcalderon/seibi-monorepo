const APPT_KEY = 'seibi-appointments'

export type Appointment = {
  id: string
  vehicleId: string
  date: string
  note: string
  time?: string
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
  time?: string
}): Appointment {
  const item: Appointment = {
    id: `apt_${Date.now().toString(36)}`,
    vehicleId: input.vehicleId,
    date: input.date,
    note: input.note.trim(),
    time: input.time?.trim() || '09:00',
  }
  localStorage.setItem(APPT_KEY, JSON.stringify([item, ...readAppointments()]))
  return item
}

export function removeAppointment(id: string) {
  localStorage.setItem(
    APPT_KEY,
    JSON.stringify(readAppointments().filter((item) => item.id !== id)),
  )
}

export function appointmentsForVehicle(vehicleId: string): Appointment[] {
  return readAppointments()
    .filter((item) => item.vehicleId === vehicleId)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
}

export function appointmentDatesForVehicle(vehicleId: string): string[] {
  return [...new Set(appointmentsForVehicle(vehicleId).map((item) => item.date))]
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

export function formatAppointmentTime(time?: string) {
  const [hours, minutes] = String(time || '09:00').split(':')
  const hour = Number(hours)
  if (!Number.isFinite(hour)) return '9:00 a. m.'
  const suffix = hour >= 12 ? 'p. m.' : 'a. m.'
  return `${hour % 12 || 12}:${(minutes || '00').padStart(2, '0')} ${suffix}`
}

export function formatAppointmentWhen(iso: string, time?: string) {
  return `${formatAppointmentDate(iso)} · ${formatAppointmentTime(time)}`
}
