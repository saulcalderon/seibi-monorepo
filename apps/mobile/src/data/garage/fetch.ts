// The one request behind every Vehicle screen: each Vehicle with everything
// on it, as in the PWA's lib/garage.ts. Columns are typed by the generated
// Supabase types. The 3D model's `glb_path` is not read: the native app has
// no 3D (SEI-48).
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

import type { RenderInfo, ScheduleSource, VehicleRecord } from './types';

const SELECT = `
  id, brand, model, year, plate, engine, trim_level, color, body_type, odometer_measure,
  deleted_at, created_at,
  readings:mileage_readings(id, reading, recorded_on),
  services(
    id, type, performed_on, shop, notes, total_cost, invoice_path, deleted_at, mileage_reading_id,
    reading:mileage_readings(reading),
    items:service_items(id, task_code, name, cost, part_brand, part_number)
  ),
  routines(id, name, round_trip_distance, days_per_week),
  states:reminder_states(task_code, last_unknown, snoozed_until, remembered_on, remembered_reading),
  reminders(id, title, notes, due_on, done_at, deleted_at),
  appointments(id, scheduled_on, shop, notes, task_codes, service_id, canceled_at),
  schedule:maintenance_schedules(
    id, status, has_severe, summary, sources,
    items:maintenance_schedule_items(task_code, distance_km, months, severe_distance_km, severe_months)
  ),
  render:model_renders(status, poster_path)
`;

/** `maintenance_schedules.sources` is JSON written by `vehicle-lookup`: checked, empty when it isn't a list of links. */
const scheduleSources = z.array(z.object({ title: z.string(), url: z.string() }));

function sourcesOf(value: unknown): ScheduleSource[] {
  const parsed = scheduleSources.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function publicRenderUrl(path: string | null | undefined) {
  if (!path) return null;
  return supabase.storage.from('vehicle-renders').getPublicUrl(path).data.publicUrl;
}

/** One object for a to-one embed, whichever way PostgREST's types describe it. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchGarage(userId: string): Promise<VehicleRecord[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((v): VehicleRecord => {
    const schedule = one(v.schedule);
    const render = one(v.render);
    return {
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plate: v.plate,
      engine: v.engine,
      trimLevel: v.trim_level,
      color: v.color,
      bodyType: v.body_type,
      measure: v.odometer_measure,
      withdrawnAt: v.deleted_at,
      createdAt: v.created_at,
      readings: (v.readings ?? []).map((r) => ({ id: r.id, reading: r.reading, recordedOn: r.recorded_on })),
      services: (v.services ?? [])
        .filter((s) => !s.deleted_at)
        .map((s) => ({
          id: s.id,
          type: s.type,
          performedOn: s.performed_on,
          shop: s.shop,
          notes: s.notes,
          totalCost: s.total_cost,
          invoicePath: s.invoice_path,
          readingId: s.mileage_reading_id,
          reading: one(s.reading)?.reading ?? null,
          items: (s.items ?? []).map((i) => ({
            id: i.id,
            taskCode: i.task_code,
            name: i.name,
            cost: i.cost,
            partBrand: i.part_brand,
            partNumber: i.part_number,
          })),
        }))
        // Newest first; on one day, the highest reading first.
        .sort((a, b) =>
          a.performedOn === b.performedOn ? (b.reading ?? 0) - (a.reading ?? 0) : a.performedOn < b.performedOn ? 1 : -1,
        ),
      routines: (v.routines ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        roundTripDistance: Number(r.round_trip_distance),
        daysPerWeek: r.days_per_week,
      })),
      states: (v.states ?? []).map((s) => ({
        taskCode: s.task_code,
        lastUnknown: s.last_unknown,
        snoozedUntil: s.snoozed_until,
        rememberedOn: s.remembered_on,
        rememberedReading: s.remembered_reading,
      })),
      manualReminders: (v.reminders ?? [])
        .filter((r) => !r.deleted_at)
        .map((r) => ({ id: r.id, title: r.title, notes: r.notes, dueOn: r.due_on, doneAt: r.done_at })),
      appointments: (v.appointments ?? []).map((a) => ({
        id: a.id,
        scheduledOn: a.scheduled_on,
        shop: a.shop,
        notes: a.notes,
        taskCodes: a.task_codes ?? [],
        serviceId: a.service_id,
        canceledAt: a.canceled_at,
      })),
      schedule: schedule
        ? {
            id: schedule.id,
            status: schedule.status,
            hasSevere: schedule.has_severe,
            summary: schedule.summary,
            sources: sourcesOf(schedule.sources),
            items: (schedule.items ?? []).map((i) => ({
              taskCode: i.task_code,
              distanceKm: i.distance_km,
              months: i.months,
              severeDistanceKm: i.severe_distance_km,
              severeMonths: i.severe_months,
            })),
          }
        : null,
      render: render ? renderInfo(render.status, render.poster_path) : null,
    };
  });
}

function renderInfo(status: RenderInfo['status'], posterPath: string | null): RenderInfo {
  // `poster_ready` is left over from the 3D pipeline: its poster is the whole
  // render now, so only `pending` is still being drawn.
  return { status, posterUrl: publicRenderUrl(posterPath), generating: status === 'pending' };
}
