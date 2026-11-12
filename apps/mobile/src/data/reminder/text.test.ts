import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { describe, expect, it } from 'vitest';

import { t } from '../test-i18n';

import { intervalText, reminderDueText } from './text';

// Expected strings are what the PWA's apps/app/src/lib/reminderText.ts says
// for the same Reminders.

const TODAY = '2026-11-12';

function reminder(fields: Partial<Reminder>): Reminder {
  return {
    taskCode: 'engine_oil',
    interval: { distance: 5000, months: 6 },
    status: 'ok',
    remainingDistance: null,
    remainingDays: null,
    dueOn: null,
    ...fields,
  } as Reminder;
}

describe('reminderDueText', () => {
  it('asks about a task with no known last Service', () => {
    expect(reminderDueText(reminder({ status: 'unknown', unknownReason: 'dont_know' }), 'km', t, TODAY)).toBe(
      'No sabemos cuándo fue. Conviene revisarlo.',
    );
    expect(reminderDueText(reminder({ status: 'unknown', unknownReason: 'ask' }), 'km', t, TODAY)).toBe(
      '¿Cuándo fue la última vez?',
    );
  });

  it('says how far past due an overdue Reminder is', () => {
    expect(reminderDueText(reminder({ status: 'overdue', remainingDistance: -1200, remainingDays: 10 }), 'km', t, TODAY)).toBe(
      'Vencido por 1,200 km',
    );
    expect(reminderDueText(reminder({ status: 'overdue', remainingDistance: 300, dueOn: TODAY }), 'km', t, TODAY)).toBe('Vence hoy');
    expect(reminderDueText(reminder({ status: 'overdue', dueOn: '2026-11-09' }), 'mi', t, TODAY)).toBe('Venció hace 3 días');
    expect(reminderDueText(reminder({ status: 'overdue' }), 'km', t, TODAY)).toBe('Vencido');
  });

  it('says what is left on the others, by distance and time', () => {
    expect(reminderDueText(reminder({ status: 'soon', remainingDistance: 450, remainingDays: 20 }), 'km', t, TODAY)).toBe(
      'En 450 km · aprox. en 20 días',
    );
    expect(reminderDueText(reminder({ remainingDays: 60 }), 'km', t, TODAY)).toBe('En 2 meses');
    expect(reminderDueText(reminder({ remainingDays: 1 }), 'km', t, TODAY)).toBe('mañana');
    expect(reminderDueText(reminder({ remainingDays: 0 }), 'km', t, TODAY)).toBe('hoy');
    expect(reminderDueText(reminder({ remainingDistance: -5 }), 'mi', t, TODAY)).toBe('En 0 mi');
    expect(reminderDueText(reminder({}), 'km', t, TODAY)).toBe('Al día');
  });
});

describe('intervalText', () => {
  it('says the interval, whichever comes first', () => {
    expect(intervalText(reminder({ interval: { distance: 5000, months: 6 } }), 'km', t)).toBe(
      'Cada 5,000 km o 6 meses, lo que llegue primero',
    );
    expect(intervalText(reminder({ interval: { distance: 10000, months: null } }), 'mi', t)).toBe('Cada 10,000 mi');
    expect(intervalText(reminder({ interval: { distance: null, months: 1 } }), 'km', t)).toBe('Cada 1 mes');
    expect(intervalText(reminder({ interval: { distance: null, months: null } }), 'km', t)).toBeNull();
  });
});
