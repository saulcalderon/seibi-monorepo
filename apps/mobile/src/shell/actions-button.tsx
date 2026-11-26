import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { size, space } from '@/theme/tokens';
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

/**
 * How far the [+]'s bottom edge sits above the bottom of the window: the
 * bottom safe area, the tab bar and a gap. NativeTabs can't be measured, so
 * its height is a token per platform (tokens.ts → size.tabBar). The chat's
 * question field lines up with it.
 */
export function actionsButtonBottom(bottomInset: number) {
  return bottomInset + (process.env.EXPO_OS === 'ios' ? size.tabBar.ios : size.tabBar.android) + space[3];
}

const styles = StyleSheet.create((theme, rt) => ({
  place: {
    position: 'absolute',
    right: theme.space[4],
    bottom: actionsButtonBottom(rt.insets.bottom),
  },
}));
