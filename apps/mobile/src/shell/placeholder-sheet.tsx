import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';
import type { IconName } from '@/ui/icon';

/**
 * The sheet an action opens until its form exists (the Service form is S7,
 * the Mileage form S8; both ship before launch). It says what will be here
 * and closes.
 */
export function PlaceholderSheet({ icon, title, body, testID }: { icon: IconName; title: string; body: string; testID: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View testID={testID} style={styles.sheet}>
      <EmptyState icon={icon} title={title} body={body} />
      <Button testID={`${testID}-close`} variant="secondary" label={t('placeholder.close')} onPress={() => router.back()} block />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  sheet: {
    gap: theme.space[4],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[6],
    // iOS sizes a fitted sheet above the home indicator already; Android's reaches the screen's edge.
    paddingBottom: (process.env.EXPO_OS === 'ios' ? 0 : rt.insets.bottom) + theme.space[6],
  },
}));
