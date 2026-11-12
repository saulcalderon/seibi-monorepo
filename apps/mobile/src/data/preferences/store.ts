import Storage from 'expo-sqlite/kv-store';
import { useCallback, useSyncExternalStore } from 'react';

import type { VehicleView } from '../garage/types';

import { ACTIVE_VEHICLE_KEY, INTRO_DONE_KEY } from './keys';

// Read synchronously from the expo-sqlite kv-store (never AsyncStorage), so a
// screen draws the right Vehicle on its first frame.

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Read on every snapshot rather than cached: sign-out deletes the key behind
// this module's back, and a cache would keep the last person's choice.
const readActiveVehicle = () => Storage.getItemSync(ACTIVE_VEHICLE_KEY);

/** The Vehicle Inicio shows: the one picked last, else the first. */
export function useActiveVehicle(vehicles: readonly VehicleView[]) {
  const stored = useSyncExternalStore(subscribe, readActiveVehicle);
  const active = vehicles.find((v) => v.id === stored) ?? vehicles[0] ?? null;

  const select = useCallback((id: string) => {
    Storage.setItemSync(ACTIVE_VEHICLE_KEY, id);
    notify();
  }, []);

  return { active, select };
}

export function isIntroDone() {
  return Storage.getItemSync(INTRO_DONE_KEY) === '1';
}

export function markIntroDone() {
  Storage.setItemSync(INTRO_DONE_KEY, '1');
}
