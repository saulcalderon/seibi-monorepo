import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { typeScale, type TypeStep } from '@/theme/tokens';

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
  ...rest
}: TextProps) {
  styles.useVariants({ step, family, weight: family === 'sans' ? weight : undefined, tone, align });
  return <RNText accessibilityRole={heading ? 'header' : undefined} {...rest} style={[styles.text, style]} />;
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
}));
