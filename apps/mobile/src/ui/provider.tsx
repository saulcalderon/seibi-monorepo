import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';

import { Toaster } from './toast';

/**
 * What the UI kit needs once, at the root: gestures (toasts swipe away), the
 * keyboard's live position for forms, and the toasts' host above every
 * screen and sheet.
 */
export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        {children}
        <Toaster />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));
