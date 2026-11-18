// The decisions of «Agendar Cita» as plain functions, so they run in the
// unit tests (the form is src/appointments/appointment-form.tsx).
import type { Reminder } from '@seibi/maintenance-engine/reminders';

import { orderedTaskCodes, type MaintenanceTask } from '@/data/task/catalog';

/** How many task chips «¿Para qué es?» offers, as the PWA's. */
export const TASK_CHOICES = 14;

/**
 * The Maintenance tasks «¿Para qué es?» offers: the ones the form was opened
 * for (a Reminder's «Agendar»), then the Vehicle's overdue and soon ones,
 * then the common ones and the catalog, 14 at most; any other chosen one
 * (after the Vehicle changed under it) follows them. The PWA could leave a
 * chosen task past the 14, where its chip could not be seen or turned off.
 * The order never moves as chips are tapped: only `openedWith` and the
 * Vehicle's Reminders set it.
 */
export function taskChoices({
  reminders,
  openedWith,
  chosen = [],
  tasks,
}: {
  reminders: readonly Pick<Reminder, 'taskCode' | 'status'>[];
  openedWith: readonly string[];
  chosen?: readonly string[];
  tasks: readonly MaintenanceTask[];
}) {
  const due = reminders.filter((r) => r.status === 'overdue' || r.status === 'soon').map((r) => r.taskCode);
  const shown = orderedTaskCodes([...openedWith, ...due], tasks).slice(0, TASK_CHOICES);
  const known = new Set(tasks.map((t) => t.code));
  return [...shown, ...chosen.filter((code) => known.has(code) && !shown.includes(code))];
}

/** Whether two sets of chosen tasks are the same, whatever order they were tapped in. */
export function sameTasks(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((code) => b.includes(code));
}
