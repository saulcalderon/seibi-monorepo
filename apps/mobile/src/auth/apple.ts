import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';

import { type AppleName, appleName } from './apple-name';

function hasCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string';
}

/**
 * Sign in with Apple's native sheet, then its identity token to Supabase.
 * Apple signs the SHA-256 of the nonce into the token; Supabase checks it
 * against the raw nonce, so a captured token cannot be replayed.
 */
export async function signInWithApple(): Promise<'signed-in' | 'cancelled'> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (hasCode(error) && error.code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    throw error;
  }
  if (!credential.identityToken) throw new Error('Apple returned no identity token.');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  const name = appleName(credential.fullName);
  if (name) await saveName(data.user.id, name);
  return 'signed-in';
}

/**
 * Apple sends the name on the first sign-in only, so it is saved where the
 * PWA reads it: `full_name` in the user metadata (Perfil) and the first
 * name in `profiles.display_name` (the greeting), unless the person already
 * set one.
 */
async function saveName(userId: string, name: AppleName) {
  const [metadata, profile] = await Promise.all([
    supabase.auth.updateUser({
      data: { full_name: name.fullName, given_name: name.givenName, family_name: name.familyName },
    }),
    supabase.from('profiles').update({ display_name: name.displayName }).eq('user_id', userId).is('display_name', null),
  ]);
  // The person is signed in either way; Perfil lets them type a name later.
  if (metadata.error) console.warn('[auth] could not save the Apple name in user metadata', metadata.error.message);
  if (profile.error) console.warn('[auth] could not save the Apple name in the profile', profile.error.message);
}
