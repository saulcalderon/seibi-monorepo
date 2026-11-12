import { supabase } from '@/lib/supabase';
import { todayIso } from '@/lib/format';

import { InputError } from '../errors';
import { useGarageMutation } from '../garage/use-garage';
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

/** A new Appointment is for today or later; one already done is a Service. */
export function validateAppointment(input: AppointmentInput, today: string) {
  if (!isDay(input.scheduledOn)) throw new InputError('scheduledOn', 'date_required');
  if (!input.id && input.scheduledOn < today) throw new InputError('scheduledOn', 'appointment_date_past');
}

export function useSaveAppointment() {
  return useGarageMutation(async (input: AppointmentInput) => {
    validateAppointment(input, todayIso());
    const row = {
      vehicle_id: input.vehicleId,
      scheduled_on: input.scheduledOn,
      shop: trimmedOrNull(input.shop),
      notes: trimmedOrNull(input.notes),
      task_codes: input.taskCodes,
    };
    const { error } = input.id
      ? await supabase.from('appointments').update(row).eq('id', input.id)
      : await supabase.from('appointments').insert(row);
    if (error) throw error;
  });
}

export function useCancelAppointment() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase.from('appointments').update({ canceled_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  });
}
