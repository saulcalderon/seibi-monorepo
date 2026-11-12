import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

import { type Cipher, createEncryptedStorage, type DataStore, type KeyStore } from './encrypted-storage';

// The native pieces behind the encrypted session store.

const KEY_NAME = 'seibi.session-key.v1';
// Readable once the phone has been unlocked after a reboot, so a token
// refresh can run behind the lock screen; never copied to another phone, so
// a restored backup starts signed out instead of carrying the session over.
const KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const secureKeyStore: KeyStore = {
  get: () => SecureStore.getItemAsync(KEY_NAME, KEY_OPTIONS),
  set: (key) => SecureStore.setItemAsync(KEY_NAME, key, KEY_OPTIONS),
  delete: () => SecureStore.deleteItemAsync(KEY_NAME, KEY_OPTIONS),
};

/** The expo-sqlite kv-store (never AsyncStorage). */
export const kvStore: DataStore = {
  getItem: (name) => Storage.getItemAsync(name),
  setItem: (name, value) => Storage.setItemAsync(name, value),
  removeItem: async (name) => {
    await Storage.removeItemAsync(name);
  },
  getAllKeys: () => Storage.getAllKeysAsync(),
};

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();
const imported = new Map<string, Promise<AESEncryptionKey>>();

function importKey(encoded: string): Promise<AESEncryptionKey> {
  let key = imported.get(encoded);
  if (!key) {
    key = AESEncryptionKey.import(encoded, 'base64');
    imported.set(encoded, key);
  }
  return key;
}

/**
 * AES-256-GCM from expo-crypto: CryptoKit on iOS, the platform's
 * javax.crypto on Android. The native side draws a fresh 12-byte nonce for
 * every seal; the stored value is base64(nonce ‖ ciphertext ‖ 16-byte tag).
 */
const aesGcm: Cipher = {
  async generateKey() {
    const key = await AESEncryptionKey.generate(AESKeySize.AES256);
    return key.encoded('base64');
  },
  async seal(key, plaintext, context) {
    const sealed = await aesEncryptAsync(utf8.encode(plaintext), await importKey(key), {
      additionalData: utf8.encode(context),
    });
    return sealed.combined('base64');
  },
  async open(key, sealed, context) {
    const bytes = await aesDecryptAsync(AESSealedData.fromCombined(sealed), await importKey(key), {
      additionalData: utf8.encode(context),
      output: 'bytes',
    });
    return fromUtf8.decode(bytes);
  },
};

export const sessionStorage = createEncryptedStorage({ keys: secureKeyStore, data: kvStore, cipher: aesGcm });
