// The Mileage write rules (ARCHITECTURE.md → Domain rules; CONTEXT.md →
// Mileage). They live in the app, not in Postgres: a Service writes its
// reading first, so a trigger could not tell a backfill from an update.
//
// - A reading recorded with a Service may be any number (backfill).
// - A standalone reading is dated today and must be strictly greater than
//   the current odometer; with no current odometer, any non-negative number.
// - A correction may set any non-negative number.
// - The current odometer is the reading for the latest calendar date, then
//   the highest number (`currentOdometer` in the shared engine).
import { currentOdometer, type MileageReading, type OdometerMeasure } from '@seibi/maintenance-engine/odometer';

import { formatDistance } from '@/lib/format';

import { InputError } from '../errors';

/** A whole odometer number of zero or more, as it is stored. */
export function odometerNumber(value: number, field = 'reading'): number {
  if (!Number.isFinite(value) || value < 0) throw new InputError(field, 'number_invalid');
  return Math.round(value);
}

/** A reading recorded on its own ([+] → update Mileage): dated today, above the current odometer. */
export function standaloneReading(input: {
  reading: number;
  readings: readonly MileageReading[];
  measure: OdometerMeasure;
  today: string;
}): MileageReading {
  const reading = odometerNumber(input.reading);
  const current = currentOdometer(input.readings);
  if (current && reading <= current.reading) {
    throw new InputError('reading', 'reading_not_above_current', {
      current: formatDistance(current.reading, input.measure),
    });
  }
  return { reading, recordedOn: input.today };
}

/** The reading recorded with a Service: any number (backfill), dated the Service's day. */
export function serviceReading(input: { reading: number; performedOn: string }): MileageReading {
  return { reading: odometerNumber(input.reading), recordedOn: input.performedOn };
}

/** A wrong number is corrected, not deleted: any non-negative number. */
export function correctedReading(reading: number): number {
  return odometerNumber(reading);
}
