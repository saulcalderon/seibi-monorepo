// In-memory stand-ins for the native pieces, for unit tests only.
import type { Cipher, DataStore, KeyStore } from './encrypted-storage';

export function memoryData(initial: Record<string, string> = {}): DataStore & { entries: Map<string, string> } {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    getItem: async (name) => entries.get(name) ?? null,
    setItem: async (name, value) => {
      entries.set(name, value);
    },
    removeItem: async (name) => {
      entries.delete(name);
    },
    getAllKeys: async () => [...entries.keys()],
  };
}

export function memoryKeys(): KeyStore & { value: string | null; reads: number; failNextRead: boolean } {
  const store = {
    value: null as string | null,
    reads: 0,
    failNextRead: false,
    get: async () => {
      store.reads += 1;
      if (store.failNextRead) {
        store.failNextRead = false;
        throw new Error('User interaction is not allowed.');
      }
      return store.value;
    },
    set: async (key: string) => {
      store.value = key;
    },
    delete: async () => {
      store.value = null;
    },
  };
  return store;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
const utf8 = new TextEncoder();

/**
 * Real AES-256-GCM (Node's WebCrypto) in the same format as expo-crypto's
 * `combined('base64')`: base64(12-byte nonce ‖ ciphertext ‖ 16-byte tag),
 * with the context as associated data.
 */
export const webCryptoAesGcm: Cipher = {
  async generateKey() {
    return toBase64(crypto.getRandomValues(new Uint8Array(32)));
  },
  async seal(key, plaintext, context) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey('raw', fromBase64(key), 'AES-GCM', false, ['encrypt']);
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(context) }, cryptoKey, utf8.encode(plaintext)),
    );
    const combined = new Uint8Array(iv.length + sealed.length);
    combined.set(iv);
    combined.set(sealed, iv.length);
    return toBase64(combined);
  },
  async open(key, sealed, context) {
    const combined = fromBase64(sealed);
    const cryptoKey = await crypto.subtle.importKey('raw', fromBase64(key), 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: combined.slice(0, 12), additionalData: utf8.encode(context) },
      cryptoKey,
      combined.slice(12),
    );
    return new TextDecoder().decode(plain);
  },
};
