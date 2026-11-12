import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { FloatingAction } from '@/ui/floating-action';

/**
 * The floating [+], bottom right, just above the tab bar. NativeTabs has no
 * place for a button and doesn't let a tab's press be intercepted, so the
 * tabs layout draws this over the tabs, outside them: it stays put on every
 * screen of every tab. It opens the actions sheet (`/actions`).
 */
export function ActionsButton() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View pointerEvents="box-none" style={styles.place}>
      <FloatingAction testID="open-actions" label={t('shell.actions')} onPress={() => router.push('/actions')} />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  place: {
    position: 'absolute',
    right: theme.space[4],
    // NativeTabs can't be measured, so its height is a token per platform (tokens.ts → size.tabBar).
    bottom: rt.insets.bottom + (process.env.EXPO_OS === 'ios' ? theme.size.tabBar.ios : theme.size.tabBar.android) + theme.space[3],
  },
}));
