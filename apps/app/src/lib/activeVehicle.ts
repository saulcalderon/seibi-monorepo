import { useCallback, useSyncExternalStore } from 'react'
import { useAuthSession } from './authSession'
import type { VehicleView } from './garage'

// Which Vehicle Inicio shows. A per-device UI preference, so localStorage.
const PREFIX = 'seibi-active-vehicle:'
const EVENT = 'seibi-active-vehicle-change'

function read(userId: string | undefined) {
  if (!userId) return null
  try {
    return localStorage.getItem(PREFIX + userId)
  } catch {
    return null
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useActiveVehicle(vehicles: VehicleView[]) {
  const { user } = useAuthSession()
  const stored = useSyncExternalStore(subscribe, () => read(user?.id))
  const active = vehicles.find((v) => v.id === stored) ?? vehicles[0] ?? null

  const select = useCallback(
    (id: string) => {
      if (!user) return
      try {
        localStorage.setItem(PREFIX + user.id, id)
      } catch {
        // Private mode: selection lasts until reload.
      }
      window.dispatchEvent(new Event(EVENT))
    },
    [user],
  )

  return { active, select }
}
