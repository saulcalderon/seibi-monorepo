import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import {
  formatDay,
  formatDistance,
  formatMonth,
  formatNumber,
  formatUsd,
  formatUsdRange,
  greeting,
  relativeDays,
  todayIso,
  vehicleChoiceLabel,
  vehicleName,
} from './format';

// Expected strings are what the PWA's apps/app/src/lib/format.ts prints in a
// browser (full ICU). The same strings must show on Hermes: the data check
// screen prints them on the phone (verify skill, features/data-layer.md).

describe('formatUsd', () => {
  it('prints whole dollars like the PWA', () => {
    expect([1234, 75, 0, -40, 1234567, 79.6].map((v) => formatUsd(v))).toEqual([
      '$1,234',
      '$75',
      '$0',
      '-$40',
      '$1,234,567',
      '$80',
    ]);
  });

  it('prints cents when asked', () => {
    expect([1234.5, 75, 0.1].map((v) => formatUsd(v, true))).toEqual(['$1,234.50', '$75.00', '$0.10']);
  });

  it('prints a range, or one price when both ends round the same', () => {
    expect(formatUsdRange({ min: 80, max: 120 })).toBe('$80 – $120');
    expect(formatUsdRange({ min: 80.2, max: 79.8 })).toBe('$80');
    expect(formatUsdRange(null)).toBeNull();
  });
});

describe('numbers and distances', () => {
  it('groups thousands with commas', () => {
    expect([30500, 1234567, 999, 0].map(formatNumber)).toEqual(['30,500', '1,234,567', '999', '0']);
  });

  it('rounds a distance and adds the Odometer measure', () => {
    expect(formatDistance(30500, 'km')).toBe('30,500 km');
    expect(formatDistance(30499.6, 'mi')).toBe('30,500 mi');
  });
});

describe('days', () => {
  it("is today's local calendar day, not the UTC one", () => {
    expect(todayIso(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12');
    expect(todayIso(new Date(2026, 0, 3, 0, 0))).toBe('2026-01-03');
  });

  it('prints a day, with the year only when it is not this year', () => {
    expect(formatDay('2025-01-03')).toBe('3 ene 2025');
    expect(formatDay('2025-01-03', 'long')).toBe('3 de enero de 2025');
    expect(formatMonth('2026-11-12')).toBe('Noviembre de 2026');
  });

  it('says how far a day is in plain Spanish', () => {
    const cases: [number, string][] = [
      [0, 'hoy'],
      [1, 'mañana'],
      [-1, 'ayer'],
      [2, 'en 2 días'],
      [-3, 'hace 3 días'],
      [44, 'en 44 días'],
      [45, 'en 2 meses'],
      [-100, 'hace 3 meses'],
      [329, 'en 11 meses'],
      [330, 'en 1 año'],
      [700, 'en 2 años'],
      [-800, 'hace 2 años'],
    ];
    for (const [days, text] of cases) expect(relativeDays(days, t), String(days)).toBe(text);
  });

  it('greets by the hour', () => {
    expect(greeting(t, new Date(2026, 10, 12, 8))).toBe('Buenos días');
    expect(greeting(t, new Date(2026, 10, 12, 12))).toBe('Buenas tardes');
    expect(greeting(t, new Date(2026, 10, 12, 18, 59))).toBe('Buenas tardes');
    expect(greeting(t, new Date(2026, 10, 12, 19))).toBe('Buenas noches');
  });
});

describe('Vehicle names', () => {
  const corolla = { id: 'a', model: 'Corolla', year: 2020, plate: null, color: null, odometer: null };

  it('names a Vehicle by brand and model', () => {
    expect(vehicleName({ brand: 'Toyota', model: 'Corolla' })).toBe('Toyota Corolla');
  });

  it('uses the model alone when no other Vehicle shares it', () => {
    expect(vehicleChoiceLabel(corolla, [corolla], t)).toBe('Corolla');
  });

  it('tells twins apart by Plate, then paint, then Mileage, then year', () => {
    const plated = [
      { ...corolla, plate: 'P123' },
      { ...corolla, id: 'b', plate: 'P456' },
    ];
    expect(vehicleChoiceLabel(plated[0], plated, t)).toBe('Corolla · P123');

    const painted = [
      { ...corolla, color: 'red' },
      { ...corolla, id: 'b', color: 'blue' },
    ];
    expect(vehicleChoiceLabel(painted[1], painted, t)).toBe('Corolla Azul');

    const read = [
      { ...corolla, odometer: 30500 },
      { ...corolla, id: 'b' },
    ];
    expect(vehicleChoiceLabel(read[0], read, t)).toBe('Corolla 30,500');
    expect(vehicleChoiceLabel(read[1], read, t)).toBe('Corolla 2020');
  });
});
