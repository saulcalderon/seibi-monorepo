import { supabase } from '@/lib/supabase';

import { InputError } from '../errors';
import { useGarageMutation } from '../garage/use-garage';

export type RoutineInput = {
  /** Set when editing. */
  id?: string;
  vehicleId: string;
  name: string;
  /** Round trip, in the Vehicle's Odometer measure. */
  roundTripDistance: number;
  daysPerWeek: number;
};

/** The longest round trip a Routine takes, in the Vehicle's Odometer measure. */
const MAX_ROUND_TRIP = 2000;

export function validateRoutine(input: RoutineInput) {
  if (!input.name.trim()) throw new InputError('name', 'routine_name_required');
  if (!(input.roundTripDistance > 0) || input.roundTripDistance > MAX_ROUND_TRIP) {
    throw new InputError('roundTripDistance', 'routine_distance_invalid');
  }
  if (input.daysPerWeek < 1 || input.daysPerWeek > 7) throw new InputError('daysPerWeek', 'routine_days_invalid');
}

export function useSaveRoutine() {
  return useGarageMutation(async (input: RoutineInput) => {
    validateRoutine(input);
    const row = {
      vehicle_id: input.vehicleId,
      name: input.name.trim(),
      round_trip_distance: Math.round(input.roundTripDistance * 10) / 10,
      days_per_week: input.daysPerWeek,
    };
    const { error } = input.id
      ? await supabase.from('routines').update(row).eq('id', input.id)
      : await supabase.from('routines').insert(row);
    if (error) throw error;
  });
}

export function useDeleteRoutine() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) throw error;
  });
}
