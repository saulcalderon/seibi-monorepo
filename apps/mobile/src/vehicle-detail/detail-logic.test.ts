import { describe, expect, it } from 'vitest';

import type { MileageRecord, RoutineRecord, ServiceRecord } from '@/data/garage/types';

import { latestReadings, routinesWeeklyTotal, scheduleBanner, scheduleGeneralBody, servicesByMonth, usageSourceKey, yearSpend } from './detail-logic';

const service = (id: string, performedOn: string, totalCost: number | null = null): ServiceRecord => ({
  id,
  type: 'maintenance',
  performedOn,
  shop: null,
  notes: null,
  totalCost,
  invoicePath: null,
  readingId: 'r1',
  reading: null,
  items: [],
});

const reading = (id: string, n: number, on: string): MileageRecord => ({ id, reading: n, recordedOn: on });
const routine = (id: string, km: number, days: number): RoutineRecord => ({ id, name: id, roundTripDistance: km, daysPerWeek: days });

describe('servicesByMonth', () => {
  it('groups services by YYYY-MM, keeping their order', () => {
    const groups = servicesByMonth([service('a', '2026-11-05'), service('b', '2026-11-20'), service('c', '2026-09-01')]);
    expect(groups.map(([m]) => m)).toEqual(['2026-11', '2026-09']);
    expect(groups[0][1].map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('yearSpend', () => {
  it('sums only this calendar year, treating null as 0', () => {
    expect(yearSpend([service('a', '2026-01-01', 10), service('b', '2025-12-31', 99), service('c', '2026-06-01')], '2026-11-17')).toBe(10);
  });
});

describe('latestReadings', () => {
  it('sorts by date desc then reading desc, sliced to 8', () => {
    const many = Array.from({ length: 10 }, (_, i) => reading(`r${i}`, 50000 + i, '2026-11-10'));
    const rows = latestReadings([reading('old', 1, '2026-01-01'), reading('low', 100, '2026-11-10'), reading('high', 300, '2026-11-10')]);
    expect(rows.map((r) => r.id)).toEqual(['high', 'low', 'old']);
    expect(latestReadings(many)).toHaveLength(8);
  });
});

describe('routinesWeeklyTotal', () => {
  it('sums distance × days', () => {
    expect(routinesWeeklyTotal([routine('a', 20, 5), routine('b', 10, 2)])).toBe(120);
    expect(routinesWeeklyTotal([])).toBe(0);
  });
});

describe('usageSourceKey', () => {
  it('maps the engine source to the copy key', () => {
    expect(usageSourceKey({ source: 'readings' } as never)).toBe('fromReadings');
    expect(usageSourceKey({ source: 'routines' } as never)).toBe('fromRoutines');
    expect(usageSourceKey(null)).toBe('ask');
  });
});

describe('scheduleBanner', () => {
  it('picks pending, model, or the general variant', () => {
    expect(scheduleBanner({ scheduleSource: 'pending', schedule: null })).toBe('pending');
    expect(scheduleBanner({ scheduleSource: 'model', schedule: null })).toBe('model');
    expect(scheduleBanner({ scheduleSource: 'general', schedule: { status: 'general' } as never })).toBe('general-plain');
    expect(scheduleBanner({ scheduleSource: 'general', schedule: null })).toBe('general-cta');
    expect(scheduleBanner({ scheduleSource: 'general', schedule: { status: 'none' } as never })).toBe('general-cta');
    expect(scheduleGeneralBody({ schedule: { status: 'general' } as never })).toBe('generalFound');
    expect(scheduleGeneralBody({ schedule: null })).toBe('generalNone');
  });
});
