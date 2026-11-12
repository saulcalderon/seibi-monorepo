import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer';

import { InputError } from '../errors';

export type VehicleInput = {
  brand: string;
  model: string;
  year: number;
  plate: string | null;
  engine: string | null;
  trimLevel: string | null;
  color: string | null;
  measure: OdometerMeasure;
};

/** The first model year the Vehicle form offers. */
export const FIRST_MODEL_YEAR = 1950;

export function validateVehicle(input: VehicleInput, now = new Date()) {
  if (!input.brand.trim()) throw new InputError('brand', 'brand_required');
  if (!input.model.trim()) throw new InputError('model', 'model_required');
  const maxYear = now.getFullYear() + 1;
  if (!Number.isInteger(input.year) || input.year < FIRST_MODEL_YEAR || input.year > maxYear) {
    throw new InputError('year', 'year_invalid');
  }
}

/** A Plate as stored: capitals, digits and dashes, at most 12. */
export function sanitizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
}

export function trimmedOrNull(value: string | null | undefined) {
  const t = (value ?? '').trim();
  return t.length > 0 ? t : null;
}

/** The `vehicles` columns the Vehicle form writes. */
export function vehicleRow(input: VehicleInput) {
  return {
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    plate: trimmedOrNull(input.plate ? sanitizePlate(input.plate) : null),
    engine: trimmedOrNull(input.engine),
    trim_level: trimmedOrNull(input.trimLevel),
    color: input.color,
    odometer_measure: input.measure,
  };
}
