import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// OAuth clients from Google Cloud, per variant (see ARCHITECTURE.md → Auth).
// The web client is the ID token's audience; iOS also needs its own client.
// Android needs no id here: Google matches the package name and the signing
// key's SHA-1 against the Android client.
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** False until the build has its client ids; the sign-in screen hides the button. */
export const googleSignInAvailable = Boolean(webClientId) && (Platform.OS !== 'ios' || Boolean(iosClientId));

let configured = false;

function configure() {
  if (configured) return;
  GoogleSignin.configure({ webClientId, iosClientId });
  configured = true;
}

/**
 * Google's own account picker (Play services on Android, Google's sign-in
 * sheet on iOS), then its ID token to Supabase.
 */
export async function signInWithGoogle(): Promise<'signed-in' | 'cancelled'> {
  configure();
  if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  let response: Awaited<ReturnType<typeof GoogleSignin.signIn>>;
  try {
    response = await GoogleSignin.signIn();
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
      return 'cancelled';
    }
    throw error;
  }
  if (response.type === 'cancelled') return 'cancelled';
  const token = response.data.idToken;
  if (!token) throw new Error('Google returned no ID token. Check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
  if (error) throw error;
  return 'signed-in';
}

/** Forgets the last Google account, so the next sign-in shows the picker again. */
export async function signOutOfGoogle(): Promise<void> {
  if (!googleSignInAvailable) return;
  configure();
  await GoogleSignin.signOut();
}
