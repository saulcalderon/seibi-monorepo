// Device preferences in the expo-sqlite kv-store, each key versioned (`.v1`)
// so a later change of shape takes a new key. The theme (`theme.v1`), the
// language (`language.v1`) and the Intro done belong to the phone and stay
// after sign-out; keys under `user.` belong to the person, and sign-out
// deletes them (`src/auth/sign-out.ts`).
import { userDataKey } from '@/auth/sign-out';

/** Which Vehicle Inicio shows. */
export const ACTIVE_VEHICLE_KEY = userDataKey('active-vehicle.v1');

/**
 * The Intro has been skipped or finished on this phone, or a session existed
 * here. The phone's, not the person's: as in the PWA, a sign-out opens Login,
 * never the Intro again.
 */
export const INTRO_DONE_KEY = 'intro-done.v1';
