import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { acknowledgeAccountDeleted } from '@/auth/session';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';

// Shown when this device's session belongs to an account that no longer
// exists: deleted here, in the PWA, or on another phone. Nothing of the
// person is left on the device by the time it shows. «Entendido» opens the
// sign-in screen.
export default function AccountDeletedScreen() {
  const { t } = useTranslation();

  return (
    <View testID="account-deleted-screen" style={styles.screen}>
      <EmptyState
        testID="account-deleted"
        icon="check"
        title={t('account.deleted.title')}
        body={t('account.deleted.message')}
        action={<Button testID="account-deleted-continue" label={t('account.deleted.continue')} onPress={acknowledgeAccountDeleted} />}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: rt.insets.top,
    paddingBottom: rt.insets.bottom,
    backgroundColor: theme.colors.bg,
  },
}));
