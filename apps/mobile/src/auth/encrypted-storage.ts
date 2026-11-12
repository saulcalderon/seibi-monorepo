/**
 * The storage Supabase keeps its session in, encrypted at rest.
 *
 * A session (access token, refresh token, the user) can pass the ~2 KB that
 * a SecureStore value holds, so only a 256-bit key lives in SecureStore and
 * the session lives sealed in the kv-store. This module is plain TypeScript:
 * `device.ts` wires it to the native key store, kv-store and cipher, and the
 * tests wire it to in-memory ones.
 */

/** Where the one encryption key is kept (SecureStore on the phone). */
export type KeyStore = {
  get(): Promise<string | null>;
  set(key: string): Promise<void>;
  delete(): Promise<void>;
};

/** A string key-value store (the expo-sqlite kv-store on the phone). */
export type DataStore = {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
};

/**
 * Authenticated encryption. `context` is bound to the ciphertext as
 * associated data, so a sealed value only opens under the name it was
 * written for. `open` throws when the value was tampered with or sealed
 * with another key.
 */
export type Cipher = {
  generateKey(): Promise<string>;
  seal(key: string, plaintext: string, context: string): Promise<string>;
  open(key: string, sealed: string, context: string): Promise<string>;
};

/** Every kv-store entry this storage writes starts with this prefix. */
export const SESSION_ENTRY_PREFIX = 'auth.session.';
const FORMAT = 'v1:';

export type EncryptedStorage = {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
  /** Removes every session entry and the key itself. Part of sign-out. */
  clear(): Promise<void>;
};

export function createEncryptedStorage(deps: { keys: KeyStore; data: DataStore; cipher: Cipher }): EncryptedStorage {
  const { keys, data, cipher } = deps;
  // Supabase reads the session on every request, so the key and the opened
  // values stay in memory. Only this storage writes these entries, so the
  // cache cannot go stale.
  let key: Promise<string | null> | null = null;
  const opened = new Map<string, string | null>();

  function readKey(): Promise<string | null> {
    key ??= keys.get().catch((error: unknown) => {
      key = null; // a keychain that is not readable yet is retried next time
      throw error;
    });
    return key;
  }

  function ensureKey(): Promise<string> {
    // Chained on the pending read, so two writes at once share one new key.
    const pending = (key ?? keys.get()).then(async (existing) => {
      if (existing) return existing;
      const fresh = await cipher.generateKey();
      await keys.set(fresh);
      return fresh;
    });
    key = pending;
    return pending;
  }

  return {
    async getItem(name) {
      if (opened.has(name)) return opened.get(name) ?? null;
      const stored = await data.getItem(SESSION_ENTRY_PREFIX + name);
      if (stored === null) {
        opened.set(name, null);
        return null;
      }
      let current: string | null;
      try {
        current = await readKey();
      } catch {
        // The keychain is unavailable (before the first unlock after a
        // reboot). Keep the entry; it opens once the key can be read.
        return null;
      }
      let value: string | null = null;
      if (current && stored.startsWith(FORMAT)) {
        try {
          value = await cipher.open(current, stored.slice(FORMAT.length), name);
        } catch {
          value = null;
        }
      }
      // Sealed with a key that is gone, tampered with, or in an unknown
      // format: it can never open, so it is removed and the person signs in again.
      if (value === null) await data.removeItem(SESSION_ENTRY_PREFIX + name);
      opened.set(name, value);
      return value;
    },

    async setItem(name, value) {
      const sealed = await cipher.seal(await ensureKey(), value, name);
      await data.setItem(SESSION_ENTRY_PREFIX + name, FORMAT + sealed);
      opened.set(name, value);
    },

    async removeItem(name) {
      opened.set(name, null);
      await data.removeItem(SESSION_ENTRY_PREFIX + name);
    },

    async clear() {
      opened.clear();
      const names = await data.getAllKeys();
      await Promise.all(
        names.filter((name) => name.startsWith(SESSION_ENTRY_PREFIX)).map((name) => data.removeItem(name)),
      );
      await keys.delete();
      key = Promise.resolve(null);
    },
  };
}
