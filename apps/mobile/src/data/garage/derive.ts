// Turns a stored Vehicle into what screens show, with the shared engine
// (`@seibi/maintenance-engine`), exactly as the PWA's deriveVehicle does.
import { mileagePrompt } from '@seibi/maintenance-engine/mileage-prompt';
import { currentOdometer } from '@seibi/maintenance-engine/odometer';
import {
  computeReminders,
  effectiveSchedule,
  nextReminder,
  pendingCount,
  vehicleHealth,
  type VehicleHealth,
} from '@seibi/maintenance-engine/reminders';

import type { MaintenanceTask } from '../task/catalog';

import type { VehicleRecord, VehicleView } from './types';

const DAY_MS = 86_400_000;
/** A withdrawn Vehicle can be restored for this long (Mi flota). */
const WITHDRAWN_KEEP_MS = 30 * DAY_MS;

export function withdrawnStillRestorable(withdrawnAt: string, now = Date.now()) {
  return now - Date.parse(withdrawnAt) < WITHDRAWN_KEEP_MS;
}

export function withdrawnDaysLeft(withdrawnAt: string, now = Date.now()) {
  const leftMs = WITHDRAWN_KEEP_MS - (now - Date.parse(withdrawnAt));
  return Math.max(1, Math.ceil(leftMs / DAY_MS));
}

export function deriveVehicle(v: VehicleRecord, tasks: readonly MaintenanceTask[], today: string): VehicleView {
  const cited = v.schedule?.status === 'ready' ? v.schedule.items : null;
  const schedule = effectiveSchedule(
    cited,
    tasks.map((t) => ({ code: t.code, generalDistanceKm: t.generalDistanceKm, generalMonths: t.generalMonths })),
  );
  const readings = v.readings.map((r) => ({ reading: r.reading, recordedOn: r.recordedOn }));
  const events = v.services.flatMap((s) =>
    s.items.flatMap((i) => (i.taskCode ? [{ taskCode: i.taskCode, performedOn: s.performedOn, reading: s.reading }] : [])),
  );
  const result = computeReminders({
    measure: v.measure,
    schedule,
    readings,
    events,
    routines: v.routines,
    states: v.states,
    today,
  });
  const current = currentOdometer(readings);

  return {
    ...v,
    odometer: current?.reading ?? null,
    odometerOn: current?.recordedOn ?? null,
    projectedOdometer: result.odometer,
    usage: result.usage,
    severe: result.severe,
    reminders: result.reminders,
    health: vehicleHealth(result.reminders),
    next: nextReminder(result.reminders),
    pending: pendingCount(result.reminders),
    mileagePrompt: mileagePrompt(readings, result.usage, v.measure, today),
    openManualReminders: v.manualReminders.filter((r) => !r.doneAt).sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1)),
    upcomingAppointments: v.appointments
      .filter((a) => !a.canceledAt && !a.serviceId && a.scheduledOn >= today)
      .sort((a, b) => (a.scheduledOn < b.scheduledOn ? -1 : 1)),
    scheduleSource: v.schedule?.status === 'ready' ? 'model' : v.schedule?.status === 'pending' ? 'pending' : 'general',
  };
}

/** Every Vehicle derived; withdrawn ones apart, while they can still be restored. */
export function splitGarage(records: readonly VehicleRecord[], tasks: readonly MaintenanceTask[], today: string, now = Date.now()) {
  const all = records.map((v) => deriveVehicle(v, tasks, today));
  return {
    vehicles: all.filter((v) => !v.withdrawnAt),
    withdrawn: all.filter((v) => v.withdrawnAt && withdrawnStillRestorable(v.withdrawnAt, now)),
  };
}

const HEALTH_RANK: Record<VehicleHealth, number> = { overdue: 0, soon: 1, unknown: 2, ok: 3 };

/** Most urgent first: worst health, then the soonest next Reminder. */
export function byUrgency(a: VehicleView, b: VehicleView) {
  const rank = HEALTH_RANK[a.health] - HEALTH_RANK[b.health];
  if (rank !== 0) return rank;
  const ae = a.next?.expectedOn ?? '9999';
  const be = b.next?.expectedOn ?? '9999';
  return ae < be ? -1 : ae > be ? 1 : 0;
}
