/**
 * The keyboard over a form sheet. The native sheet keeps its content above
 * the keyboard by itself, as far as the space above the sheet (its `room`)
 * allows: on Android react-native-screens raises the whole sheet and lets the
 * navigation-bar inset slide behind the keyboard; on iOS the sheet grows to
 * full height with the content at its top. So a form in a sheet moves only
 * by what the keyboard still covers, never by the whole keyboard: moving by
 * both pushed the content out of the sheet and left it blank (SEI-76).
 *
 * The worklets run on the UI thread: the action bar follows the keyboard
 * frame by frame.
 */

export type SheetPlatform = 'ios' | 'android';

/** How far the native sheet lifts its content over a keyboard `keyboard` points tall. */
function sheetRise(keyboard: number, room: number, bottomInset: number, platform: SheetPlatform): number {
  'worklet';
  const rise = Math.min(room, keyboard);
  return platform === 'android' ? Math.max(0, rise - bottomInset) : rise;
}

/**
 * How much of the sheet's content, above its bottom inset, a keyboard
 * `keyboard` points tall still covers once the sheet has risen: how far the
 * action bar must rise inside the sheet.
 */
export function keyboardCover({
  keyboard,
  room,
  bottomInset,
  platform,
}: {
  keyboard: number;
  room: number;
  bottomInset: number;
  platform: SheetPlatform;
}): number {
  'worklet';
  return Math.max(0, keyboard - bottomInset - sheetRise(keyboard, room, bottomInset, platform));
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
 * `KeyboardAwareScrollView` in a sheet. It measures the focused field where
 * it was before the sheet rose, so it would scroll by the rise as well: take
 * the rise away. `clearance` is what the field keeps above the keyboard (the
 * action bar and a gap). In a sheet that rises clear of the keyboard it
 * never scrolls; in a tall one it scrolls only by what stays covered.
 */
export function sheetBottomOffset({
  clearance,
  room,
  bottomInset,
  platform,
}: {
  clearance: number;
  room: number;
  bottomInset: number;
  platform: SheetPlatform;
}): number {
  // The rise once the keyboard is taller than the room, whatever its height.
  return clearance - bottomInset - sheetRise(Number.POSITIVE_INFINITY, room, bottomInset, platform);
}
