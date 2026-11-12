import { describe, expect, it } from 'vitest';

import { createEncryptedStorage, SESSION_ENTRY_PREFIX } from './encrypted-storage';
import { memoryData, memoryKeys, webCryptoAesGcm as cipher } from './test-doubles';

const NAME = 'sb-blirxlxmmrhafomkykmr-auth-token';
// Bigger than SecureStore's ~2 KB value, with non-ASCII text from user metadata.
const SESSION = JSON.stringify({
  access_token: `eyJ.${'a'.repeat(2000)}.sig`,
  refresh_token: 'r3fr3sh-t0ken',
  expires_at: 1_794_470_000,
  user: { id: '169b137b-d0b7-4b3d-bbb0-33472d10202f', email: 'e2e@seibi.test', user_metadata: { full_name: 'Saúl Calderón 🚗' } },
});

function setup() {
  const keys = memoryKeys();
  const data = memoryData({ 'theme-preference': 'night' });
  return { keys, data, open: () => createEncryptedStorage({ keys, data, cipher }) };
}

describe('encrypted session storage', () => {
  it('reads back what it wrote after a relaunch (a new instance, nothing in memory)', async () => {
    const { open } = setup();
    await open().setItem(NAME, SESSION);
    expect(SESSION.length).toBeGreaterThan(2048);
    await expect(open().getItem(NAME)).resolves.toBe(SESSION);
  });

  it('keeps only ciphertext in the kv-store and a 256-bit key in the key store', async () => {
    const { open, data, keys } = setup();
    await open().setItem(NAME, SESSION);
    const stored = data.entries.get(SESSION_ENTRY_PREFIX + NAME);
    expect(stored).toMatch(/^v1:[A-Za-z0-9+/]+=*$/);
    expect(stored).not.toContain('refresh_token');
    expect(stored).not.toContain('e2e@seibi.test');
    expect(atob(keys.value ?? '').length).toBe(32);
  });

  it('seals each write with a fresh nonce', async () => {
    const { open, data } = setup();
    const storage = open();
    await storage.setItem(NAME, SESSION);
    const first = data.entries.get(SESSION_ENTRY_PREFIX + NAME);
    await storage.setItem(NAME, SESSION);
    expect(data.entries.get(SESSION_ENTRY_PREFIX + NAME)).not.toBe(first);
  });

  it('drops a value that was tampered with', async () => {
    const { open, data } = setup();
    await open().setItem(NAME, SESSION);
    const stored = data.entries.get(SESSION_ENTRY_PREFIX + NAME) as string;
    const flipped = stored.slice(0, 20) + (stored[20] === 'A' ? 'B' : 'A') + stored.slice(21);
    data.entries.set(SESSION_ENTRY_PREFIX + NAME, flipped);
    await expect(open().getItem(NAME)).resolves.toBeNull();
    expect(data.entries.has(SESSION_ENTRY_PREFIX + NAME)).toBe(false);
  });

  it('does not open a value copied under another name', async () => {
    const { open, data } = setup();
    await open().setItem(NAME, SESSION);
    data.entries.set(`${SESSION_ENTRY_PREFIX}other`, data.entries.get(SESSION_ENTRY_PREFIX + NAME) as string);
    await expect(open().getItem('other')).resolves.toBeNull();
  });

  it('drops the session when its key is gone', async () => {
    const { open, data, keys } = setup();
    await open().setItem(NAME, SESSION);
    keys.value = null;
    await expect(open().getItem(NAME)).resolves.toBeNull();
    expect(data.entries.has(SESSION_ENTRY_PREFIX + NAME)).toBe(false);
  });

  it('keeps the session when the keychain cannot be read yet, and opens it later', async () => {
    const { open, data, keys } = setup();
    await open().setItem(NAME, SESSION);
    const storage = open();
    keys.failNextRead = true;
    await expect(storage.getItem(NAME)).resolves.toBeNull();
    expect(data.entries.has(SESSION_ENTRY_PREFIX + NAME)).toBe(true);
    await expect(storage.getItem(NAME)).resolves.toBe(SESSION);
  });

  it('creates one key when two writes start at once', async () => {
    const { open, keys } = setup();
    const storage = open();
    await Promise.all([storage.setItem(NAME, SESSION), storage.setItem(`${NAME}-code-verifier`, 'verifier')]);
    const fresh = open();
    await expect(fresh.getItem(NAME)).resolves.toBe(SESSION);
    await expect(fresh.getItem(`${NAME}-code-verifier`)).resolves.toBe('verifier');
    expect(keys.value).not.toBeNull();
  });

  it('reads the key store once per launch', async () => {
    const { open, keys } = setup();
    await open().setItem(NAME, SESSION);
    const storage = open();
    keys.reads = 0;
    for (let i = 0; i < 5; i += 1) await storage.getItem(NAME);
    expect(keys.reads).toBe(1);
  });

  it('clear removes every session entry and the key, and nothing else', async () => {
    const { open, data, keys } = setup();
    const storage = open();
    await storage.setItem(NAME, SESSION);
    await storage.setItem(`${NAME}-code-verifier`, 'verifier');
    await storage.clear();
    expect([...data.entries.keys()]).toEqual(['theme-preference']);
    expect(keys.value).toBeNull();
    await expect(storage.getItem(NAME)).resolves.toBeNull();
  });
});
