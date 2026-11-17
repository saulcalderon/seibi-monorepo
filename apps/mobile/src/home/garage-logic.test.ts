import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import { garageStatus, mileageHint, pageAt, stepIndex, usedPercent } from './garage-logic';

function reminder(taskCode: string, status: Reminder['status'], used: number, snoozed = false): Reminder {
  return {
    taskCode,
    status,
    interval: { distance: 5000, months: 6 },
    source: 'general',
    severe: false,
    lastDone: null,
    dueReading: null,
    remainingDistance: null,
    dueOn: null,
    expectedOn: null,
    remainingDays: null,
    used,
    snoozed,
  };
}

describe('garageStatus', () => {
  it('is «Todo al día» when every known Reminder is ok', () => {
    const status = garageStatus([reminder('engine_oil', 'ok', 0.3), reminder('battery', 'unknown', 0)]);
    expect(status.known.map((r) => r.taskCode)).toEqual(['engine_oil']);
    expect(status.attention).toBe(0);
    expect(status.overdue).toBe(false);
  });

  it('has no cards when nothing is known (no Services yet)', () => {
    const status = garageStatus([reminder('engine_oil', 'unknown', 0), reminder('battery', 'unknown', 0)]);
    expect(status.known).toEqual([]);
  });

  it('puts overdue first, then soon, then the most used, and leaves snoozed ones out', () => {
    const status = garageStatus([
      reminder('air_filter', 'ok', 0.2),
      reminder('tire_rotation', 'soon', 0.92),
      reminder('engine_oil', 'overdue', 1.3),
      reminder('brake_fluid', 'ok', 0.7),
      reminder('coolant', 'overdue', 1.1, true),
    ]);
    expect(status.known.map((r) => r.taskCode)).toEqual(['engine_oil', 'tire_rotation', 'brake_fluid', 'air_filter']);
    expect(status.attention).toBe(2);
    expect(status.overdue).toBe(true);
  });
});

describe('usedPercent', () => {
  it('fills an overdue bar and clamps the rest', () => {
    expect(usedPercent({ status: 'overdue', used: 0.4 })).toBe(100);
    expect(usedPercent({ status: 'soon', used: 0.926 })).toBe(93);
    expect(usedPercent({ status: 'ok', used: -0.2 })).toBe(0);
  });
});

describe('mileageHint', () => {
  it('says nothing when no reading is due', () => {
    expect(mileageHint({ due: false, nextOn: '2026-11-20' }, t)).toBeNull();
  });

  it('explains each reason, as the PWA', () => {
    expect(mileageHint({ due: true, reason: 'no_readings', daysSinceLast: null }, t)).toBe(
      'Lo necesitamos para calcular tus próximos mantenimientos.',
    );
    expect(mileageHint({ due: true, reason: 'no_usage', daysSinceLast: 8 }, t)).toBe('Con otra lectura sabremos cuánto lo usas.');
    expect(mileageHint({ due: true, reason: 'stale', daysSinceLast: 40 }, t)).toBe('Tu último registro fue hace 40 días.');
  });
});

describe('carousel steps', () => {
  it('wraps around at both ends', () => {
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(1, 1, 3)).toBe(2);
    expect(stepIndex(0, 1, 0)).toBe(0);
  });

  it('reads the page a scroll rests on', () => {
    expect(pageAt(0, 369, 2)).toBe(0);
    expect(pageAt(369, 369, 2)).toBe(1);
    expect(pageAt(400, 369, 2)).toBe(1);
    expect(pageAt(2000, 369, 2)).toBe(1);
    expect(pageAt(-30, 369, 2)).toBe(0);
    expect(pageAt(100, 0, 2)).toBe(0);
  });
});
