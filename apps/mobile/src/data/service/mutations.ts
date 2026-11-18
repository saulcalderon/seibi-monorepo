import { randomUUID } from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import { isoDate } from '@/lib/format';

import { useGarageMutation } from '../garage/use-garage';
import { serviceReading } from '../mileage/rules';
import { currentUserId } from '../user';
import { trimmedOrNull } from '../vehicle/rules';

import { checkInvoiceSize, INVOICE_BUCKET, invoiceFile, invoicePath, type InvoicePhoto } from './invoice';
import { validateService, type ServiceInput } from './rules';


/** Uploads an invoice photo for a Service and resolves to its path in the bucket. */
async function uploadInvoice(userId: string, serviceId: string, photo: InvoicePhoto) {
  // React Native's fetch reads a local file; Supabase's docs upload Expo images the same way.
  const body = await (await fetch(photo.uri)).arrayBuffer();
  checkInvoiceSize(body.byteLength);
  const path = invoicePath({ userId, serviceId, photo, now: Date.now() });
  const { error } = await supabase.storage.from(INVOICE_BUCKET).upload(path, body, { contentType: invoiceFile(photo).contentType, upsert: false });
  if (error) throw error;
  return path;
}

/** Deletes an invoice file no Service points at. A failure only leaves the file behind. */
async function removeInvoice(path: string) {
  const { error } = await supabase.storage.from(INVOICE_BUCKET).remove([path]);
  if (error) console.warn('[invoice] a file no Service points at stays in the bucket', error.message);
}

/**
 * Records a Service with its Mileage reading (any number, dated the Service's
 * day) and its Service items. Editing replaces the items and updates the
 * reading's number. A Service answers «No sé» and clears a snooze for its
 * tasks, and completes the Appointment it came from. Resolves to its id.
 *
 * The invoice photo (S12) is uploaded before anything is written: a new
 * Service gets its id here so its photo has a folder, and a failed upload
 * leaves nothing saved, so «Guardar» again can't record the Service twice
 * for it. When the Service's own row then fails, the new photo is deleted
 * again. The file the Service stops pointing at (replaced or removed) is
 * deleted last; if that fails, the Service is still right and only the
 * file stays.
 */
export function useSaveService() {
  return useGarageMutation(async (input: ServiceInput) => {
    validateService(input, isoDate());
    const userId = await currentUserId();
    const reading = serviceReading({ reading: input.reading, performedOn: input.performedOn });
    const isNew = !input.serviceId;
    const id = input.serviceId ?? randomUUID();
    const invoice = input.invoice ?? null;
    const uploaded = invoice?.upload ? await uploadInvoice(userId, id, invoice.upload) : null;
    const fields = {
      type: input.type,
      performed_on: input.performedOn,
      shop: trimmedOrNull(input.shop),
      notes: trimmedOrNull(input.notes),
      total_cost: input.totalCost,
      ...(invoice ? { invoice_path: uploaded } : {}),
    };

    try {
      if (isNew) {
        // The reading goes first: the Service points at it.
        const { data: r, error: rErr } = await supabase
          .from('mileage_readings')
          .insert({ vehicle_id: input.vehicleId, reading: reading.reading, recorded_on: reading.recordedOn })
          .select('id')
          .single();
        if (rErr) throw rErr;
        const { error: sErr } = await supabase.from('services').insert({ id, vehicle_id: input.vehicleId, mileage_reading_id: r.id, ...fields });
        if (sErr) throw sErr;
      } else {
        if (input.readingId) {
          const { error } = await supabase.from('mileage_readings').update({ reading: reading.reading }).eq('id', input.readingId);
          if (error) throw error;
        }
        const { error } = await supabase.from('services').update(fields).eq('id', id);
        if (error) throw error;
      }
    } catch (error) {
      // The Service doesn't point at the new photo: take it back out of the bucket.
      if (uploaded) await removeInvoice(uploaded);
      throw error;
    }
    if (!isNew) {
      const { error } = await supabase.from('service_items').delete().eq('service_id', id);
      if (error) throw error;
    }

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
      const { error } = await supabase
        .from('reminder_states')
        .update({ last_unknown: false, snoozed_until: null })
        .eq('vehicle_id', input.vehicleId)
        .in('task_code', codes);
      if (error) throw error;
    }

    if (input.appointmentId) {
      const { error } = await supabase.from('appointments').update({ service_id: id }).eq('id', input.appointmentId);
      if (error) throw error;
    }

    if (invoice?.remove) await removeInvoice(invoice.remove);
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
