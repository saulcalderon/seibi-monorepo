import { describe, expect, it } from 'vitest';

import { introDoneBySession, introOpen, slideControls } from './flow';

describe('introOpen', () => {
  it('opens the Intro on a first launch, signed out', () => {
    expect(introOpen({ auth: 'signed-out', introDone: false })).toBe(true);
  });

  it('never opens it again once done (skipped, finished or signed in before)', () => {
    expect(introOpen({ auth: 'signed-out', introDone: true })).toBe(false);
  });

  it('stays closed with a session, and on «Cuenta eliminada»', () => {
    expect(introOpen({ auth: 'signed-in', introDone: false })).toBe(false);
    expect(introOpen({ auth: 'account-deleted', introDone: false })).toBe(false);
  });
});

describe('introDoneBySession', () => {
  it('marks the Intro done when a session exists, as the PWA does after its splash', () => {
    expect(introDoneBySession({ auth: 'signed-in', introDone: false })).toBe(true);
  });

  it('writes nothing when it is already done, or without a session', () => {
    expect(introDoneBySession({ auth: 'signed-in', introDone: true })).toBe(false);
    expect(introDoneBySession({ auth: 'signed-out', introDone: false })).toBe(false);
    expect(introDoneBySession({ auth: 'account-deleted', introDone: false })).toBe(false);
  });
});

describe('slideControls', () => {
  it('offers «Siguiente» and «Saltar» before the last slide', () => {
    expect(slideControls(0, 3)).toEqual({ next: 1, skip: true });
    expect(slideControls(1, 3)).toEqual({ next: 2, skip: true });
  });

  it('ends the Intro from the last slide («Empezar»), with no «Saltar»', () => {
    expect(slideControls(2, 3)).toEqual({ next: 'finish', skip: false });
  });
});
