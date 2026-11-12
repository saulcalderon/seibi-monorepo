/**
 * The tokens both themes share: spacing, radius, the type scale and the font
 * families. Values from docs/DESIGN.md. Plain data, like `palettes.ts`.
 */

/** The 4 pt grid (Tailwind's unit in the PWA): `space[n]` is `n × 4`. */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
} as const;

/** Corner radii, from the values the PWA uses. Pair with `borderCurve: 'continuous'`. */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  pill: 999,
} as const;

/**
 * Font family names as `useFonts` registers them in `src/app/_layout.tsx`.
 * Each weight is its own file, so pick the weight with the family, never with
 * `fontWeight`.
 *
 * `display` is for headings. It is Clash Display 600 in the PWA; until the
 * app can bundle that file (see ARCHITECTURE.md → Splash and fonts) it uses
 * Archivo 600, the PWA's own fallback for Clash Display.
 */
export const fonts = {
  display: 'Archivo_600SemiBold',
  sans: {
    300: 'Archivo_300Light',
    400: 'Archivo_400Regular',
    500: 'Archivo_500Medium',
    600: 'Archivo_600SemiBold',
    700: 'Archivo_700Bold',
  },
  mono: 'GeistMono_400Regular',
} as const;

/** Headings track tighter: `-0.01em`, as in the PWA. Multiply by the font size. */
export const displayTracking = -0.01;

/** The PWA's body line height (15 px at 1.45). */
const LEADING = 1.45;

function step(fontSize: number) {
  return { fontSize, lineHeight: Math.round(fontSize * LEADING) };
}

/**
 * The named type scale (pt). Each PWA size maps to the nearest step
 * (docs/DESIGN.md → Type). Text grows with the system text size, so never
 * give text a fixed height.
 */
export const typeScale = {
  caption: step(12),
  footnote: step(13),
  subhead: step(14),
  body: step(15),
  callout: step(16),
  headline: step(18),
  title3: step(20),
  title2: step(22),
  title1: step(26),
  largeTitle: step(32),
  display: step(38),
} as const;

export type TypeStep = keyof typeof typeScale;
