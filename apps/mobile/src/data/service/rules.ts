import { InputError } from '../errors';
import type { ServiceType } from '../garage/types';
import { odometerNumber } from '../mileage/rules';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type ServiceItemInput = {
  taskCode: string | null;
  name: string;
  cost: number | null;
  partBrand?: string | null;
  partNumber?: string | null;
};

export type ServiceInput = {
  vehicleId: string;
  /** Set when editing. */
  serviceId?: string;
  readingId?: string;
  type: ServiceType;
  performedOn: string;
  /** The Service's Mileage reading: any number (backfill). */
  reading: number;
  shop: string | null;
  notes: string | null;
  totalCost: number | null;
  items: ServiceItemInput[];
  /** The Appointment this Service completes. */
  appointmentId?: string | null;
};

export function validateService(input: ServiceInput, today: string) {
  if (!DAY.test(input.performedOn)) throw new InputError('performedOn', 'date_required');
  if (input.performedOn > today) throw new InputError('performedOn', 'service_date_future');
  odometerNumber(input.reading);
  if (input.items.length === 0) throw new InputError('items', 'service_items_required');
  if (input.totalCost != null && (!Number.isFinite(input.totalCost) || input.totalCost < 0)) {
    throw new InputError('totalCost', 'cost_invalid');
  }
}

export function isDay(value: string) {
  return DAY.test(value);
}
