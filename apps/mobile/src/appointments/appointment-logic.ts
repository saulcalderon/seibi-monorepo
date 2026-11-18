// The decisions of «Agendar Cita» as plain functions, so they run in the
// unit tests (the form is src/appointments/appointment-form.tsx).
import type { Reminder } from '@seibi/maintenance-engine/reminders';

import { orderedTaskCodes, type MaintenanceTask } from '@/data/task/catalog';

/** How many task chips «¿Para qué es?» offers, as the PWA's. */
export const TASK_CHOICES = 14;

/**
 * The Maintenance tasks «¿Para qué es?» offers: the ones the form was opened
 * for (a Reminder's «Agendar»), then the Vehicle's overdue and soon ones,
 * then the common ones and the catalog, 14 at most. The PWA left the
 * opened-for task out when it fell past the 14, so a chosen chip could not
 * be seen or turned off.
 */
export function taskChoices({
  reminders,
  openedWith,
  tasks,
}: {
  reminders: readonly Pick<Reminder, 'taskCode' | 'status'>[];
  openedWith: readonly string[];
  tasks: readonly MaintenanceTask[];
}) {
  const due = reminders.filter((r) => r.status === 'overdue' || r.status === 'soon').map((r) => r.taskCode);
  return orderedTaskCodes([...openedWith, ...due], tasks).slice(0, TASK_CHOICES);
}
