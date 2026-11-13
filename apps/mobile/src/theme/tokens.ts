/**
 * The tokens both themes share: spacing, radius, the type scale and the font
 * families. Values from docs/DESIGN.md. Plain data with no imports, like
 * `palettes.ts`: scripts/check-tokens.mjs reads it with Node to name the
 * token for a raw value.
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
  /** Tailwind's `px-4.5`: the medium Button's side padding. */
  4.5: 18,
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

/**
 * The first-run headline (the sign-in screen's «Mantenimiento con total
 * claridad»): Archivo 300, `tracking-[-0.025em]`, `leading-[1.12]`. Multiply
 * both by the font size.
 */
export const heroType = { tracking: -0.025, leading: 1.12 } as const;

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

/**
 * Fixed sizes (pt) of the UI kit's controls and art, from the PWA's
 * components (docs/DESIGN.md → Components). Heights are `minHeight`, never
 * `height`: a control grows with its text.
 */
export const size = {
  /** The minimum touch target. Anything smaller gets `hitSlop` up to it. */
  target: 44,
  /** Button heights: `h-9`, `h-11`, `h-14`. */
  control: { sm: 36, md: 44, lg: 56 },
  /** Text, number and select fields: `h-13`. */
  field: 52,
  /** Chips: `min-h-10`. */
  chip: 40,
  /** Status badges: `h-7`. */
  badge: 28,
  /** A tappable list row: `min-h-14`. */
  row: 56,
  /** Icon tiles: `size-9`, `size-11`, and the empty state's `size-16`. */
  tile: { sm: 36, md: 44, lg: 64 },
  /** Icon sides: `size-3.5` (badges), `size-4`, `size-5`, `size-6`, `size-7` (empty states). */
  icon: { xs: 14, sm: 16, md: 20, lg: 24, xl: 28 },
  /** A progress bar's track: `h-2`. */
  track: 8,
  /** A status dot beside a label: `size-1.5` (a pending task on a Service's task chip). */
  dot: 6,
  /** The longest comfortable line for centred body text: `max-w-[18rem]`. */
  readable: 288,
  /** The isotype's height. Its width follows its 658 × 444 proportions. */
  logo: { sm: 24, md: 44, lg: 72 },
  /** A body-type silhouette's width; its height follows its 240 × 96 proportions. */
  silhouette: { sm: 136, lg: 240 },
  /** A still hero image's height: the Vehicle on the sign-in screen (`h-48`). */
  hero: 192,
  /** The header's avatar, which opens Perfil: `size-9`, with `hitSlop` up to `target`. */
  avatar: 36,
  /** The floating [+] that opens the actions sheet: Material's 56 pt FAB (the PWA's dock button is 52). */
  fab: 56,
  /**
   * The tab bar's own height above the bottom safe area, which the floating
   * [+] sits on: NativeTabs can't be measured from JavaScript. iOS 26's
   * floating glass bar and Material 3's navigation bar; checked on both
   * platforms' screenshots (SEI-55).
   */
  tabBar: { ios: 49, android: 80 },
  /** Borders: the PWA's `ring-1` around fields and cards, `ring-2` on focus. */
  border: { thin: 1, focus: 2 },
  /**
   * The font size of the space Text hangs after its words on Android, so a
   * line is never cut (docs/DESIGN.md → Text that fits). Archivo's space is
   * 0.2 em, so 1.2 pt: wider than the pixel lost to rounding, too thin to see.
   */
  hangingSpace: 6,
} as const;

/** Opacities for states. Colours never change opacity for any other reason. */
export const opacity = {
  disabled: 0.5,
  /** Danger and inverse buttons, which have no pressed colour of their own. */
  pressed: 0.85,
  /** The low point of a skeleton's pulse. */
  skeleton: 0.55,
} as const;

/**
 * Motion, for Reanimated (docs/DESIGN.md → Motion). With Reduce Motion on,
 * none of it runs: components check `useReducedMotion()` first.
 */
export const motion = {
  /** Press feedback on buttons and chips: lands on press-in. */
  press: { duration: 120, scale: 0.97 },
  /** The skeleton's pulse, one way (it then reverses). */
  skeleton: { duration: 900 },
  /** A progress bar filling to its value on mount (the PWA's 0.7 s). */
  progress: { duration: 700 },
  /** Cubic-bézier control points: `cubicBezier(...motion.curve.out)`. */
  curve: {
    /** Strong ease-out, for press feedback. */
    out: [0.23, 1, 0.32, 1],
    /** The PWA's `--ease-smooth`: screen transitions and the progress fill. */
    smooth: [0.33, 1, 0.68, 1],
    /** The PWA's `--ease-spring`: small overshoots. */
    spring: [0.34, 1.4, 0.64, 1],
    /** Garage paint and accent crossfade. */
    paint: [0.2, 0.7, 0.2, 1],
  },
} as const;

/**
 * The system text scale from which rows stack instead of squeezing side by
 * side: iOS's accessibility sizes start near 1.35×, Android's largest
 * settings reach 2×.
 */
export const largeTextScale = 1.35;

/**
 * How far an icon grows with the system text size. Icons beside text grow
 * with it (as SF Symbols do in Apple's apps) up to twice their size; icons
 * in a fixed box (tiles, icon buttons) keep their size.
 */
export const maxIconScale = 2;
