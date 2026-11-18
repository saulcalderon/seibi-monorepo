// The rules for an Appointment (the PWA's useSaveAppointment,
// lib/mutations.ts at 6e3b818), apart from the write so they run in the
// unit tests.
import { InputError } from '../errors';
import { isDay } from '../service/rules';
import { trimmedOrNull } from '../vehicle/rules';

export type AppointmentInput = {
  /** Set when editing. */
  id?: string;
  vehicleId: string;
  scheduledOn: string;
  shop: string | null;
  notes: string | null;
  taskCodes: string[];
};

/**
 * The `appointments` row to write. A calendar day is required; a new
 * Appointment is for today or later (one already done is a Service), while
 * an edit may keep a day that has passed. Shop and notes are optional.
 */
export function appointmentRow(input: AppointmentInput, today: string) {
  if (!isDay(input.scheduledOn)) throw new InputError('scheduledOn', 'date_required');
  if (!input.id && input.scheduledOn < today) throw new InputError('scheduledOn', 'appointment_date_past');
  return {
    vehicle_id: input.vehicleId,
    scheduled_on: input.scheduledOn,
    shop: trimmedOrNull(input.shop),
    notes: trimmedOrNull(input.notes),
    task_codes: input.taskCodes,
  };
}
