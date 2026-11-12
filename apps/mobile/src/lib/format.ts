// Numbers, money, distances and days as Seibi shows them, ported from the
// PWA's apps/app/src/lib/format.ts. Words come from es.json through `t`, so
// these run outside React (and in the unit tests) too.
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer';
import type { TFunction } from 'i18next';

import { paintLabel } from './paint';

const LOCALE = 'es-SV';

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number) {
  return integer.format(value);
}

export function measureLabel(measure: OdometerMeasure) {
  return measure === 'mi' ? 'mi' : 'km';
}

export function formatDistance(value: number, measure: OdometerMeasure) {
  return `${integer.format(Math.round(value))} ${measureLabel(measure)}`;
}

export function formatUsd(value: number, cents = false) {
  return (cents ? usdCents : usd).format(value);
}

export function formatUsdRange(range: { min: number; max: number } | null | undefined) {
  if (!range) return null;
  if (Math.round(range.min) === Math.round(range.max)) return formatUsd(range.min);
  return `${formatUsd(range.min)} – ${formatUsd(range.max)}`;
}

/** The local calendar day as YYYY-MM-DD (a Mileage reading's or a Service's date). */
export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayToDate(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(day: string, style: 'short' | 'long' = 'short') {
  const date = dayToDate(day);
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function formatMonth(day: string) {
  const date = dayToDate(day);
  const text = date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A span of days without its direction: "5 días", "2 meses", "1 año". */
function span(days: number, t: TFunction) {
  const abs = Math.abs(days);
  if (abs < 45) return t('relative.days', { n: abs });
  if (abs < 330) return t('relative.months', { n: Math.round(abs / 30) });
  const years = Math.round(abs / 365);
  return years === 1 ? t('relative.oneYear') : t('relative.years', { n: years });
}

/** "hoy", "mañana", "en 5 días", "hace 3 días", "en 2 meses". */
export function relativeDays(days: number, t: TFunction) {
  if (days === 0) return t('relative.today');
  if (days === 1) return t('relative.tomorrow');
  if (days === -1) return t('relative.yesterday');
  return days > 0 ? t('relative.in', { span: span(days, t) }) : t('relative.ago', { span: span(days, t) });
}

/** The same, starting a sentence: "En 5 días" (but "hoy", "mañana" as they are). */
export function relativeDaysLead(days: number, t: TFunction) {
  return days > 1 ? t('relative.inCapital', { span: span(days, t) }) : relativeDays(days, t);
}

export function greeting(t: TFunction, now = new Date()) {
  const h = now.getHours();
  if (h < 12) return t('greeting.morning');
  if (h < 19) return t('greeting.afternoon');
  return t('greeting.evening');
}

export function vehicleName(v: { brand: string; model: string }) {
  return `${v.brand} ${v.model}`;
}

type ChoiceVehicle = {
  id: string;
  model: string;
  year: number;
  plate: string | null;
  color: string | null;
  odometer: number | null;
};

/**
 * Short label for a Vehicle picker. Adds the Plate, paint or Mileage only
 * when another Vehicle shares the model and year.
 */
export function vehicleChoiceLabel(vehicle: ChoiceVehicle, vehicles: ChoiceVehicle[], t: TFunction) {
  const twins = vehicles.filter((v) => v.id !== vehicle.id && v.model === vehicle.model && v.year === vehicle.year);
  if (twins.length === 0) return vehicle.model;
  const group = [vehicle, ...twins];
  const plates = group.map((v) => v.plate?.trim() || null);
  if (plates.every(Boolean) && new Set(plates).size === group.length) {
    return `${vehicle.model} · ${vehicle.plate}`;
  }
  const colors = group.map((v) => paintLabel(v.color, t));
  if (colors.every(Boolean) && new Set(colors).size === group.length) {
    return `${vehicle.model} ${paintLabel(vehicle.color, t)}`;
  }
  if (vehicle.odometer != null) return `${vehicle.model} ${formatNumber(vehicle.odometer)}`;
  return `${vehicle.model} ${vehicle.year}`;
}
