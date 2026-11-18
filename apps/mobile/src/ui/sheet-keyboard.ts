/**
 * The keyboard over an Android form sheet. react-native-screens rises the
 * whole sheet above the keyboard by itself, as far as the space above the
 * sheet (its `room`) allows, and lets the navigation-bar inset slide behind
 * the keyboard. So a form in the sheet must move only by what is still
 * covered, never by the whole keyboard: moving by both pushed the content out
 * of the top of the sheet (SEI-76). iOS sheets and full-screen forms don't
 * rise; there the keyboard covers the form as it is (`room` 0).
 *
 * Every function is a Reanimated worklet: the action bar follows the
 * keyboard frame by frame on the UI thread.
 */

/** What react-native-screens does: the sheet rises by up to `room`, less the bottom inset. */
function sheetRise(keyboard: number, room: number, bottomInset: number): number {
  'worklet';
  return Math.max(0, Math.min(room, keyboard) - bottomInset);
}

/**
 * How much of the sheet's content, above its bottom inset, a keyboard
 * `keyboard` points tall still covers once the sheet has risen: how far the
 * action bar must rise inside the sheet.
 */
export function keyboardCover({ keyboard, room, bottomInset }: { keyboard: number; room: number; bottomInset: number }): number {
  'worklet';
  return Math.max(0, keyboard - bottomInset - sheetRise(keyboard, room, bottomInset));
}

/**
 * The space above a sheet `sheetHeight` points tall: the window less the
 * status bar and the sheet. A sheet not yet measured (0) gets none, so the
 * form keeps clear of the whole keyboard until it knows better.
 */
export function sheetRoom({ windowHeight, topInset, sheetHeight }: { windowHeight: number; topInset: number; sheetHeight: number }): number {
  if (sheetHeight <= 0) return 0;
  return Math.max(0, windowHeight - topInset - sheetHeight);
}

/**
 * The `bottomOffset` for react-native-keyboard-controller's
 * `KeyboardAwareScrollView` in a sheet that rises. It measures the focused
 * field where it was before the sheet rose, so it would scroll by the rise
 * as well: take the rise away. `clearance` is what the field must keep above
 * the keyboard (the action bar and a gap). In a sheet that rises clear of
 * the keyboard it never scrolls; in a tall one it scrolls only by what
 * stays covered.
 */
export function sheetBottomOffset({ clearance, room, bottomInset }: { clearance: number; room: number; bottomInset: number }): number {
  return clearance - Math.max(room, bottomInset);
}
