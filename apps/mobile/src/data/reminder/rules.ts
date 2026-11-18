// The rules for a hand-written Reminder (the PWA's useSaveManualReminder,
// lib/mutations.ts), apart from the write so they run in the unit tests.
import { InputError } from '../errors';
import { isDay } from '../service/rules';
import { trimmedOrNull } from '../vehicle/rules';

export type ManualReminderInput = {
  /** Set when editing. */
  id?: string;
  vehicleId: string;
  title: string;
  dueOn: string;
  notes: string | null;
};

/** The `reminders` row to write: a title to remember and a calendar day are required, notes are optional. */
export function manualReminderRow(input: ManualReminderInput) {
  if (!input.title.trim()) throw new InputError('title', 'reminder_title_required');
  if (!isDay(input.dueOn)) throw new InputError('dueOn', 'date_required');
  return {
    vehicle_id: input.vehicleId,
    title: input.title.trim(),
    due_on: input.dueOn,
    notes: trimmedOrNull(input.notes),
  };
}
