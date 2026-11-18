import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { describe, expect, it } from 'vitest';

import { COMMON_TASKS, type MaintenanceTask } from '@/data/task/catalog';

import { sameTasks, taskChoices } from './appointment-logic';

// «¿Para qué es?» on «Agendar Cita», the PWA's AppointmentBody
// (forms/SmallForms.tsx at 6e3b818): what the Vehicle needs first, then the
// common tasks, then the catalog, 14 at most.

const task = (code: string): MaintenanceTask => ({
  code,
  name: code,
  plainName: code,
  description: '',
  sortOrder: 0,
  generalDistanceKm: null,
  generalMonths: null,
});
const catalog = [...COMMON_TASKS, 'timing_belt', 'wipers', 'transmission_fluid'].map(task);
const reminder = (taskCode: string, status: Reminder['status']) => ({ taskCode, status }) as Reminder;

describe('taskChoices', () => {
  it('puts the overdue and soon tasks first, then the common ones, 14 at most', () => {
    const choices = taskChoices({
      reminders: [reminder('wipers', 'soon'), reminder('battery', 'ok'), reminder('timing_belt', 'overdue')],
      openedWith: [],
      tasks: catalog,
    });
    expect(choices).toHaveLength(14);
    expect(choices.slice(0, 4)).toEqual(['wipers', 'timing_belt', 'engine_oil', 'oil_filter']);
  });

  it('shows the task the form was opened for even when it would fall past the 14', () => {
    const choices = taskChoices({ reminders: [], openedWith: ['transmission_fluid'], tasks: catalog });
    expect(choices).toHaveLength(14);
    expect(choices[0]).toBe('transmission_fluid');
  });

  it('keeps every chosen task on screen, after the 14, when the Vehicle changes under it', () => {
    const choices = taskChoices({ reminders: [], openedWith: [], chosen: ['engine_oil', 'transmission_fluid'], tasks: catalog });
    expect(choices).toHaveLength(15);
    expect(choices[0]).toBe('engine_oil');
    expect(choices[14]).toBe('transmission_fluid');
  });

  it('leaves out codes the catalog does not have', () => {
    expect(taskChoices({ reminders: [], openedWith: ['not_a_task'], tasks: catalog })).not.toContain('not_a_task');
  });
});

describe('sameTasks', () => {
  it('is true for the same tasks tapped in another order', () => {
    expect(sameTasks(['engine_oil', 'oil_filter'], ['oil_filter', 'engine_oil'])).toBe(true);
  });

  it('is false when one was added or removed', () => {
    expect(sameTasks(['engine_oil'], ['engine_oil', 'oil_filter'])).toBe(false);
    expect(sameTasks(['engine_oil', 'oil_filter'], ['engine_oil', 'wipers'])).toBe(false);
  });
});
