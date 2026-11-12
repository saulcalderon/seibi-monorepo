import type { DataStore, EncryptedStorage } from './encrypted-storage';

/**
 * kv-store keys that belong to the signed-in person start with this prefix
 * (the active Vehicle, intro done…). Sign-out deletes them all. Settings of
 * the phone itself, such as the theme or the language, use other keys and
 * stay.
 */
export const USER_DATA_PREFIX = 'user.';

export function userDataKey(name: string): string {
  return USER_DATA_PREFIX + name;
}

type DeviceDeps = {
  session: Pick<EncryptedStorage, 'clear'>;
  data: Pick<DataStore, 'getAllKeys' | 'removeItem'>;
  /** Each provider's own sign-out (Google remembers the last account). Failures are ignored. */
  providers: (() => Promise<unknown>)[];
  /** In-memory caches that hold the person's data (the query cache). Cleared first. */
  caches?: { clear(): void }[];
};

/**
 * Deletes everything of the person on the device: the in-memory caches, the
 * session entries and their key, every `user.` key, the providers'
 * remembered accounts. Safe to run twice; it also runs when Supabase signs
 * out on its own (a revoked refresh token).
 */
export function createDeviceWipe(deps: DeviceDeps): () => Promise<void> {
  return async function wipeDevice() {
    deps.caches?.forEach((cache) => cache.clear());
    const names = await deps.data.getAllKeys();
    await Promise.all([
      deps.session.clear(),
      ...names.filter((name) => name.startsWith(USER_DATA_PREFIX)).map((name) => deps.data.removeItem(name)),
      ...deps.providers.map((providerSignOut) => providerSignOut().catch(() => undefined)),
    ]);
  };
}

/**
 * The one way to sign out: it ends this session on the server when it can,
 * and always leaves nothing of the person on the device.
 */
export function createSignOut(
  deps: DeviceDeps & {
    /** `supabase.auth`. */
    auth: { signOut(options: { scope: 'local' }): Promise<{ error: unknown }> };
  },
): () => Promise<void> {
  const wipeDevice = createDeviceWipe(deps);
  return async function signOut() {
    // `local` revokes only this phone's session; the PWA and other phones stay signed in.
    const { error } = await deps.auth.signOut({ scope: 'local' });
    await wipeDevice();
    // If the first call failed before Supabase dropped its session, the
    // device is clean now, so this call only tells the app (SIGNED_OUT).
    if (error) await deps.auth.signOut({ scope: 'local' });
  };
}
