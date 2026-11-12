import { supabase } from '@/lib/supabase';
import { todayIso } from '@/lib/format';

import { useGarageMutation } from '../garage/use-garage';
import type { VehicleView } from '../garage/types';

import { correctedReading, standaloneReading } from './rules';

/** [+] → update Mileage: a reading dated today, strictly above the current odometer. */
export function useAddReading() {
  return useGarageMutation(async ({ vehicle, reading }: { vehicle: VehicleView; reading: number }) => {
    const next = standaloneReading({ reading, readings: vehicle.readings, measure: vehicle.measure, today: todayIso() });
    const { error } = await supabase
      .from('mileage_readings')
      .insert({ vehicle_id: vehicle.id, reading: next.reading, recorded_on: next.recordedOn });
    if (error) throw error;
    return next;
  });
}

/** A wrong number is corrected, not deleted (CONTEXT.md): any non-negative number. */
export function useCorrectReading() {
  return useGarageMutation(async ({ readingId, reading }: { readingId: string; reading: number }) => {
    const { error } = await supabase
      .from('mileage_readings')
      .update({ reading: correctedReading(reading) })
      .eq('id', readingId);
    if (error) throw error;
  });
}
