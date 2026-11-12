import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer';
import type { TFunction } from 'i18next';

import type { Database } from '@/lib/database.types';

export type Country = Database['public']['Enums']['country_code'];

/** The countries Seibi prices Estimates in. Names live in es.json (`countries.<id>`). */
export const COUNTRIES: { id: Country; flag: string }[] = [
  { id: 'SV', flag: '🇸🇻' },
  { id: 'US', flag: '🇺🇸' },
];

export function countryName(id: Country, t: TFunction) {
  return t(`countries.${id}`);
}

/** New Vehicles default to the measure on the dashboards sold in each country. */
export function defaultMeasure(country: Country | null | undefined): OdometerMeasure {
  return country === 'US' ? 'mi' : 'km';
}
