import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { deleteAccount, signOut, useAuth } from '@/auth/session';
import { useProfile } from '@/data/profile/queries';
import { identityFromUser } from '@/shell/identity';
import { TabScroll } from '@/shell/tab-scroll';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/theme/preference';
import { Button } from '@/ui/button';
import { Card, ListRow, RowDivider, SectionHeader } from '@/ui/card';
import { Segmented } from '@/ui/fields';
import { Text } from '@/ui/text';

const PREFERENCES: ThemePreference[] = ['system', 'light', 'night'];

/**
 * Perfil, as a placeholder (SEI-55), opened from the header avatar inside
 * the current tab. It holds what the placeholder start screen did until
 * Perfil (S11) ports the PWA's: who is signed in, the «Tema» control, sign-out, account
 * deletion and, in Seibi Dev only, the links to the development screens.
 */
export default function ProfileScreen() {
  return (
    <TabScroll testID="profile-screen">
      <Who />
      <ThemeSection />
      <AccountSection />
      {process.env.EXPO_PUBLIC_APP_VARIANT === 'development' ? <DevSection /> : null}
    </TabScroll>
  );
}

function Who() {
  const auth = useAuth();
  const profile = useProfile();
  const identity = identityFromUser(auth.status === 'signed-in' ? auth.session.user : null);
  const name = profile.data?.displayName ?? identity.fullName;
  return (
    <Card>
      <ListRow testID="signed-in-as" title={name ?? identity.email ?? ''} subtitle={name ? (identity.email ?? undefined) : undefined} />

    </Card>
  );
}

/** The PWA's «Tema» (Auto · Claro · Oscuro), until Perfil (S11) ports the whole screen. */
function ThemeSection() {
  const { t } = useTranslation();
  const preference = useThemePreference();
  return (
    <>
      <SectionHeader title={t('theme.label')} />
      <Segmented
        testID="theme"
        label={t('theme.label')}
        value={preference}
        onChange={setThemePreference}
        options={PREFERENCES.map((value) => ({ value, label: t(`theme.${value}`) }))}
      />
      <ThemeCheck />
    </>
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
    <Text testID="theme-check" step="footnote" family="mono" tone="muted">
      {t('profile.themeCheck', {
        theme: rt.themeName === 'dark' ? 'night' : 'light',
        source: preference === 'system' ? 'system' : 'preference',
      })}
    </Text>
  );
}

/** Sign-out and account deletion, until Perfil (S11) holds them. */
function AccountSection() {
  const { t } = useTranslation();

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
    <>
      <SectionHeader title={t('profile.account')} />
      <Button testID="sign-out" variant="secondary" icon="signOut" label={t('account.signOut.action')} onPress={signOutOrSay} block />
      <Button testID="delete-account" variant="danger" icon="delete" label={t('account.delete.action')} onPress={confirmDeleteAccount} block />
    </>
  );
}

/** Seibi Dev only: the development screens, which no real screen links to. */
function DevSection() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <>
      <SectionHeader title={t('profile.dev')} />
      <Card>
        <ListRow testID="open-data-check" title={t('dataCheck.open')} onPress={() => router.push('/data-check')} />
        <RowDivider />
        <ListRow testID="open-ui-kit" title={t('uiKit.open')} onPress={() => router.push('/ui-kit')} />
      </Card>
    </>
  );
}
