import { useState, type ReactNode, type RefObject } from 'react';
import { View, type ScrollViewInstance } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/**
 * A form's scrolling body and its action bar. The bar (the save button)
 * rides on top of the keyboard, frame by frame on the UI thread
 * (react-native-keyboard-controller), so it never sits under it; the
 * focused field scrolls into view above the bar. Use it as the content of a
 * `formSheet` route or a full-screen form.
 */
/**
 * Scrolling a form puts the keyboard away: the number pad has no return
 * key, so this is how a person closes it. Use it on every scroll view that
 * holds fields.
 */
export const KEYBOARD_DISMISS = 'on-drag';

export function FormLayout({
  children,
  footer,
  testID,
  scrollRef,
}: {
  children: ReactNode;
  footer: ReactNode;
  testID?: string;
  /** The scroll view, to bring a field with an error into view. */
  scrollRef?: RefObject<ScrollViewInstance | null>;
}) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  return (
    <View style={styles.screen} testID={testID}>
      <KeyboardAwareScrollView
        // Its ref is a ScrollView; the library's own ref type resolves against a second copy of React's types.
        ref={scrollRef as never}
        bottomOffset={footerHeight + theme.space[4]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={KEYBOARD_DISMISS}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {children}
      </KeyboardAwareScrollView>
      {/* With the keyboard up, the home-indicator padding is behind it: drop it. */}
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { paddingBottom: insets.bottom + theme.space[3] }]}>
          {footer}
        </View>
      </KeyboardStickyView>
    </View>
  );
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
    borderTopWidth: theme.size.border.thin,
    borderTopColor: theme.colors.line,
  },
}));
