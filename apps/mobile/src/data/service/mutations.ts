import { supabase } from '@/lib/supabase';
import { todayIso } from '@/lib/format';

import { useGarageMutation } from '../garage/use-garage';
import { serviceReading } from '../mileage/rules';
import { currentUserId } from '../user';
import { trimmedOrNull } from '../vehicle/rules';

import { validateService, type ServiceInput } from './rules';

/** Invoice photos, under `<user id>/<service id>/`. Uploading one arrives with S12. */
const INVOICES = 'service-invoices';

/**
 * Records a Service with its Mileage reading (any number, dated the Service's
 * day) and its Service items. Editing replaces the items and updates the
 * reading's number. A Service answers «No sé» and clears a snooze for its
 * tasks, and completes the Appointment it came from. Resolves to its id.
 * The invoice photo is not written here yet: S12 adds it with the camera.
 */
export function useSaveService() {
  return useGarageMutation(async (input: ServiceInput) => {
    validateService(input, todayIso());
    await currentUserId();
    const reading = serviceReading({ reading: input.reading, performedOn: input.performedOn });
    const fields = {
      type: input.type,
      performed_on: input.performedOn,
      shop: trimmedOrNull(input.shop),
      notes: trimmedOrNull(input.notes),
      total_cost: input.totalCost,
    };
    let serviceId = input.serviceId;

    if (!serviceId) {
      // The reading goes first: the Service points at it.
      const { data: r, error: rErr } = await supabase
        .from('mileage_readings')
        .insert({ vehicle_id: input.vehicleId, reading: reading.reading, recorded_on: reading.recordedOn })
        .select('id')
        .single();
      if (rErr) throw rErr;
      const { data: s, error: sErr } = await supabase
        .from('services')
        .insert({ vehicle_id: input.vehicleId, mileage_reading_id: r.id, ...fields })
        .select('id')
        .single();
      if (sErr) throw sErr;
      serviceId = s.id;
    } else {
      if (input.readingId) {
        const { error } = await supabase.from('mileage_readings').update({ reading: reading.reading }).eq('id', input.readingId);
        if (error) throw error;
      }
      const { error } = await supabase.from('services').update(fields).eq('id', serviceId);
      if (error) throw error;
      const { error: delErr } = await supabase.from('service_items').delete().eq('service_id', serviceId);
      if (delErr) throw delErr;
    }
    const id = serviceId;

    const { error: itemsErr } = await supabase.from('service_items').insert(
      input.items.map((i) => ({
        service_id: id,
        task_code: i.taskCode,
        name: i.name.trim(),
        cost: i.cost,
        part_brand: trimmedOrNull(i.partBrand),
        part_number: trimmedOrNull(i.partNumber),
      })),
    );
    if (itemsErr) throw itemsErr;

    const codes = input.items.map((i) => i.taskCode).filter((c): c is string => Boolean(c));
    if (codes.length > 0) {
      await supabase
        .from('reminder_states')
        .update({ last_unknown: false, snoozed_until: null })
        .eq('vehicle_id', input.vehicleId)
        .in('task_code', codes);
    }

    if (input.appointmentId) {
      const { error } = await supabase.from('appointments').update({ service_id: id }).eq('id', input.appointmentId);
      if (error) throw error;
    }
    return id;
  });
}

/** Withdraws a Service; its Mileage reading stays (CONTEXT.md). */
export function useWithdrawService() {
  return useGarageMutation(async (serviceId: string) => {
    const { error } = await supabase.from('services').update({ deleted_at: new Date().toISOString() }).eq('id', serviceId);
    if (error) throw error;
  });
}

/** A link to the invoice photo that works for five minutes. */
export async function invoiceUrl(path: string) {
  const { data, error } = await supabase.storage.from(INVOICES).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
