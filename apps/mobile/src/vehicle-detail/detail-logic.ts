// The Vehicle detail's pure rules, ported from the PWA's VehicleDetail.tsx so
// they can be tested without the screen: month grouping, this year's spend,
// the readings slice, the routines total and the tile/banner wording keys.
import type { UsageRate } from '@seibi/maintenance-engine/odometer';

import type { MileageRecord, RoutineRecord, ServiceRecord, VehicleView } from '@/data/garage/types';

/** Services grouped by «YYYY-MM», keeping the order they come from the garage (newest first). */
export function servicesByMonth(services: readonly ServiceRecord[]): [string, ServiceRecord[]][] {
  const map = new Map<string, ServiceRecord[]>();
  for (const service of services) {
    const key = service.performedOn.slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), service]);
  }
  return [...map.entries()];
}

/** What this calendar year has cost across the Vehicle's Services. */
export function yearSpend(services: readonly ServiceRecord[], today: string): number {
  const year = today.slice(0, 4);
  return services.filter((s) => s.performedOn.slice(0, 4) === year).reduce((sum, s) => sum + (s.totalCost ?? 0), 0);
}

/** The latest Mileage readings: date desc, then reading desc (the PWA's sort), at most `limit`. */
export function latestReadings(readings: readonly MileageRecord[], limit = 8): MileageRecord[] {
  return [...readings]
    .sort((a, b) => (a.recordedOn === b.recordedOn ? b.reading - a.reading : a.recordedOn < b.recordedOn ? 1 : -1))
    .slice(0, limit);
}

/** The routines' combined weekly distance in the Vehicle's measure. */
export function routinesWeeklyTotal(routines: readonly RoutineRecord[]): number {
  return routines.reduce((sum, r) => sum + r.roundTripDistance * r.daysPerWeek, 0);
}

/** Which explanation line the Uso card shows (es.json `vehicleDetail.usage`). */
export function usageSourceKey(usage: UsageRate | null): 'fromReadings' | 'fromRoutines' | 'ask' {
  if (usage?.source === 'readings') return 'fromReadings';
  if (usage?.source === 'routines') return 'fromRoutines';
  return 'ask';
}

export type ScheduleBanner = 'pending' | 'model' | 'general-plain' | 'general-cta';

/**
 * Which Mantenimiento banner the Vehicle gets (the PWA's ScheduleBanner):
 * «pending» while the plan is looked up, «model» with its summary, and the
 * general note — with «Buscar plan del fabricante» («general-cta») only when
 * no published plan exists (schedule absent or not 'general').
 */
export function scheduleBanner(vehicle: Pick<VehicleView, 'scheduleSource' | 'schedule'>): ScheduleBanner {
  if (vehicle.scheduleSource === 'pending') return 'pending';
  if (vehicle.scheduleSource === 'model') return 'model';
  return vehicle.schedule?.status === 'general' ? 'general-plain' : 'general-cta';
}

/** The body of the general banner: the published summary when there is one. */
export function scheduleGeneralBody(vehicle: Pick<VehicleView, 'schedule'>): 'generalFound' | 'generalNone' {
  return vehicle.schedule?.status === 'general' ? 'generalFound' : 'generalNone';
}
