import { Button, Host } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { acknowledgeAccountDeleted } from '@/auth/session';

// Shown when this device's session belongs to an account that no longer
// exists: deleted here, in the PWA, or on another phone. Nothing of the
// person is left on the device by the time it shows.
export default function AccountDeletedScreen() {
  const { t } = useTranslation();

  return (
    <View testID="account-deleted-screen" style={styles.screen}>
      <Text testID="account-deleted-title" accessibilityRole="header" style={styles.title}>
        {t('account.deleted.title')}
      </Text>
      <Text style={styles.body}>{t('account.deleted.message')}</Text>
      <Host matchContents style={styles.action}>
        <Button testID="account-deleted-continue" label={t('account.deleted.continue')} onPress={acknowledgeAccountDeleted} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[3],
    padding: theme.space[6],
    backgroundColor: theme.colors.bg,
  },
  title: {
    ...theme.type.title1,
    fontFamily: theme.fonts.display,
    letterSpacing: theme.type.title1.fontSize * theme.displayTracking,
    color: theme.colors.ink,
  },
  body: {
    ...theme.type.callout,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.muted,
    textAlign: 'center',
  },
  action: {
    marginTop: theme.space[3],
  },
}));
