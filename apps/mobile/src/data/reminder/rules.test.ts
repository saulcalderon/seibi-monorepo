import { describe, expect, it } from 'vitest';

import { InputError } from '../errors';

import { manualReminderRow } from './rules';

const input = { vehicleId: 'v1', title: '  Renovar el seguro ', dueOn: '2026-12-01', notes: '  ' };

const failure = (run: () => unknown) => {
  try {
    run();
  } catch (e) {
    return e instanceof InputError ? { field: e.field, code: e.code } : e;
  }
  return null;
};

describe('manualReminderRow', () => {
  it('writes the trimmed title, the day and no notes for blank notes', () => {
    expect(manualReminderRow(input)).toEqual({ vehicle_id: 'v1', title: 'Renovar el seguro', due_on: '2026-12-01', notes: null });
  });

  it('needs something to remember', () => {
    expect(failure(() => manualReminderRow({ ...input, title: '   ' }))).toEqual({ field: 'title', code: 'reminder_title_required' });
  });

  it('needs a calendar day', () => {
    expect(failure(() => manualReminderRow({ ...input, dueOn: '' }))).toEqual({ field: 'dueOn', code: 'date_required' });
  });
});
