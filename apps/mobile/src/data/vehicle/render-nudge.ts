import { useEffect } from 'react';

import type { VehicleView } from '../garage/types';

import { requestRender } from './mutations';

/** How often to nudge `vehicle-render` while a poster is being drawn (ARCHITECTURE.md → Model renders). */
const NUDGE_MS = 20_000;

/**
 * While a Model render is generating, calls `vehicle-render` every 20 s: it
 * asks fal itself when the webhook is late or lost. The app shell mounts it
 * once with the garage's Vehicles (the PWA's Actions provider did).
 */
export function useRenderNudge(vehicles: readonly VehicleView[]) {
  const generatingIds = vehicles
    .filter((v) => v.render?.generating)
    .map((v) => v.id)
    .join(',');

  useEffect(() => {
    if (!generatingIds) return;
    const timer = setInterval(() => {
      for (const vehicleId of generatingIds.split(',')) void requestRender(vehicleId).catch(() => undefined);
    }, NUDGE_MS);
    return () => clearInterval(timer);
  }, [generatingIds]);
}
