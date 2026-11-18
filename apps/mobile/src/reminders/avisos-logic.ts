// The decisions behind Avisos (S9, SEI-64) as plain functions, ported from
// the PWA's screens/Avisos.tsx, components/ReminderDetail.tsx,
// components/UnknownTasks.tsx and forms/SmallForms.tsx (LastDoneForm) as of
// 6e3b818. The Reminders themselves come from the engine; nothing here
// re-derives a status.
import { addDays, addMonths } from '@seibi/maintenance-engine/days';
import type { Reminder, VehicleHealth } from '@seibi/maintenance-engine/reminders';

import { byUrgency } from '@/data/garage/derive';
import type { VehicleView } from '@/data/garage/types';
import { COMMON_TASKS, type MaintenanceTask } from '@/data/task/catalog';

/** Soonest expected first; a Reminder with no expected day goes last. */
const byExpected = (a: Reminder, b: Reminder) => ((a.expectedOn ?? '9999') < (b.expectedOn ?? '9999') ? -1 : 1);

export type ReminderGroups = {
  overdue: Reminder[];
  soon: Reminder[];
  ok: Reminder[];
  /** «Pospuestos»: snoozed, whatever their status, except unknown ones. */
  snoozed: Reminder[];
  /** «Completa tu historial»: no last time known. */
  unknown: Reminder[];
};

/** One Vehicle's Reminders by the group Avisos shows them in. */
export function groupReminders(reminders: readonly Reminder[]): ReminderGroups {
  const awake = (status: Reminder['status']) => reminders.filter((r) => !r.snoozed && r.status === status).sort(byExpected);
  return {
    overdue: awake('overdue'),
    soon: awake('soon'),
    ok: awake('ok'),
    snoozed: reminders.filter((r) => r.snoozed && r.status !== 'unknown').sort(byExpected),
    unknown: reminders.filter((r) => r.status === 'unknown'),
  };
}

export type VehicleBadge = { kind: 'pending'; count: number } | { kind: 'noData' } | { kind: 'ok' };

/** The word beside the Vehicle's name: «N por atender» (overdue, not snoozed), «Sin datos» or «Al día». */
export function vehicleBadge({ overdue, health }: { overdue: number; health: VehicleHealth }): VehicleBadge {
  if (overdue > 0) return { kind: 'pending', count: overdue };
  return health === 'unknown' ? { kind: 'noData' } : { kind: 'ok' };
}

/** «Nada pendiente»: nothing overdue or soon, and no Appointment or hand-written Reminder open. */
export function nothingPending(groups: ReminderGroups, agenda: number) {
  return groups.overdue.length === 0 && groups.soon.length === 0 && agenda === 0;
}

/** The snoozes the Reminder detail offers, in days (the PWA's «Posponer 7 días» and «Posponer 30 días»). */
export const SNOOZE_DAYS = [7, 30] as const;

/**
 * What the detail offers about snoozing: «Reactivar aviso» when it is
 * snoozed, «Posponer» while it is overdue or soon, nothing otherwise.
 */
export function snoozeOffer(reminder: Pick<Reminder, 'snoozed' | 'status'>): 'restore' | 'snooze' | null {
  if (reminder.snoozed) return 'restore';
  return reminder.status === 'overdue' || reminder.status === 'soon' ? 'snooze' : null;
}

/** The `reminder_states` change: snoozed until today + `days`, or cleared with `null`. */
export function snoozePatch(days: number | null, today: string) {
  return { snoozed_until: days == null ? null : addDays(today, days) };
}

/**
 * «Completa tu historial»: the unknown tasks as chips, the ones people know
 * best first (COMMON_TASKS), then the catalog's order; the first `initial`
 * until «Ver N más» (`more`) opens the rest. `dontKnow` counts the «No sé»
 * answers, which the card asks to check at the next Service.
 */
export function historyPrompt(
  unknown: readonly Reminder[],
  tasks: ReadonlyMap<string, Pick<MaintenanceTask, 'sortOrder'>>,
  initial: number,
  showAll: boolean,
) {
  const rank = (code: string) => {
    const i = COMMON_TASKS.indexOf(code);
    return i === -1 ? COMMON_TASKS.length + (tasks.get(code)?.sortOrder ?? 0) : i;
  };
  const ordered = [...unknown].sort((a, b) => rank(a.taskCode) - rank(b.taskCode));
  return {
    shown: showAll ? ordered : ordered.slice(0, initial),
    more: Math.max(0, unknown.length - initial),
    dontKnow: unknown.filter((r) => r.unknownReason === 'dont_know').length,
  };
}

/**
 * «¿Cuándo fue la última vez?»'s rough answers, each remembered as that many
 * months back (the PWA's APPROX): «Hace menos de 1 mes» is today, «Hace más
 * de un año» 15 months back. The words are es.json `reminders.lastDone.ranges.<key>`.
 */
export const LAST_DONE_RANGES = [
  { key: 'underMonth', months: 0 },
  { key: 'oneToThree', months: 2 },
  { key: 'threeToSix', months: 4 },
  { key: 'sixToTwelve', months: 9 },
  { key: 'overYear', months: 15 },
] as const;

export type LastDoneRange = (typeof LAST_DONE_RANGES)[number];

/**
 * The `reminder_states` change for a remembered last time: a rough range or
 * an exact day, with the odometer then when known. It is not a Service and
 * has no Mileage reading (CONTEXT.md → Reminder).
 */
export function rememberedPatch(when: LastDoneRange | string, today: string, reading: number | null) {
  return {
    last_unknown: false,
    remembered_on: typeof when === 'string' ? when : addMonths(today, -when.months),
    remembered_reading: reading == null ? null : Math.round(reading),
  };
}

/** «No sé»: Seibi stops asking and suggests checking it at the next Service. */
export const DONT_KNOW_PATCH = { last_unknown: true, remembered_on: null, remembered_reading: null } as const;

/**
 * The line over Avisos for the Vehicles not shown: the most urgent other
 * Vehicle with something pending leads («Corolla · 2 por atender · y 1
 * más»); unfolded, every other Vehicle, most urgent first, to switch to.
 */
export function otherVehicles(active: VehicleView, vehicles: readonly VehicleView[]) {
  const others = vehicles.filter((v) => v.id !== active.id).sort(byUrgency);
  const pending = others.filter((v) => v.pending > 0);
  return { others, lead: pending[0] ?? null, alsoPending: Math.max(0, pending.length - 1) };
}
