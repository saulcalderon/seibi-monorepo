import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { type ComponentType, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
  // The providers' own buttons take a light or dark style, not theme colours.
  const { rt, theme } = useUnistyles();
  const night = rt.themeName === 'dark';
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
    <View testID="sign-in-screen" style={styles.screen}>
      <View style={styles.heading}>
        <Text testID="sign-in-title" accessibilityRole="header" style={styles.title}>
          {t('start.title')}
        </Text>
        <Text style={styles.subtitle}>{t('signIn.subtitle')}</Text>
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
            cornerRadius={theme.radius.lg}
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

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.space[8],
    padding: theme.space[6],
    backgroundColor: theme.colors.bg,
  },
  heading: {
    alignItems: 'center',
    gap: theme.space[1.5],
  },
  title: {
    ...theme.type.largeTitle,
    fontFamily: theme.fonts.display,
    letterSpacing: theme.type.largeTitle.fontSize * theme.displayTracking,
    color: theme.colors.ink,
  },
  subtitle: {
    ...theme.type.callout,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.muted,
  },
  buttons: {
    gap: theme.space[3],
    alignItems: 'stretch',
  },
  providerButton: {
    // Above the 44 pt minimum touch target; Apple's button needs a fixed height.
    height: theme.space[12],
    alignSelf: 'stretch',
  },
}));
