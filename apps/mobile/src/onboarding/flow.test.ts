import { describe, expect, it } from 'vitest';

import { canContinueCity, canContinueName, firstRunStatus, initialName, levelFromChecks, nextStep, stepPosition } from './flow';

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
  it('asks in the live PWA order and ends after the Vehicle step, added or skipped', () => {
    const order = ['name', 'level', 'check', 'result', 'location', 'vehicle'] as const;
    order.slice(0, -1).forEach((step, i) => expect(nextStep(step)).toBe(order[i + 1]));
    expect(nextStep('vehicle')).toBe('done');
  });
});

describe('stepPosition', () => {
  it('counts the steps, for «Paso N de M» and the dots', () => {
    expect(stepPosition('name')).toEqual({ index: 0, count: 6 });
    expect(stepPosition('vehicle')).toEqual({ index: 5, count: 6 });
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
