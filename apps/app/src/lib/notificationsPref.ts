const NOTIFICATIONS_KEY = 'seibi-notifications'

const listeners = new Set<() => void>()

export function getNotificationsEnabled() {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(NOTIFICATIONS_KEY) !== 'off'
}

export function setNotificationsEnabled(on: boolean) {
  localStorage.setItem(NOTIFICATIONS_KEY, on ? 'on' : 'off')
  listeners.forEach((listener) => listener())
}

export function subscribeNotificationsEnabled(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
