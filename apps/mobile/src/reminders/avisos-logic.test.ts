import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { describe, expect, it } from 'vitest';

import type { VehicleView } from '@/data/garage/types';

import { otherVehicles, DONT_KNOW_PATCH, groupReminders, historyPrompt, LAST_DONE_RANGES, rememberedPatch, nothingPending, snoozeOffer, snoozePatch, vehicleBadge } from './avisos-logic';

const reminder = (taskCode: string, patch: Partial<Reminder> = {}): Reminder => ({
  taskCode,
  status: 'ok',
  interval: { distance: 5000, months: 6 },
  source: 'general',
  severe: false,
  lastDone: null,
  dueReading: null,
  remainingDistance: null,
  dueOn: null,
  expectedOn: null,
  remainingDays: null,
  used: 0.2,
  snoozed: false,
  ...patch,
});

describe('groupReminders', () => {
  it('puts each Reminder in one group, soonest expected first, as the PWA Avisos', () => {
    const groups = groupReminders([
      reminder('oil', { status: 'overdue', expectedOn: '2026-10-01' }),
      reminder('brakes', { status: 'overdue', expectedOn: '2026-09-01' }),
      reminder('tires', { status: 'soon', expectedOn: '2026-12-01' }),
      reminder('filter', { status: 'ok', expectedOn: '2027-05-01' }),
      reminder('coolant', { status: 'ok', expectedOn: null }),
      reminder('battery', { status: 'ok', expectedOn: '2027-01-01' }),
      reminder('spark', { status: 'unknown' }),
    ]);
    expect(groups.overdue.map((r) => r.taskCode)).toEqual(['brakes', 'oil']);
    expect(groups.soon.map((r) => r.taskCode)).toEqual(['tires']);
    expect(groups.ok.map((r) => r.taskCode)).toEqual(['battery', 'filter', 'coolant']);
    expect(groups.snoozed).toEqual([]);
    expect(groups.unknown.map((r) => r.taskCode)).toEqual(['spark']);
  });

  it('moves snoozed Reminders to Pospuestos whatever their status, but keeps unknown ones unknown', () => {
    const groups = groupReminders([
      reminder('oil', { status: 'overdue', snoozed: true, expectedOn: '2026-10-01' }),
      reminder('tires', { status: 'soon', snoozed: true, expectedOn: '2026-09-01' }),
      reminder('spark', { status: 'unknown', snoozed: true }),
    ]);
    expect(groups.overdue).toEqual([]);
    expect(groups.soon).toEqual([]);
    expect(groups.snoozed.map((r) => r.taskCode)).toEqual(['tires', 'oil']);
    expect(groups.unknown.map((r) => r.taskCode)).toEqual(['spark']);
  });
});

describe('vehicleBadge', () => {
  it('counts the overdue ones, else says «Sin datos» when nothing is dated, else «Al día»', () => {
    expect(vehicleBadge({ overdue: 2, health: 'overdue' })).toEqual({ kind: 'pending', count: 2 });
    expect(vehicleBadge({ overdue: 0, health: 'soon' })).toEqual({ kind: 'ok' });
    expect(vehicleBadge({ overdue: 0, health: 'unknown' })).toEqual({ kind: 'noData' });
    expect(vehicleBadge({ overdue: 0, health: 'ok' })).toEqual({ kind: 'ok' });
  });
});

describe('nothingPending', () => {
  it('is true only with no overdue, no soon, no Appointment and no hand-written Reminder', () => {
    const groups = groupReminders([reminder('filter'), reminder('spark', { status: 'unknown' })]);
    expect(nothingPending(groups, 0)).toBe(true);
    expect(nothingPending(groups, 1)).toBe(false);
    expect(nothingPending(groupReminders([reminder('tires', { status: 'soon' })]), 0)).toBe(false);
    expect(nothingPending(groupReminders([reminder('oil', { status: 'overdue' })]), 0)).toBe(false);
  });
});

describe('snoozeOffer', () => {
  it('offers «Reactivar aviso» on a snoozed Reminder, «Posponer» on a due one, nothing otherwise', () => {
    expect(snoozeOffer(reminder('oil', { status: 'ok', snoozed: true }))).toBe('restore');
    expect(snoozeOffer(reminder('oil', { status: 'overdue' }))).toBe('snooze');
    expect(snoozeOffer(reminder('oil', { status: 'soon' }))).toBe('snooze');
    expect(snoozeOffer(reminder('oil', { status: 'ok' }))).toBeNull();
    expect(snoozeOffer(reminder('oil', { status: 'unknown' }))).toBeNull();
  });
});

describe('snoozePatch', () => {
  it('snoozes until N days from today, across a month end', () => {
    expect(snoozePatch(7, '2026-11-28')).toEqual({ snoozed_until: '2026-12-05' });
    expect(snoozePatch(30, '2026-11-17')).toEqual({ snoozed_until: '2026-12-17' });
  });

  it('clears the snooze to restore the Reminder', () => {
    expect(snoozePatch(null, '2026-11-17')).toEqual({ snoozed_until: null });
  });
});

describe('historyPrompt', () => {
  const task = (code: string, sortOrder: number) => ({ code, sortOrder });
  const tasks = new Map([task('timing_belt', 5), task('wipers', 2), task('battery', 40), task('engine_oil', 1)].map((t) => [t.code, t]));

  it('asks about the tasks people know best first, then the rest in catalog order', () => {
    const prompt = historyPrompt(
      [reminder('timing_belt', { status: 'unknown' }), reminder('battery', { status: 'unknown' }), reminder('wipers', { status: 'unknown' }), reminder('engine_oil', { status: 'unknown' })],
      tasks,
      4,
      false,
    );
    expect(prompt.shown.map((r) => r.taskCode)).toEqual(['engine_oil', 'battery', 'wipers', 'timing_belt']);
  });

  it('shows the first few until «Ver N más», and counts the «No sé» answers', () => {
    const unknown = [
      reminder('engine_oil', { status: 'unknown', unknownReason: 'dont_know' }),
      reminder('battery', { status: 'unknown', unknownReason: 'ask' }),
      reminder('wipers', { status: 'unknown', unknownReason: 'dont_know' }),
    ];
    const folded = historyPrompt(unknown, tasks, 2, false);
    expect(folded.shown.map((r) => r.taskCode)).toEqual(['engine_oil', 'battery']);
    expect(folded.more).toBe(1);
    expect(folded.dontKnow).toBe(2);
    const all = historyPrompt(unknown, tasks, 2, true);
    expect(all.shown).toHaveLength(3);
    expect(all.more).toBe(1);
  });

  it('has no «Ver más» when everything fits', () => {
    expect(historyPrompt([reminder('battery', { status: 'unknown' })], tasks, 5, false).more).toBe(0);
  });
});

describe('last-done answers', () => {
  it('turns each rough answer into a remembered day that many months back', () => {
    const today = '2026-11-17';
    expect(LAST_DONE_RANGES.map((range) => rememberedPatch(range, today, null).remembered_on)).toEqual([
      '2026-11-17',
      '2026-09-17',
      '2026-07-17',
      '2026-02-17',
      '2025-08-17',
    ]);
  });

  it('keeps an exact day and the odometer then, and answers a «No sé»', () => {
    expect(rememberedPatch('2026-03-02', '2026-11-17', 48250)).toEqual({
      last_unknown: false,
      remembered_on: '2026-03-02',
      remembered_reading: 48250,
    });
    expect(rememberedPatch(LAST_DONE_RANGES[0], '2026-11-17', null).remembered_reading).toBeNull();
  });

  it('forgets any remembered day when the person says they do not know', () => {
    expect(DONT_KNOW_PATCH).toEqual({ last_unknown: true, remembered_on: null, remembered_reading: null });
  });
});

describe('otherVehicles', () => {
  const vehicle = (id: string, health: VehicleView['health'], pending: number) => ({ id, health, pending, next: null }) as unknown as VehicleView;

  it('lists the other Vehicles most urgent first and leads with the first one that has something pending', () => {
    const active = vehicle('a', 'overdue', 3);
    const summary = otherVehicles(active, [active, vehicle('ok', 'ok', 0), vehicle('soon', 'soon', 1), vehicle('late', 'overdue', 2)]);
    expect(summary.others.map((v) => v.id)).toEqual(['late', 'soon', 'ok']);
    expect(summary.lead?.id).toBe('late');
    expect(summary.alsoPending).toBe(1);
  });

  it('has no lead when no other Vehicle has anything pending', () => {
    const active = vehicle('a', 'overdue', 3);
    expect(otherVehicles(active, [active, vehicle('ok', 'ok', 0)]).lead).toBeNull();
    expect(otherVehicles(active, [active]).others).toEqual([]);
  });
});
