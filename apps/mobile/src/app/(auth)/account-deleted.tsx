import { Button, Host } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { acknowledgeAccountDeleted } from '@/auth/session';

// Shown when this device's session belongs to an account that no longer
// exists: deleted here, in the PWA, or on another phone. Nothing of the
// person is left on the device by the time it shows.
export default function AccountDeletedScreen() {
  const { t } = useTranslation();
  const night = useColorScheme() === 'dark';

  return (
    <View testID="account-deleted-screen" style={[styles.screen, night ? styles.screenNight : styles.screenLight]}>
      <Text testID="account-deleted-title" accessibilityRole="header" style={[styles.title, night ? styles.inkNight : styles.inkLight]}>
        {t('account.deleted.title')}
      </Text>
      <Text style={[styles.body, night ? styles.mutedNight : styles.mutedLight]}>{t('account.deleted.message')}</Text>
      <Host matchContents style={styles.action}>
        <Button testID="account-deleted-continue" label={t('account.deleted.continue')} onPress={acknowledgeAccountDeleted} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  screenLight: { backgroundColor: '#f2f4f7' },
  screenNight: { backgroundColor: '#0e0f11' },
  title: { fontFamily: 'Archivo_700Bold', fontSize: 28, letterSpacing: -0.28 },
  body: { fontFamily: 'Archivo_400Regular', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  inkLight: { color: '#141517' },
  inkNight: { color: '#f2f4f7' },
  mutedLight: { color: '#5b606a' },
  mutedNight: { color: '#a3a8b1' },
  action: { marginTop: 12 },
});
