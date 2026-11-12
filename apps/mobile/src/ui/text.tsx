import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { typeScale, type TypeStep } from '@/theme/tokens';

import { textFits, type DrawnLine, type TextFitStore } from './text-fit';

/** Text colours. Each maps to the role that passes AA as text (`radiant` → `radiantText`). */
export type TextTone =
  | 'ink'
  | 'muted'
  | 'subtle'
  | 'radiant'
  | 'ok'
  | 'soon'
  | 'overdue'
  | 'unknown'
  | 'onInverse'
  | 'onRadiant';

export interface TextProps extends RNTextProps {
  /** A step of the type scale (docs/DESIGN.md → Type). */
  step?: TypeStep;
  /** `display` for headings, `sans` for everything else, `mono` for numbers. */
  family?: 'display' | 'sans' | 'mono';
  /** Archivo's weight. Ignored by `display` (600) and `mono` (400). */
  weight?: 300 | 400 | 500 | 600 | 700;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  /** Marks the text as a heading for VoiceOver and TalkBack. */
  heading?: boolean;
}

/** A screen that checks whether its text fits (the UI kit's sample screen) provides a store; elsewhere it is `null`. */
export const TextFitContext = createContext<TextFitStore | null>(null);

/** True inside a Text: a nested Text is a span of its parent's line, not a box of its own. */
const InText = createContext(false);

/**
 * Android only: a hair of trailing space, so a line is never cut (docs/DESIGN.md → Text that fits).
 * React Native 0.88 measures text with a `lineHeight` at its exact width and then lays it out to draw
 * about 1 px narrower (the width goes from pixels to points and back). The last word no longer fits,
 * moves to a second line, and that line falls outside the box: «Al día» draws «Al». A trailing space
 * hangs past the end of the line, so it widens the measured box without needing room of its own.
 */
const HANG = Platform.OS === 'android';

/**
 * The one text component. A screen picks a step, a family and a tone, never
 * a size or a colour. Text grows with the phone's text size (no cap, no fixed
 * height); numbers use tabular figures so columns line up.
 */
export function Text({
  step = 'body',
  family = 'sans',
  weight = 400,
  tone = 'ink',
  align,
  heading,
  style,
  children,
  accessibilityLabel,
  onLayout,
  onTextLayout,
  ...rest
}: TextProps) {
  styles.useVariants({ step, family, weight: family === 'sans' ? weight : undefined, tone, align });
  const nested = useContext(InText);
  const store = useContext(TextFitContext);
  const fit = useFitCheck(nested ? null : store, !rest.adjustsFontSizeToFit);
  const words = plainText(children);
  const hang = HANG && !nested && words !== '';

  const text = (
    <RNText
      accessibilityRole={heading ? 'header' : undefined}
      // The hanging space is drawing, not words: TalkBack and Maestro read the words alone.
      accessibilityLabel={accessibilityLabel ?? (hang ? words : undefined)}
      {...rest}
      onLayout={fit ? fit.onLayout(onLayout) : onLayout}
      onTextLayout={fit ? fit.onTextLayout(onTextLayout) : onTextLayout}
      style={[styles.text, style]}
    >
      {children}
      {hang ? <RNText style={styles.hang}> </RNText> : null}
    </RNText>
  );
  return nested ? text : <InText.Provider value>{text}</InText.Provider>;
}

/** The words of children that are only strings and numbers; `undefined` for anything richer. */
function plainText(children: ReactNode): string | undefined {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    const parts = children.map(plainText);
    return parts.every((part) => part !== undefined) ? parts.join('') : undefined;
  }
  return undefined;
}

type LayoutHandler = TextProps['onLayout'];
type TextLayoutHandler = TextProps['onTextLayout'];

/** With a store, reports after each layout whether the drawn lines fit the box (and its width, unless the text shrinks to fit). */
function useFitCheck(store: TextFitStore | null, widths: boolean) {
  const id = useId();
  const box = useRef<{ width: number; height: number } | null>(null);
  const lines = useRef<readonly DrawnLine[] | null>(null);
  useEffect(() => (store ? () => store.report(id, '', null) : undefined), [store, id]);
  if (!store) return null;
  const check = () => {
    if (!box.current || !lines.current) return;
    const words = lines.current.map((line) => line.text).join('').trim();
    store.report(id, words, textFits(box.current, lines.current, { widths }));
  };
  return {
    onLayout: (handler: LayoutHandler): LayoutHandler => (event) => {
      box.current = event.nativeEvent.layout;
      check();
      handler?.(event);
    },
    onTextLayout: (handler: TextLayoutHandler): TextLayoutHandler => (event) => {
      lines.current = event.nativeEvent.lines;
      check();
      handler?.(event);
    },
  };
}

/** `display` tracks tighter, by the same em at every step: one compound variant per step. */
const STEPS = Object.keys(typeScale) as TypeStep[];

const styles = StyleSheet.create((theme) => ({
  text: {
    variants: {
      step: {
        caption: theme.type.caption,
        footnote: theme.type.footnote,
        subhead: theme.type.subhead,
        body: theme.type.body,
        callout: theme.type.callout,
        headline: theme.type.headline,
        title3: theme.type.title3,
        title2: theme.type.title2,
        title1: theme.type.title1,
        largeTitle: theme.type.largeTitle,
        display: theme.type.display,
      },
      family: {
        display: { fontFamily: theme.fonts.display },
        sans: {},
        mono: { fontFamily: theme.fonts.mono, fontVariant: ['tabular-nums'] },
      },
      weight: {
        300: { fontFamily: theme.fonts.sans[300] },
        400: { fontFamily: theme.fonts.sans[400] },
        500: { fontFamily: theme.fonts.sans[500] },
        600: { fontFamily: theme.fonts.sans[600] },
        700: { fontFamily: theme.fonts.sans[700] },
      },
      tone: {
        ink: { color: theme.colors.ink },
        muted: { color: theme.colors.muted },
        subtle: { color: theme.colors.subtle },
        radiant: { color: theme.colors.radiantText },
        ok: { color: theme.colors.okText },
        soon: { color: theme.colors.soonText },
        overdue: { color: theme.colors.overdueText },
        unknown: { color: theme.colors.unknownText },
        onInverse: { color: theme.colors.onInverse },
        onRadiant: { color: theme.colors.onRadiant },
      },
      align: {
        left: { textAlign: 'left' },
        center: { textAlign: 'center' },
        right: { textAlign: 'right' },
      },
    },
    compoundVariants: STEPS.map((name) => ({
      family: 'display' as const,
      step: name,
      styles: { letterSpacing: theme.type[name].fontSize * theme.displayTracking },
    })),
  },
  // Archivo whatever the family (GeistMono's space is three times wider), and no tracking of its own:
  // a display heading's negative tracking would eat the space.
  hang: {
    fontFamily: theme.fonts.sans[400],
    fontSize: theme.size.hangingSpace,
    letterSpacing: 0,
  },
}));
