import { describe, expect, it } from 'vitest';

import { InputError } from '../errors';

import { appointmentRow } from './rules';

const TODAY = '2026-11-17';
const input = { vehicleId: 'v1', scheduledOn: '2026-11-20', shop: '  Taller Don Beto ', notes: '  ', taskCodes: ['engine_oil', 'oil_filter'] };

const failure = (run: () => unknown) => {
  try {
    run();
  } catch (e) {
    return e instanceof InputError ? { field: e.field, code: e.code } : e;
  }
  return null;
};

describe('appointmentRow', () => {
  it('writes the Vehicle, the day, the trimmed Shop, no notes for blank notes, and the tasks', () => {
    expect(appointmentRow(input, TODAY)).toEqual({
      vehicle_id: 'v1',
      scheduled_on: '2026-11-20',
      shop: 'Taller Don Beto',
      notes: null,
      task_codes: ['engine_oil', 'oil_filter'],
    });
  });

  it('needs a calendar day', () => {
    expect(failure(() => appointmentRow({ ...input, scheduledOn: '' }, TODAY))).toEqual({ field: 'scheduledOn', code: 'date_required' });
  });

  it('takes today', () => {
    expect(appointmentRow({ ...input, scheduledOn: TODAY }, TODAY).scheduled_on).toBe(TODAY);
  });

  it('refuses a past day for a new Appointment: that is a Service', () => {
    expect(failure(() => appointmentRow({ ...input, scheduledOn: '2026-11-16' }, TODAY))).toEqual({ field: 'scheduledOn', code: 'appointment_date_past' });
  });

  it('keeps a past day when editing an Appointment', () => {
    expect(appointmentRow({ ...input, id: 'a1', scheduledOn: '2026-11-01' }, TODAY).scheduled_on).toBe('2026-11-01');
  });

  it('may be for no task in particular', () => {
    expect(appointmentRow({ ...input, taskCodes: [] }, TODAY).task_codes).toEqual([]);
  });
});
