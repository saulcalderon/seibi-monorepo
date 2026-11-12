import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

import { kvStore, sessionStorage } from './device';
import { signOutOfGoogle } from './google';
import { createDeviceWipe, createSignOut } from './sign-out';

/**
 * What the root layout's `Stack.Protected` guards read. Supabase's own
 * events are the only input; no screen redirects by hand.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; session: Session }
  | { status: 'account-deleted' };

let session: Session | null = null;
let resolved = false;
// The account behind this device's session no longer exists. Wins over the
// session until the person acknowledges the «cuenta eliminada» screen.
let accountDeleted = false;
let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();

function publish() {
  const next: AuthState = !resolved
    ? { status: 'loading' }
    : accountDeleted
      ? { status: 'account-deleted' }
      : session
        ? { status: 'signed-in', session }
        : { status: 'signed-out' };
  const unchanged =
    next.status === state.status &&
    (next.status !== 'signed-in' || (state.status === 'signed-in' && state.session === next.session));
  if (unchanged) return;
  state = next;
  listeners.forEach((listener) => listener());
}

const device = { session: sessionStorage, data: kvStore, providers: [signOutOfGoogle] };
const wipeDevice = createDeviceWipe(device);

/** Signs out and leaves nothing of the person on this device. */
export const signOut = createSignOut({ ...device, auth: supabase.auth });

async function showAccountDeleted() {
  accountDeleted = true;
  publish();
  await signOut();
}

/**
 * Deletes the account and everything in it (`delete-account` Edge
 * Function), then signs out. Throws when the server did not delete it.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await showAccountDeleted();
}

/** The person read the «cuenta eliminada» screen: back to sign-in. */
export function acknowledgeAccountDeleted() {
  accountDeleted = false;
  publish();
}

/**
 * A session can outlive its account (deleted from the PWA or another
 * phone). The server says so while the access token is still valid; with an
 * expired one the refresh fails and Supabase signs out on its own.
 */
async function confirmAccountExists() {
  if (!session || accountDeleted) return;
  const { error } = await supabase.auth.getUser();
  if (error && 'code' in error && error.code === 'user_not_found') await showAccountDeleted();
}

supabase.auth.onAuthStateChange((event, next) => {
  session = next;
  resolved = true;
  if (event === 'SIGNED_IN') accountDeleted = false;
  publish();
  if (event === 'INITIAL_SESSION' && next) void confirmAccountExists();
  // Supabase also signs out on its own (a refresh token revoked elsewhere);
  // the device is wiped then too, not only through signOut().
  if (event === 'SIGNED_OUT') void wipeDevice();
});

AppState.addEventListener('change', (appState) => {
  if (appState === 'active') void confirmAccountExists();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state);
}
