import { describe, expect, it } from 'vitest';

import { errorCode, errorMessage, InputError } from '../errors';
import { t } from '../test-i18n';

import { correctedReading, serviceReading, standaloneReading } from './rules';

// The Mileage write rules (ARCHITECTURE.md → Domain rules, CONTEXT.md →
// Mileage). The cases follow the PWA's journey in apps/app/e2e/flows.spec.ts
// ("must be higher than the current odometer": 29,000 refused over 30,000,
// 30,500 saved) and the engine's currentOdometer tests.

const TODAY = '2026-11-12';

function refusal(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the reading to be refused');
}

describe('a standalone reading', () => {
  const readings = [{ reading: 30000, recordedOn: '2026-11-01' }];

  it('is saved when it is above the current odometer, dated today', () => {
    expect(standaloneReading({ reading: 30500, readings, measure: 'km', today: TODAY })).toEqual({
      reading: 30500,
      recordedOn: TODAY,
    });
  });

  it('is refused below the current odometer, saying what the current one is', () => {
    const error = refusal(() => standaloneReading({ reading: 29000, readings, measure: 'km', today: TODAY }));
    expect(error).toBeInstanceOf(InputError);
    expect((error as InputError).field).toBe('reading');
    expect(errorMessage(error, t)).toBe('Debe ser mayor que el último registro (30,000 km).');
  });

  it('is refused when it equals the current odometer: it must be strictly above', () => {
    const error = refusal(() => standaloneReading({ reading: 30000, readings, measure: 'km', today: TODAY }));
    expect(errorCode(error)).toBe('reading_not_above_current');
  });

  it('is compared after rounding, as it is stored', () => {
    const error = refusal(() => standaloneReading({ reading: 30000.4, readings, measure: 'km', today: TODAY }));
    expect(errorCode(error)).toBe('reading_not_above_current');
    expect(standaloneReading({ reading: 30000.6, readings, measure: 'km', today: TODAY }).reading).toBe(30001);
  });

  it("is compared with the latest day's reading, not the highest number ever recorded", () => {
    // A Service backfilled 50,000 on New Year's; the latest day says 48,500.
    const history = [
      { reading: 50000, recordedOn: '2026-01-01' },
      { reading: 48000, recordedOn: '2026-02-01' },
      { reading: 48500, recordedOn: '2026-02-01' },
    ];
    expect(standaloneReading({ reading: 49000, readings: history, measure: 'km', today: TODAY }).reading).toBe(49000);
    const error = refusal(() => standaloneReading({ reading: 48500, readings: history, measure: 'mi', today: TODAY }));
    expect(errorMessage(error, t)).toBe('Debe ser mayor que el último registro (48,500 mi).');
  });

  it('may be any non-negative number when the Vehicle has no readings yet', () => {
    expect(standaloneReading({ reading: 0, readings: [], measure: 'km', today: TODAY })).toEqual({
      reading: 0,
      recordedOn: TODAY,
    });
  });

  it('must be a number of zero or more', () => {
    for (const reading of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const error = refusal(() => standaloneReading({ reading, readings: [], measure: 'km', today: TODAY }));
      expect(errorMessage(error, t), String(reading)).toBe('Escribe un número válido.');
    }
  });
});

describe('a reading recorded with a Service', () => {
  it('may be any number, even below the current odometer (backfill)', () => {
    // The current odometer is 30,000; an old Service at 12,000 still saves.
    expect(serviceReading({ reading: 12000, performedOn: '2025-03-04' })).toEqual({
      reading: 12000,
      recordedOn: '2025-03-04',
    });
  });

  it("is dated the Service's day, not today", () => {
    expect(serviceReading({ reading: 30600, performedOn: '2026-10-30' }).recordedOn).toBe('2026-10-30');
  });

  it('must be a number of zero or more', () => {
    const error = refusal(() => serviceReading({ reading: -5, performedOn: '2026-10-30' }));
    expect(errorMessage(error, t)).toBe('Escribe un número válido.');
  });
});

describe('a corrected reading', () => {
  it('may be any non-negative number, even below the current odometer', () => {
    // flows.spec.ts corrects 30,500 to 30,600; a typo can also go down.
    expect(correctedReading(30600)).toBe(30600);
    expect(correctedReading(3050)).toBe(3050);
    expect(correctedReading(0)).toBe(0);
  });

  it('must be a number of zero or more', () => {
    expect(errorCode(refusal(() => correctedReading(-1)))).toBe('number_invalid');
  });
});
