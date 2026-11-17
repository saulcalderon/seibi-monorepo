import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import { bumpedReading, mileageContext, mileageDigits, MILEAGE_BUMPS } from './mileage-logic';

const YARIS = { model: 'Yaris', year: 2015, odometer: 52000, odometerOn: '2026-11-13', measure: 'km' as const };

describe('mileageDigits', () => {
  it('keeps digits only, drops leading zeros and caps at 7 digits', () => {
    expect(mileageDigits('45,000')).toBe('45000');
    expect(mileageDigits('0 4,5abc00')).toBe('4500');
    expect(mileageDigits('000')).toBe('0');
    expect(mileageDigits('12345678')).toBe('1234567');
    expect(mileageDigits('')).toBe('');
  });
});

describe('bumpedReading', () => {
  it('adds n to the typed number, else the odometer, else 0', () => {
    expect(bumpedReading(52010, 52000, 500)).toBe(52510);
    expect(bumpedReading(null, 52000, 100)).toBe(52100);
    expect(bumpedReading(null, null, 1000)).toBe(1000);
  });

  it('stays inside the 7-digit cap once sanitised, as the form routes it', () => {
    expect(mileageDigits(String(bumpedReading(9999999, 9999999, 1000)))).toBe('1000099');
  });
});

describe('mileageContext', () => {
  it('names the Vehicle, the last reading and how long ago', () => {
    expect(mileageContext(YARIS, t, '2026-11-17')).toBe('Yaris 2015 · último: 52,000 km · hace 4 días');
  });

  it('says «hoy» when the last reading is today and never counts the future', () => {
    expect(mileageContext(YARIS, t, '2026-11-13')).toBe('Yaris 2015 · último: 52,000 km · hoy');
    expect(mileageContext({ ...YARIS, odometerOn: '2026-11-20' }, t, '2026-11-17')).toBe('Yaris 2015 · último: 52,000 km · hoy');
  });

  it('drops the date part when the reading has none, and says «sin registros» with none', () => {
    expect(mileageContext({ ...YARIS, odometerOn: null }, t, '2026-11-17')).toBe('Yaris 2015 · último: 52,000 km');
    expect(mileageContext({ ...YARIS, odometer: null, odometerOn: null }, t, '2026-11-17')).toBe('Yaris 2015 · sin registros todavía');
  });

  it('uses the Vehicle’s measure', () => {
    expect(mileageContext({ ...YARIS, measure: 'mi' }, t, '2026-11-17')).toBe('Yaris 2015 · último: 52,000 mi · hace 4 días');
  });
});

describe('MILEAGE_BUMPS', () => {
  it('is the PWA’s +100, +500, +1,000', () => {
    expect([...MILEAGE_BUMPS]).toEqual([100, 500, 1000]);
  });
});
