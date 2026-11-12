import { z } from 'zod';

/**
 * `vehicle-lookup`: links the Vehicle to its Maintenance schedule. 202 with
 * the schedule's status, or 200 `unavailable` when the AI key isn't set (the
 * app shows the general schedule).
 */
export const vehicleLookupResponse = z.object({
  scheduleId: z.string().nullable(),
  status: z.enum(['pending', 'ready', 'general', 'failed', 'unavailable']),
});

/**
 * `vehicle-render`: starts or reuses the Model render. 202 `{ renderId }`, or
 * 200 `{ renderId: null, status: 'unavailable' }` when fal isn't set (the
 * Vehicle keeps its silhouette).
 */
export const vehicleRenderResponse = z.object({
  renderId: z.string().nullable(),
  status: z.literal('unavailable').optional(),
});
