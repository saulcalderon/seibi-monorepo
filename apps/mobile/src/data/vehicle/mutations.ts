import { supabase } from '@/lib/supabase';
import { todayIso } from '@/lib/format';

import { invokeFunction } from '../functions';
import { useGarageMutation } from '../garage/use-garage';
import type { VehicleView } from '../garage/types';
import { odometerNumber } from '../mileage/rules';
import { currentUserId } from '../user';

import { validateVehicle, vehicleRow, type VehicleInput } from './rules';
import { vehicleLookupResponse, vehicleRenderResponse } from './schemas';

export function lookUpSchedule(vehicleId: string) {
  return invokeFunction('vehicle-lookup', { vehicleId }, vehicleLookupResponse);
}

export function requestRender(vehicleId: string) {
  return invokeFunction('vehicle-render', { vehicleId }, vehicleRenderResponse);
}

/** Asks the server for the schedule and the render. Failures stay quiet: general schedule, silhouette. */
function refreshVehicleData(vehicleId: string, which: { lookup: boolean; render: boolean }) {
  if (which.lookup) void lookUpSchedule(vehicleId).catch((e: unknown) => console.warn('[vehicle-lookup]', e));
  if (which.render) void requestRender(vehicleId).catch((e: unknown) => console.warn('[vehicle-render]', e));
}

/**
 * Adds a Vehicle, with its first Mileage reading (dated today) when the
 * person knows the odometer. Resolves to the new Vehicle's id.
 */
export function useCreateVehicle() {
  return useGarageMutation(async (input: VehicleInput & { odometer: number | null }) => {
    validateVehicle(input);
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ user_id: userId, ...vehicleRow(input) })
      .select('id')
      .single();
    if (error) throw error;

    if (input.odometer != null) {
      const { error: readingError } = await supabase.from('mileage_readings').insert({
        vehicle_id: data.id,
        reading: odometerNumber(input.odometer, 'odometer'),
        recorded_on: todayIso(),
      });
      if (readingError) throw readingError;
    }

    refreshVehicleData(data.id, { lookup: true, render: true });
    return data.id;
  });
}

export function useUpdateVehicle() {
  return useGarageMutation(async ({ vehicle, input }: { vehicle: VehicleView; input: VehicleInput }) => {
    validateVehicle(input);
    const next = vehicleRow(input);
    const { error } = await supabase.from('vehicles').update(next).eq('id', vehicle.id);
    if (error) throw error;

    const identityChanged =
      next.brand !== vehicle.brand ||
      next.model !== vehicle.model ||
      next.year !== vehicle.year ||
      next.engine !== vehicle.engine;
    const paintChanged = next.color !== vehicle.color;
    refreshVehicleData(vehicle.id, { lookup: identityChanged, render: identityChanged || paintChanged });
  });
}

/** Withdrawn, not destroyed: its Services and readings stay (CONTEXT.md). */
export function useWithdrawVehicle() {
  return useGarageMutation(async (vehicleId: string) => {
    const { error } = await supabase.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', vehicleId);
    if (error) throw error;
  });
}

export function useRestoreVehicle() {
  return useGarageMutation(async (vehicleId: string) => {
    const { error } = await supabase.from('vehicles').update({ deleted_at: null }).eq('id', vehicleId);
    if (error) throw error;
  });
}

/** Asks again for the schedule and the render (for example once the AI keys are set). */
export function useRefreshVehicleData() {
  return useGarageMutation(async (vehicleId: string) => {
    await Promise.allSettled([lookUpSchedule(vehicleId), requestRender(vehicleId)]);
  });
}
