import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import { canContinueCity, canContinueName, firstRunStatus, initialName, levelFromChecks, nextStep, rememberedFromHistory, routineFromUsage, stepPosition } from './flow';

describe('firstRunStatus', () => {
  it('waits while the signed-in profile is loading', () => {
    expect(firstRunStatus({ signedIn: true, profile: undefined, failed: false })).toBe('unknown');
  });

  it('opens the questions until Onboarding is finished, and Inicio after', () => {
    expect(firstRunStatus({ signedIn: true, profile: { onboardedAt: null }, failed: false })).toBe('due');
    expect(firstRunStatus({ signedIn: true, profile: { onboardedAt: '2026-11-02T01:02:21Z' }, failed: false })).toBe('done');
  });

  it('opens Inicio when the profile cannot load, as the PWA (Inicio shows its own error)', () => {
    expect(firstRunStatus({ signedIn: true, profile: undefined, failed: true })).toBe('done');
  });

  it('has nothing to decide while signed out', () => {
    expect(firstRunStatus({ signedIn: false, profile: undefined, failed: false })).toBe('done');
  });
});

describe('nextStep', () => {
  it('asks in the PWA order, without the Vehicle questions when none was added', () => {
    const order = ['name', 'level', 'check', 'result', 'location', 'vehicle', 'notifications'] as const;
    order.slice(0, -1).forEach((step, i) => expect(nextStep(step, { hasVehicle: false })).toBe(order[i + 1]));
    expect(nextStep('notifications', { hasVehicle: false })).toBe('done');
  });

  it('asks how the Vehicle is used and its last maintenance once one was added', () => {
    expect(nextStep('vehicle', { hasVehicle: true })).toBe('usage');
    expect(nextStep('usage', { hasVehicle: true })).toBe('history');
    expect(nextStep('history', { hasVehicle: true })).toBe('notifications');
  });
});

describe('stepPosition', () => {
  it('counts the steps the person will see, for «Paso N de M» and the dots', () => {
    expect(stepPosition('name', { hasVehicle: false })).toEqual({ index: 0, count: 7 });
    expect(stepPosition('notifications', { hasVehicle: false })).toEqual({ index: 6, count: 7 });
    expect(stepPosition('history', { hasVehicle: true })).toEqual({ index: 7, count: 9 });
  });
});

describe('the name and the city', () => {
  it('starts from the saved name, else the first word of the account\'s full name', () => {
    expect(initialName('Ana', 'Ana Pérez')).toBe('Ana');
    expect(initialName(null, 'Saúl Calderón')).toBe('Saúl');
    expect(initialName(null, null)).toBe('');
  });

  it('needs a name that is not blank', () => {
    expect(canContinueName('  ')).toBe(false);
    expect(canContinueName(' Ana ')).toBe(true);
  });

  it('needs a city of two letters or more', () => {
    expect(canContinueCity(' S ')).toBe(false);
    expect(canContinueCity('SA')).toBe(true);
  });
});

describe('levelFromChecks', () => {
  it('averages the self-assessment with the right answers, rounding towards more help', () => {
    expect(levelFromChecks('none', [false, false, false])).toBe('none');
    expect(levelFromChecks('advanced', [true, true, true])).toBe('advanced');
    expect(levelFromChecks('advanced', [false, false, false])).toBe('basic');
    expect(levelFromChecks('none', [true, true, true])).toBe('basic');
    expect(levelFromChecks('intermediate', [true, false, true])).toBe('intermediate');
  });

  it('counts a question with no answer as wrong', () => {
    const picked: boolean[] = [];
    picked[0] = true;
    picked[2] = true;
    expect(levelFromChecks('advanced', picked)).toBe('intermediate');
  });
});

describe('routineFromUsage', () => {
  it('saves a Routine named after the chosen pattern, with its days per week', () => {
    expect(routineFromUsage({ vehicleId: 'v1', preset: 'daily', distance: '24' }, t)).toEqual({
      routine: { vehicleId: 'v1', name: 'Trabajo o estudio', roundTripDistance: 24, daysPerWeek: 5 },
    });
    expect(routineFromUsage({ vehicleId: 'v1', preset: 'some', distance: '12.5' }, t)).toEqual({
      routine: { vehicleId: 'v1', name: 'Recorridos frecuentes', roundTripDistance: 12.5, daysPerWeek: 3 },
    });
    expect(routineFromUsage({ vehicleId: 'v1', preset: 'weekend', distance: '1,200' }, t)).toEqual({
      routine: { vehicleId: 'v1', name: 'Fines de semana', roundTripDistance: 1200, daysPerWeek: 2 },
    });
  });

  it('asks for the distance when it is empty, unreadable or not above zero', () => {
    for (const distance of ['', 'abc', '0', '-3']) {
      expect(routineFromUsage({ vehicleId: 'v1', preset: 'daily', distance }, t)).toEqual({ error: 'Escribe la distancia aproximada.' });
    }
  });
});

describe('rememberedFromHistory', () => {
  const today = new Date(2026, 10, 17);

  it('saves nothing when nothing was answered', () => {
    expect(rememberedFromHistory({}, today)).toEqual([]);
  });

  it('dates each answer that many months back, and keeps «No sé» as unknown', () => {
    expect(rememberedFromHistory({ tire_rotation: '3to6', battery: 'unknown' }, today)).toEqual([
      { taskCode: 'tire_rotation', rememberedOn: '2026-07-17', reading: null, unknown: false },
      { taskCode: 'battery', rememberedOn: null, reading: null, unknown: true },
    ]);
  });

  it('remembers the oil filter with the oil, since they are changed together', () => {
    expect(rememberedFromHistory({ engine_oil: 'over12' }, today)).toEqual([
      { taskCode: 'engine_oil', rememberedOn: '2025-05-17', reading: null, unknown: false },
      { taskCode: 'oil_filter', rememberedOn: '2025-05-17', reading: null, unknown: false },
    ]);
  });
});
