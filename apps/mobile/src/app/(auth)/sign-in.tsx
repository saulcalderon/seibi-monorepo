import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type ComponentType, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScopedTheme, StyleSheet, useUnistyles } from 'react-native-unistyles';

import { signInWithApple } from '@/auth/apple';
import { googleSignInAvailable, signInWithGoogle } from '@/auth/google';
import { AppleSignInButton, GoogleSignInButton } from '@/auth/provider-buttons';
import { openLegal } from '@/lib/legal';
import { Logo } from '@/ui/logo';
import { Text } from '@/ui/text';
import { Wordmark } from '@/ui/wordmark';

// Development and preview builds only (EXPO_PUBLIC_TEST_SIGN_IN=1 in their
// eas.json profiles). In any other build the condition is `undefined === '1'`
// at bundle time, Metro drops the require, and the form is not in the bundle.
const EmailSignIn: ComponentType | null =
  process.env.EXPO_PUBLIC_TEST_SIGN_IN === '1'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/auth/email-sign-in') as typeof import('@/auth/email-sign-in')).EmailSignIn
    : null;

// The PWA's Login art: the Vehicle its carousel rests on, now the only one.
const VEHICLE = require('../../../assets/images/sign-in-vehicle.png') as number;

type Provider = 'apple' | 'google';

/**
 * Login (S1), the PWA's look: the lockup, one still Vehicle, the headline,
 * Apple and Google, and the legal line. A first-run screen, so it stays on
 * the light Garage palette in night too (docs/DESIGN.md → Color), like the
 * PWA's `.intro-day .intro-v3`. The root layout's guards open it without a
 * session and leave it as soon as one exists; nothing here navigates.
 */
export default function SignInScreen() {
  return (
    <ScopedTheme name="garage">
      <SignIn />
    </ScopedTheme>
  );
}

function SignIn() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Apple's button can't grow with the text size; it matches Google's, which does.
  const [googleHeight, setGoogleHeight] = useState<number>(theme.size.control.md);

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
      // A successful sign-in opens (app) through the root layout's guards;
      // a cancelled one leaves the screen as it was.
    } catch (cause) {
      const message = t(provider === 'apple' ? 'signIn.appleFailed' : 'signIn.googleFailed');
      // Development builds add the provider's own words, for whoever sets the providers up.
      const detail = __DEV__ && cause instanceof Error ? `\n${cause.message}` : '';
      setError(`${message}${detail}`);
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Light content whatever the theme; the root layout's `auto` returns when this screen closes. */}
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        testID="sign-in-screen"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={theme.space[6]}
      >
        <View style={styles.main}>
          <View testID="sign-in-lockup" accessible accessibilityRole="image" accessibilityLabel={t('brand.name')} style={styles.lockup}>
            <Logo size="md" />
            <Wordmark step="title2" />
          </View>
          <Image testID="sign-in-vehicle" source={VEHICLE} contentFit="contain" style={styles.vehicle} accessible={false} />
          <View style={styles.copy}>
            <Text testID="sign-in-title" heading step="title1" weight={300} align="center" style={styles.title}>
              {t('signIn.title')}
            </Text>
            <Text step="subhead" tone="muted" align="center" style={styles.subtitle}>
              {t('signIn.subtitle')}
            </Text>
          </View>
          <View style={styles.buttons}>
            {appleAvailable ? (
              <AppleSignInButton
                testID="sign-in-apple"
                height={googleSignInAvailable ? googleHeight : theme.size.control.md}
                disabled={busy !== null}
                onPress={() => void signIn('apple')}
              />
            ) : null}
            {googleSignInAvailable ? (
              <GoogleSignInButton
                testID="sign-in-google"
                label={t('signIn.google')}
                busy={busy === 'google'}
                disabled={busy !== null}
                onHeight={setGoogleHeight}
                onPress={() => void signIn('google')}
              />
            ) : null}
            {error ? (
              <Text testID="sign-in-error" step="footnote" weight={500} tone="overdue" align="center" accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </View>
          {EmailSignIn ? <EmailSignIn /> : null}
        </View>
        <Text testID="sign-in-legal" step="caption" tone="muted" align="center" style={styles.legal}>
          <Trans
            i18nKey="signIn.legal"
            components={{
              terms: (
                <Text
                  step="caption"
                  weight={600}
                  accessibilityRole="link"
                  style={styles.link}
                  onPress={() => void openLegal('terms', theme.colors.radiant)}
                />
              ),
              privacy: (
                <Text
                  step="caption"
                  weight={600}
                  accessibilityRole="link"
                  style={styles.link}
                  onPress={() => void openLegal('privacy', theme.colors.radiant)}
                />
              ),
            }}
          />
        </Text>
      </KeyboardAwareScrollView>
      {/* Android draws content under its see-through status bar; iOS fades it under its own scroll edge. */}
      {process.env.EXPO_OS === 'android' ? <View style={styles.statusBarScrim} /> : null}
    </>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flexGrow: 1,
    paddingTop: rt.insets.top,
    paddingBottom: rt.insets.bottom + theme.space[3],
    paddingHorizontal: theme.space[6],
  },
  statusBarScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rt.insets.top,
    backgroundColor: theme.colors.bg,
  },
  // Centred in the space above the legal line, which sits at the bottom.
  main: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.space[4],
    paddingVertical: theme.space[5],
  },
  lockup: {
    alignItems: 'center',
    gap: theme.space[1],
  },
  vehicle: {
    height: theme.size.hero,
    // The PWA's `px-5` inside a `px-6` column would shrink it; it spans the column.
    alignSelf: 'stretch',
  },
  copy: {
    gap: theme.space[2],
    alignItems: 'center',
  },
  title: {
    letterSpacing: theme.type.title1.fontSize * theme.heroType.tracking,
    lineHeight: Math.round(theme.type.title1.fontSize * theme.heroType.leading),
  },
  subtitle: {
    maxWidth: theme.size.readable,
  },
  buttons: {
    gap: theme.space[2],
  },
  legal: {
    alignSelf: 'center',
    maxWidth: theme.size.readable,
  },
  link: {
    color: theme.colors.ink,
    textDecorationLine: 'underline',
  },
}));
