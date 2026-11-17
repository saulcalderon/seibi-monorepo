// The Mileage sheet's pure logic, ported from the PWA's MileageBody
// (apps/app/src/forms/SmallForms.tsx): the context line («Yaris 2017 ·
// último: 31,870 km · hace 12 días»), the field's digits-only sanitising,
// the +N bump chips and the save button's label.
import type { TFunction } from 'i18next';

import type { VehicleView } from '@/data/garage/types';
import { formatNumber, isoDate, measureLabel, relativeDays } from '@/lib/format';

/** The bump chips, as the PWA lists them. */
export const MILEAGE_BUMPS = [100, 500, 1000] as const;
/** The PWA caps the field at 7 digits. */
export const MILEAGE_MAX_DIGITS = 7;

/** Digits only, no leading zeros, at most 7 («0 4,5abc00» → «4500»). */
export function mileageDigits(typed: string): string {
  return typed
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, MILEAGE_MAX_DIGITS);
}

/** A bump chip's target: what was typed, else the current odometer, else 0, plus n. */
export function bumpedReading(reading: number | null, odometer: number | null, bump: number): number {
  return (reading ?? odometer ?? 0) + bump;
}

/**
 * «Yaris 2015 · último: 52,000 km · hace 4 días». With a reading but no date
 * the «hace…» part is dropped; with no readings at all, «sin registros todavía».
 */
export function mileageContext(vehicle: Pick<VehicleView, 'model' | 'year' | 'odometer' | 'odometerOn' | 'measure'>, t: TFunction, today = isoDate()) {
  const name = `${vehicle.model} ${vehicle.year}`;
  if (vehicle.odometer == null) return t('mileage.contextNone', { name });
  const last = `${formatNumber(vehicle.odometer)} ${measureLabel(vehicle.measure)}`;
  if (!vehicle.odometerOn) return t('mileage.contextLast', { name, last });
  const days = Math.round((Date.parse(today) - Date.parse(vehicle.odometerOn)) / 86_400_000);
  return t('mileage.contextWhen', { name, last, when: relativeDays(-Math.max(0, days), t) });
}
