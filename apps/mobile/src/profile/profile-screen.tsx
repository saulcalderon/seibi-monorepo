import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { deleteAccount, signOut, useAuth } from '@/auth/session';
import { useProfile } from '@/data/profile/queries';
import { levelTitle } from '@/lib/knowledge';
import { CONTACT_EMAIL, openLegal, type LegalDocument } from '@/lib/legal';
import { identityFromUser, initials } from '@/shell/identity';
import { TabScroll } from '@/shell/tab-scroll';
import { setThemePreference, THEME_PREFERENCES, useThemePreference } from '@/theme/preference';
import { Button } from '@/ui/button';
import { Card, IconTile, ListRow, RowDivider, SectionHeader } from '@/ui/card';
import { Toggle } from '@/ui/controls';
import { Segmented } from '@/ui/fields';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';

import { headerName, locationSummary } from './profile-logic';

const DEV = process.env.EXPO_PUBLIC_APP_VARIANT === 'development';

/**
 * Perfil (S11), opened from the header avatar inside the current tab. The
 * PWA's screen (apps/app/src/screens/Perfil.tsx) without its «Planes» card:
 * who is signed in; «Tú» (name, Knowledge level, location), each opening its
 * own sheet; «Preferencias» (notifications, «Tema»); «Legal y ayuda»;
 * sign-out and account deletion. In Seibi Dev it also links to the
 * development screens.
 */
export function ProfileScreen() {
  return (
    <TabScroll testID="profile-screen">
      <Who />
      <You />
      <Preferences />
      <LegalAndHelp />
      <Account />
      {DEV ? <DevSection /> : null}
    </TabScroll>
  );
}

/** The card at the top: Google's picture or the initials, the name and the email. */
function Who() {
  const { t } = useTranslation();
  const auth = useAuth();
  const profile = useProfile();
  const identity = identityFromUser(auth.status === 'signed-in' ? auth.session.user : null);
  const name = headerName(profile.data, identity, t);
  return (
    <Card testID="signed-in-as" accessible accessibilityLabel={[name, identity.email].filter(Boolean).join(', ')} style={styles.who}>
      <View style={styles.avatar}>
        {identity.avatarUrl ? (
          <Image source={identity.avatarUrl} style={styles.picture} accessible={false} />
        ) : (
          <Text step="title3" weight={700} tone="onInverse" maxFontSizeMultiplier={1}>
            {initials(name)}
          </Text>
        )}
      </View>
      <View style={styles.whoText}>
        <Text testID="profile-name" step="headline" weight={700} numberOfLines={1}>
          {name}
        </Text>
        {identity.email ? (
          <Text step="subhead" tone="muted" numberOfLines={1}>
            {identity.email}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** «Tú»: what Seibi knows about the person. Each row opens its sheet. */
function You() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile().data;
  return (
    <View style={styles.section}>
      <SectionHeader title={t('profile.you')} />
      <Card style={styles.list}>
        <ListRow
          testID="profile-name-row"
          leading={<IconTile icon="person" size="sm" />}
          title={t('profile.name.row')}
          subtitle={profile?.displayName ?? t('profile.name.unset')}
          onPress={() => router.push('/profile-name')}
        />
        <RowDivider />
        <ListRow
          testID="profile-level-row"
          leading={<IconTile icon="knowledge" size="sm" />}
          title={t('profile.level.row')}
          subtitle={levelTitle(profile?.knowledgeLevel, t)}
          onPress={() => router.push('/profile-level')}
        />
        <RowDivider />
        <ListRow
          testID="profile-location-row"
          leading={<IconTile icon="location" size="sm" />}
          title={t('profile.location.row')}
          subtitle={locationSummary(profile, t)}
          onPress={() => router.push('/profile-location')}
        />
      </Card>
    </View>
  );
}

/** «Preferencias»: notifications and «Tema». */
function Preferences() {
  const { t } = useTranslation();
  const preference = useThemePreference();
  return (
    <View style={styles.section}>
      <SectionHeader title={t('profile.preferences')} />
      <Card style={styles.list}>
        {/*
         * Native push arrives with SEI-47 (expo-notifications, `push_tokens`). Until then the switch
         * is off and disabled with why, as the PWA's is where a browser can't receive push.
         */}
        <Toggle
          testID="profile-notifications"
          label={t('profile.notifications.label')}
          description={t('profile.notifications.unavailable')}
          value={false}
          onChange={() => undefined}
          disabled
        />
        <RowDivider />
        <View style={styles.themeRow}>
          <IconTile icon="theme" size="sm" />
          <View style={styles.themeControl}>
            <Segmented
              testID="theme"
              label={t('theme.label')}
              value={preference}
              onChange={setThemePreference}
              options={THEME_PREFERENCES.map((value) => ({ value, label: t(`theme.${value}`) }))}
            />
          </View>
        </View>
      </Card>
      {DEV ? <ThemeCheck /> : null}
    </View>
  );
}

/**
 * Seibi Dev only: the active theme as text, so a flow can wait for a switch.
 * It is the only part of the screen that re-renders when the theme changes
 * (`useUnistyles`); the colours everywhere else update without a render.
 */
function ThemeCheck() {
  const { t } = useTranslation();
  const { rt } = useUnistyles();
  const preference = useThemePreference();
  return (
    <Text testID="theme-check" step="footnote" family="mono" tone="muted" style={styles.themeCheck}>
      {t('profile.themeCheck', {
        theme: rt.themeName === 'dark' ? 'night' : 'light',
        source: preference === 'system' ? 'system' : 'preference',
      })}
    </Text>
  );
}

/** «Legal y ayuda»: the Terms and Privacy Policy in the in-app browser, and Seibi's email. */
function LegalAndHelp() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const open = (document: LegalDocument) => void openLegal(document, theme.colors.radiant);
  const write = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => notify.error(t('profile.legal.mailFailed', { email: CONTACT_EMAIL })));
  };
  return (
    <View style={styles.section}>
      <SectionHeader title={t('profile.legal.title')} />
      <Card style={styles.list}>
        <ListRow testID="profile-terms" leading={<IconTile icon="document" size="sm" />} title={t('profile.legal.terms')} onPress={() => open('terms')} />
        <RowDivider />
        <ListRow testID="profile-privacy" leading={<IconTile icon="privacy" size="sm" />} title={t('profile.legal.privacy')} onPress={() => open('privacy')} />
        <RowDivider />
        <ListRow testID="profile-contact" leading={<IconTile icon="guide" size="sm" />} title={t('profile.legal.contact')} subtitle={CONTACT_EMAIL} onPress={write} />
      </Card>
    </View>
  );
}

/** Sign-out and account deletion (SEI-44's), then the app's version. */
function Account() {
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
    <View style={styles.account}>
      <Button testID="sign-out" variant="secondary" icon="signOut" label={t('account.signOut.action')} onPress={signOutOrSay} block />
      <Button testID="delete-account" variant="danger" icon="delete" label={t('account.delete.action')} onPress={confirmDeleteAccount} block />
      <Text testID="profile-version" step="caption" tone="subtle" align="center" style={styles.version}>
        {t('profile.version', { version: Constants.expoConfig?.version ?? '' })}
      </Text>
    </View>
  );
}

/** Seibi Dev only: the development screens, which no real screen links to. */
function DevSection() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.section}>
      <SectionHeader title={t('profile.dev')} />
      <Card style={styles.list}>
        <ListRow testID="open-data-check" title={t('dataCheck.open')} onPress={() => router.push('/data-check')} />
        <RowDivider />
        <ListRow testID="open-ui-kit" title={t('uiKit.open')} onPress={() => router.push('/ui-kit')} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[4],
    padding: theme.space[5],
  },
  avatar: {
    width: theme.size.profileAvatar,
    height: theme.size.profileAvatar,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.inverse,
  },
  picture: {
    width: '100%',
    height: '100%',
  },
  whoText: {
    flex: 1,
    minWidth: 0,
    gap: theme.space[0.5],
  },
  section: {
    gap: theme.space[3],
  },
  // Rows highlight to the card's edge, so the card clips them to its corners.
  list: {
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
  },
  themeControl: {
    flex: 1,
  },
  themeCheck: {
    paddingHorizontal: theme.space[1],
  },
  account: {
    gap: theme.space[2],
  },
  version: {
    paddingBottom: theme.space[2],
  },
}));
