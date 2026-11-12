import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { type ComponentType, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { signInWithApple } from '@/auth/apple';
import { googleSignInAvailable, signInWithGoogle } from '@/auth/google';

// Development and preview builds only (EXPO_PUBLIC_TEST_SIGN_IN=1 in their
// eas.json profiles). In any other build the condition is `undefined === '1'`
// at bundle time, Metro drops the require, and the form is not in the bundle.
const EmailSignIn: ComponentType | null =
  process.env.EXPO_PUBLIC_TEST_SIGN_IN === '1'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/auth/email-sign-in') as typeof import('@/auth/email-sign-in')).EmailSignIn
    : null;

type Provider = 'apple' | 'google';

// The plain sign-in screen. Its design is S1 (SEI-56).
export default function SignInScreen() {
  const { t } = useTranslation();
  const night = useColorScheme() === 'dark';
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function signIn(provider: Provider) {
    setBusy(provider);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
      // A successful sign-in opens (app) through the root layout's guards.
    } catch (error) {
      const detail = __DEV__ && error instanceof Error ? `\n\n${error.message}` : '';
      Alert.alert(t('signIn.failedTitle'), `${t('signIn.failedMessage')}${detail}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View testID="sign-in-screen" style={[styles.screen, night ? styles.screenNight : styles.screenLight]}>
      <View style={styles.heading}>
        <Text testID="sign-in-title" accessibilityRole="header" style={[styles.title, night ? styles.inkNight : styles.inkLight]}>
          {t('start.title')}
        </Text>
        <Text style={[styles.subtitle, night ? styles.mutedNight : styles.mutedLight]}>{t('signIn.subtitle')}</Text>
      </View>
      <View style={styles.buttons}>
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            testID="sign-in-apple"
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              night
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={styles.providerButton}
            onPress={() => void signIn('apple')}
          />
        ) : null}
        {googleSignInAvailable ? (
          <GoogleSigninButton
            testID="sign-in-google"
            size={GoogleSigninButton.Size.Wide}
            color={night ? 'light' : 'dark'}
            disabled={busy !== null}
            style={styles.providerButton}
            onPress={() => void signIn('google')}
          />
        ) : null}
        {busy ? <ActivityIndicator testID="sign-in-busy" /> : null}
      </View>
      {EmailSignIn ? <EmailSignIn /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', gap: 32, padding: 24 },
  screenLight: { backgroundColor: '#f2f4f7' },
  screenNight: { backgroundColor: '#0e0f11' },
  heading: { alignItems: 'center', gap: 6 },
  title: { fontFamily: 'Archivo_700Bold', fontSize: 34, letterSpacing: -0.34 },
  subtitle: { fontFamily: 'Archivo_400Regular', fontSize: 16 },
  inkLight: { color: '#141517' },
  inkNight: { color: '#f2f4f7' },
  mutedLight: { color: '#5b606a' },
  mutedNight: { color: '#a3a8b1' },
  buttons: { gap: 12, alignItems: 'stretch' },
  providerButton: { height: 50, alignSelf: 'stretch' },
});
