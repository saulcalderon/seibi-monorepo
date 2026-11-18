import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { KEYBOARD_DISMISS } from '@/ui/form';

/**
 * The scrolling body of every screen inside the tabs. It is the screen's
 * first view, so iOS's large title collapses with it and the system insets
 * it under the header and above the tab bar (`contentInsetAdjustmentBehavior`;
 * on Android, NativeTabs keeps the screen above its bar). Its end leaves room
 * for the floating [+], so the last row can always scroll clear of it.
 */
export function TabScroll({
  children,
  flush = false,
  keyboardShouldPersistTaps,
  testID,
}: {
  children: ReactNode;
  flush?: boolean;
  /** A screen with a field in it (Estimados) passes `handled`, so a tap on a button works while the keyboard is up. */
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  testID?: string;
}) {
  styles.useVariants({ flush });
  return (
    <ScrollView
      testID={testID}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      // The same screens let a drag put the keyboard away.
      keyboardDismissMode={keyboardShouldPersistTaps ? KEYBOARD_DISMISS : undefined}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingTop: theme.space[2],
    // The [+] (56 pt) and the gap it keeps above the tab bar, twice: below it and around it.
    paddingBottom: theme.size.fab + theme.space[3] * 2,
    variants: {
      // `flush`: the screen lays out its own sides and gaps (Inicio's stage runs closer to the edges than its text).
      flush: {
        true: {},
        false: { gap: theme.space[4], paddingHorizontal: theme.space[4] },
      },
    },
  },
}));
