import { Button, Host } from '@expo/ui';
import { currentOdometer } from '@seibi/maintenance-engine/odometer';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { deleteAccount, signOut, useAuth } from '@/auth/session';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/theme/preference';

// Placeholder start screen (SEI-41), now the signed-in home (SEI-44): proves
// the app boots, the fonts load and Metro resolves the shared
// @seibi/maintenance-engine package; its copy comes from es.json (SEI-43)
// and its colours from the theme, which follows the phone or the saved
// preference (SEI-42). It holds sign-out and account deletion until Perfil
// (S11) exists. The app shell (SEI-55) replaces this screen; Perfil gets the
// real theme control.
const sampleReading = currentOdometer([
  { reading: 12000, recordedOn: '2026-11-01' },
  { reading: 12500, recordedOn: '2026-11-10' },
]);

const PREFERENCES: ThemePreference[] = ['system', 'light', 'night'];

export default function StartScreen() {
  const { t } = useTranslation();

  return (
    <View testID="start-screen" style={styles.screen}>
      <Text testID="start-title" accessibilityRole="header" style={styles.title}>
        {t('start.title')}
      </Text>
      <Text testID="start-tagline" style={styles.tagline}>
        {t('start.tagline')}
      </Text>
      <Text testID="engine-check" style={styles.check}>
        {t('start.engineCheck', { reading: sampleReading?.reading ?? t('start.noReading') })}
      </Text>
      <ThemeCheck />
      <ThemePicker />
      <Account />
      {process.env.EXPO_PUBLIC_APP_VARIANT === 'development' ? <OpenDataCheck /> : null}
    </View>
  );
}

/** Seibi Dev only: opens the data check screen (SEI-53) until real screens use the data layer. */
function OpenDataCheck() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Host matchContents>
      <Button testID="open-data-check" label={t('dataCheck.open')} variant="text" onPress={() => router.push('/data-check')} />
    </Host>
  );
}

/**
 * The active theme as text, so a flow can wait for a switch. It is the only
 * part of the screen that re-renders when the theme changes (`useUnistyles`);
 * the colours everywhere else update without a render.
 */
function ThemeCheck() {
  const { t } = useTranslation();
  const { rt } = useUnistyles();
  const preference = useThemePreference();
  return (
    <Text testID="theme-check" style={styles.check}>
      {t('start.themeCheck', {
        theme: rt.themeName === 'dark' ? 'night' : 'light',
        source: preference === 'system' ? 'system' : 'preference',
      })}
    </Text>
  );
}

/** The PWA's «Tema» segmented control (Auto · Claro · Oscuro), until Perfil (S11) ports it. */
function ThemePicker() {
  const { t } = useTranslation();
  const preference = useThemePreference();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('theme.label')} style={styles.track}>
      {PREFERENCES.map((value) => (
        <ThemeOption
          key={value}
          label={t(`theme.${value}`)}
          testID={`theme-${value}`}
          selected={preference === value}
          onPress={() => setThemePreference(value)}
        />
      ))}
    </View>
  );
}

function ThemeOption({
  label,
  testID,
  selected,
  onPress,
}: {
  label: string;
  testID: string;
  selected: boolean;
  onPress: () => void;
}) {
  styles.useVariants({ selected });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

/** Who is signed in, sign-out and account deletion, until Perfil (S11) holds them. */
function Account() {
  const { t } = useTranslation();
  const auth = useAuth();
  const email = auth.status === 'signed-in' ? auth.session.user.email : null;

  function confirmDeleteAccount() {
    Alert.alert(t('account.delete.confirmTitle'), t('account.delete.confirmMessage'), [
      { text: t('account.delete.cancel'), style: 'cancel' },
      {
        text: t('account.delete.confirm'),
        style: 'destructive',
        onPress: () => {
          deleteAccount().catch(() => {
            Alert.alert(t('account.delete.failedTitle'), t('account.delete.failedMessage'));
          });
        },
      },
    ]);
  }

  function signOutOrSay() {
    signOut().catch(() => {
      Alert.alert(t('account.signOut.failedTitle'), t('account.signOut.failedMessage'));
    });
  }

  return (
    <View style={styles.account}>
      {email ? (
        <Text testID="signed-in-as" style={styles.tagline}>
          {email}
        </Text>
      ) : null}
      <Host matchContents>
        <Button testID="sign-out" label={t('account.signOut.action')} variant="outlined" onPress={signOutOrSay} />
      </Host>
      <Host matchContents>
        <Button testID="delete-account" label={t('account.delete.action')} variant="text" onPress={confirmDeleteAccount} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[2],
    padding: theme.space[6],
    backgroundColor: theme.colors.bg,
  },
  title: {
    ...theme.type.largeTitle,
    fontFamily: theme.fonts.display,
    letterSpacing: theme.type.largeTitle.fontSize * theme.displayTracking,
    color: theme.colors.ink,
  },
  tagline: {
    ...theme.type.body,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.muted,
  },
  check: {
    ...theme.type.footnote,
    fontFamily: theme.fonts.mono,
    color: theme.colors.muted,
  },
  track: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: theme.space[6],
    padding: theme.space[1],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface3,
  },
  option: {
    flex: 1,
    // 44 pt: the minimum touch target (docs/DESIGN.md → Accessibility).
    minHeight: theme.space[11],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space[3],
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous',
    variants: {
      selected: {
        true: { backgroundColor: theme.colors.surface, boxShadow: theme.shadow.card },
        false: {},
      },
    },
  },
  pressed: {
    opacity: 0.7,
  },
  optionLabel: {
    ...theme.type.subhead,
    fontFamily: theme.fonts.sans[600],
    variants: {
      selected: {
        true: { color: theme.colors.ink },
        false: { color: theme.colors.muted },
      },
    },
  },
  account: {
    alignItems: 'center',
    gap: theme.space[1],
    marginTop: theme.space[6],
  },
}));
