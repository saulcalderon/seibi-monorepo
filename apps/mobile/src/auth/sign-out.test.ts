import { describe, expect, it, vi } from 'vitest';

import { createEncryptedStorage, type EncryptedStorage } from './encrypted-storage';
import { createDeviceWipe, createSignOut, userDataKey } from './sign-out';
import { memoryData, memoryKeys, webCryptoAesGcm as cipher } from './test-doubles';

const NAME = 'sb-blirxlxmmrhafomkykmr-auth-token';

/** A stand-in for supabase.auth: like the real one, signing out removes its session entry. */
function fakeAuth(session: EncryptedStorage, outcome: 'ok' | 'network-error') {
  return {
    calls: [] as { scope: 'local' }[],
    async signOut(options: { scope: 'local' }) {
      this.calls.push(options);
      if (outcome === 'network-error' && this.calls.length === 1) return { error: new Error('Network request failed') };
      await session.removeItem(NAME);
      return { error: null };
    },
  };
}

async function signedInDevice() {
  const keys = memoryKeys();
  const data = memoryData({ 'theme-preference': 'night', 'language.v1': 'es' });
  const session = createEncryptedStorage({ keys, data, cipher });
  await session.setItem(NAME, JSON.stringify({ access_token: 'a', refresh_token: 'r' }));
  await data.setItem(userDataKey('active-vehicle'), 'f3c1');
  await data.setItem(userDataKey('intro-done'), '1');
  return { keys, data, session };
}

describe('signOut', () => {
  it('ends only this session and leaves nothing of the person on the device', async () => {
    const { keys, data, session } = await signedInDevice();
    const auth = fakeAuth(session, 'ok');
    const google = vi.fn(async () => null);

    await createSignOut({ auth, session, data, providers: [google] })();

    expect(auth.calls).toEqual([{ scope: 'local' }]);
    expect([...data.entries.keys()].sort()).toEqual(['language.v1', 'theme-preference']);
    expect(keys.value).toBeNull();
    expect(google).toHaveBeenCalledOnce();
  });

  it('still cleans the device when the server cannot be reached, then tells the app', async () => {
    const { keys, data, session } = await signedInDevice();
    const auth = fakeAuth(session, 'network-error');

    await createSignOut({ auth, session, data, providers: [] })();

    expect([...data.entries.keys()].sort()).toEqual(['language.v1', 'theme-preference']);
    expect(keys.value).toBeNull();
    // The second call finds no session and only emits SIGNED_OUT.
    expect(auth.calls).toHaveLength(2);
  });

  it('wipes the device when Supabase signed out on its own, and a second wipe is harmless', async () => {
    const { keys, data, session } = await signedInDevice();
    const wipeDevice = createDeviceWipe({ session, data, providers: [] });

    await Promise.all([wipeDevice(), wipeDevice()]);

    expect([...data.entries.keys()].sort()).toEqual(['language.v1', 'theme-preference']);
    expect(keys.value).toBeNull();
  });

  it('is not blocked by a provider that fails to sign out', async () => {
    const { data, session } = await signedInDevice();
    const auth = fakeAuth(session, 'ok');
    const failing = vi.fn(async () => {
      throw new Error('Google Play services unavailable');
    });

    await expect(createSignOut({ auth, session, data, providers: [failing] })()).resolves.toBeUndefined();
    expect([...data.entries.keys()].sort()).toEqual(['language.v1', 'theme-preference']);
  });
});
