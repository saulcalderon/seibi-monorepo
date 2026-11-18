// The Intro (S2) as plain functions: when it opens, when it is done, what
// its buttons do. Ported from the PWA's apps/app/src/lib/routing.ts
// (`pathAfterSplash`, `markIntroDone`) and screens/Intro.tsx; the screen in
// src/intro/intro-screen.tsx only draws them.

import type { AuthState } from '@/auth/session';

type IntroGate = {
  auth: Exclude<AuthState, { status: 'loading' }>['status'];
  /** `intro-done.v1` in the kv-store. */
  introDone: boolean;
};

/**
 * The Intro opens after the splash and before Login: signed out, until it
 * has been skipped or finished once on this phone.
 */
export function introOpen({ auth, introDone }: IntroGate): boolean {
  return auth === 'signed-out' && !introDone;
}

/**
 * A session marks the Intro done, as the PWA's splash does: someone already
 * signed in never needs it, and after a sign-out Login opens, not the Intro.
 * True only when there is something to write.
 */
export function introDoneBySession({ auth, introDone }: IntroGate): boolean {
  return auth === 'signed-in' && !introDone;
}

/**
 * The main button goes to the next slide, and on the last one («Empezar»)
 * ends the Intro. «Saltar» shows on every slide but the last, as in the PWA.
 */
export function slideControls(index: number, count: number): { next: number | 'finish'; skip: boolean } {
  const last = index >= count - 1;
  return { next: last ? 'finish' : index + 1, skip: !last };
}
