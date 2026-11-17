// Device preferences in the expo-sqlite kv-store, each key versioned (`.v1`)
// so a later change of shape takes a new key. The theme (`theme.v1`) and the
// language (`language.v1`) belong to the phone and stay after sign-out; the
// keys below belong to the person, so they sit under `user.` and sign-out
// deletes them (`src/auth/sign-out.ts`).
import { userDataKey } from '@/auth/sign-out';

/** Which Vehicle Inicio shows. */
export const ACTIVE_VEHICLE_KEY = userDataKey('active-vehicle.v1');

/** The Intro has been seen (or skipped by signing in). */
export const INTRO_DONE_KEY = userDataKey('intro-done.v1');
