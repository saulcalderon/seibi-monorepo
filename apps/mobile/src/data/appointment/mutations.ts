import { supabase } from '@/lib/supabase';
import { isoDate } from '@/lib/format';

import { useGarageMutation } from '../garage/use-garage';

import { appointmentRow, type AppointmentInput } from './rules';

export type { AppointmentInput } from './rules';

/** Saves an Appointment (`appointmentRow` holds the rules); `id` edits one. */
export function useSaveAppointment() {
  return useGarageMutation(async (input: AppointmentInput) => {
    const row = appointmentRow(input, isoDate());
    const { error } = input.id
      ? await supabase.from('appointments').update(row).eq('id', input.id)
      : await supabase.from('appointments').insert(row);
    if (error) throw error;
  });
}

/** Cancels an Appointment: the row stays with `canceled_at`, and leaves Avisos and the Vehicle detail. */
export function useCancelAppointment() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase.from('appointments').update({ canceled_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  });
}
