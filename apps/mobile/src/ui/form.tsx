import { createContext, use, useState, type ReactNode, type RefObject } from 'react';
import { Platform, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { keyboardCover, sheetBottomOffset, sheetRoom } from './sheet-keyboard';

/**
 * Scrolling a form puts the keyboard away: the number pad has no return
 * key, so this is how a person closes it. Use it on every scroll view that
 * holds fields.
 */
export const KEYBOARD_DISMISS = 'on-drag';

/** True inside a `formSheet` route of a stack that uses `sheetScreenLayout`. */
const InSheet = createContext(false);

/**
 * A stack's `screenLayout` that tells each `formSheet` route it is one, so
 * its `FormLayout` leaves the keyboard to the sheet where the sheet rises by
 * itself (Android). For a stack that fills the window, as `(app)`'s does:
 * the sheet's room above it is measured against the window.
 */
export function sheetScreenLayout({ children, options }: { children: ReactNode; options: { presentation?: string } }) {
  return <InSheet value={options.presentation === 'formSheet'}>{children}</InSheet>;
}

/**
 * A form's scrolling body and its action bar. The bar (the save button)
 * rides on top of the keyboard, frame by frame on the UI thread
 * (react-native-keyboard-controller), so it never sits under it; the
 * focused field scrolls into view above the bar. Use it as the content of a
 * `formSheet` route or a full-screen form.
 *
 * On Android a form sheet rises above the keyboard by itself
 * (react-native-screens), so there the bar and the scroll make up only what
 * the sheet couldn't (`sheet-keyboard.ts`, SEI-76).
 */
export function FormLayout({
  children,
  footer,
  testID,
  scrollRef,
  divider = true,
}: {
  children: ReactNode;
  footer: ReactNode;
  testID?: string;
  /** The line over the action bar. The first-run questions leave it out, as the PWA's do. */
  divider?: boolean;
  /** The scroll view, to bring a field with an error into view. */
  scrollRef?: RefObject<ScrollViewInstance | null>;
}) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const risingSheet = use(InSheet) && Platform.OS === 'android';
  const [footerHeight, setFooterHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const room = risingSheet ? sheetRoom({ windowHeight: window.height, topInset: insets.top, sheetHeight }) : 0;
  const clearance = footerHeight + theme.space[4];
  styles.useVariants({ divider });
  const bar = (
    <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { paddingBottom: insets.bottom + theme.space[3] }]}>
      {footer}
    </View>
  );
  return (
    <View
      style={styles.screen}
      testID={testID}
      onLayout={risingSheet ? (event) => setSheetHeight(event.nativeEvent.layout.height) : undefined}
    >
      <KeyboardAwareScrollView
        // Its ref is a ScrollView; the library's own ref type resolves against a second copy of React's types.
        ref={scrollRef as never}
        bottomOffset={risingSheet ? sheetBottomOffset({ clearance, room, bottomInset: insets.bottom }) : clearance}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={KEYBOARD_DISMISS}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {children}
      </KeyboardAwareScrollView>
      {risingSheet ? (
        <SheetActionBar room={room} bottomInset={insets.bottom}>
          {bar}
        </SheetActionBar>
      ) : (
        // With the keyboard up, the home-indicator padding is behind it: drop it.
        <KeyboardStickyView offset={{ opened: insets.bottom }}>{bar}</KeyboardStickyView>
      )}
    </View>
  );
}

/** The action bar of a sheet that rises: it rises only by what the keyboard still covers. */
function SheetActionBar({ room, bottomInset, children }: { room: number; bottomInset: number; children: ReactNode }) {
  const { height } = useReanimatedKeyboardAnimation();
  const rise = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardCover({ keyboard: -height.value, room, bottomInset }) }],
  }));
  return <Animated.View style={rise}>{children}</Animated.View>;
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    gap: theme.space[4],
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[2],
    paddingBottom: theme.space[6],
  },
  footer: {
    gap: theme.space[2],
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[3],
    backgroundColor: theme.colors.bg,
    variants: {
      divider: {
        true: { borderTopWidth: theme.size.border.thin, borderTopColor: theme.colors.line },
        false: {},
      },
    },
  },
}));
