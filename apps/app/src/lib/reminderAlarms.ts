const ALARM_KEY = 'seibi-reminder-alarms'

export type ReminderAlarm = {
  vehicleId: string
  reminderId: string
  at: number
}

function readAlarms(): ReminderAlarm[] {
  try {
    const raw = localStorage.getItem(ALARM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReminderAlarm[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.vehicleId === 'string' &&
        typeof item.reminderId === 'string' &&
        typeof item.at === 'number',
    )
  } catch {
    return []
  }
}

function writeAlarms(items: ReminderAlarm[]) {
  localStorage.setItem(ALARM_KEY, JSON.stringify(items))
}

export function getReminderAlarm(vehicleId: string, reminderId: string) {
  return (
    readAlarms().find(
      (item) => item.vehicleId === vehicleId && item.reminderId === reminderId,
    ) ?? null
  )
}

export function saveReminderAlarm(input: ReminderAlarm) {
  const next = readAlarms().filter(
    (item) => !(item.vehicleId === input.vehicleId && item.reminderId === input.reminderId),
  )
  writeAlarms([input, ...next])
  return input
}

export function formatAlarmWhen(at: number) {
  return new Date(at).toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function scheduleReminderPing(at: number, title: string, body: string) {
  if (!('Notification' in window)) return
  const delay = at - Date.now()
  if (delay <= 0 || delay > 2_000_000_000) return
  void Notification.requestPermission().then((permission) => {
    if (permission !== 'granted') return
    window.setTimeout(() => {
      new Notification(title, { body })
    }, delay)
  })
}
