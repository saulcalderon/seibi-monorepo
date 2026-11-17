// The Vehicle form's rules, in Zod: what the person typed becomes the
// `VehicleInput` the data layer writes, or an `InputError` on the first field
// that breaks a rule. The rules are the PWA's (`validateVehicle` in
// apps/app/src/lib/mutations.ts), and the mutation checks them again.
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer';
import { z } from 'zod';

import { InputError, type InputCode } from '@/data/errors';
import { FIRST_MODEL_YEAR, sanitizePlate, trimmedOrNull, type VehicleInput } from '@/data/vehicle/rules';
import { PAINT_CODES, type PaintCode } from '@/lib/paint';

/** What the form holds while the person fills it in. */
export type VehicleDraft = {
  brand: string;
  year: number | null;
  model: string;
  engine: string;
  trimLevel: string;
  color: PaintCode | null;
  plate: string;
  measure: OdometerMeasure;
  /** Kilometraje actual, asked only when adding a Vehicle. */
  odometer: number | null;
};

/** The longest engine or trim the form takes (the PWA's `maxLength`). */
export const FREE_TEXT_MAX = 60;

/** The codes these rules raise, each with its message in es.json under `errors.<code>`. */
const RULE_CODES = ['brand_required', 'year_invalid', 'model_required', 'number_invalid'] as const satisfies readonly InputCode[];

const code = (value: (typeof RULE_CODES)[number]) => ({ error: value });

function draftSchema(now: Date) {
  return z.object({
    brand: z.string().trim().min(1, code('brand_required')),
    year: z
      .number(code('year_invalid'))
      .int(code('year_invalid'))
      .min(FIRST_MODEL_YEAR, code('year_invalid'))
      .max(now.getFullYear() + 1, code('year_invalid')),
    model: z.string().trim().min(1, code('model_required')),
    engine: z.string().max(FREE_TEXT_MAX),
    trimLevel: z.string().max(FREE_TEXT_MAX),
    color: z.enum(PAINT_CODES).nullable(),
    plate: z.string(),
    measure: z.enum(['km', 'mi']),
    odometer: z.number(code('number_invalid')).int(code('number_invalid')).nonnegative(code('number_invalid')).nullable(),
  });
}

/** An empty form: no brand, model or year yet, in the measure the person's country uses. */
export function emptyDraft(measure: OdometerMeasure): VehicleDraft {
  return { brand: '', year: null, model: '', engine: '', trimLevel: '', color: null, plate: '', measure, odometer: null };
}

/** A Vehicle's stored values, to edit them. */
export function draftFrom(vehicle: VehicleInput): VehicleDraft {
  return {
    brand: vehicle.brand,
    year: vehicle.year,
    model: vehicle.model,
    engine: vehicle.engine ?? '',
    trimLevel: vehicle.trimLevel ?? '',
    color: PAINT_CODES.find((paint) => paint === vehicle.color) ?? null,
    plate: vehicle.plate ?? '',
    measure: vehicle.measure,
    odometer: null,
  };
}

/** Whether anything differs from where the form started (so closing it asks first). */
export function draftChanged(a: VehicleDraft, b: VehicleDraft) {
  return (Object.keys(a) as (keyof VehicleDraft)[]).some((key) => a[key] !== b[key]);
}

/**
 * Checks the draft and returns what to save. Throws an `InputError` naming
 * the first field that breaks a rule (`brand`, `year`, `model`, `odometer`).
 */
export function parseDraft(draft: VehicleDraft, now = new Date()): { input: VehicleInput; odometer: number | null } {
  const result = draftSchema(now).safeParse(draft);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = String(issue?.path[0] ?? 'form');
    // Every rule above names its code; a value the form can't produce (an engine past
    // `maxLength`, a paint Seibi doesn't know) falls back to the generic number code.
    const known = RULE_CODES.find((rule) => rule === issue?.message);
    throw new InputError(field, known ?? 'number_invalid');
  }
  const value = result.data;
  return {
    input: {
      brand: value.brand,
      model: value.model,
      year: value.year,
      plate: trimmedOrNull(value.plate ? sanitizePlate(value.plate) : null),
      engine: trimmedOrNull(value.engine),
      trimLevel: trimmedOrNull(value.trimLevel),
      color: value.color,
      measure: value.measure,
    },
    odometer: value.odometer,
  };
}
