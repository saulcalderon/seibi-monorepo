/**
 * Every colour and shadow in Seibi, as plain data. Values come from
 * docs/DESIGN.md (the PWA's apps/app/src/index.css, with the contrast fixes
 * to text roles decided on 2026-11-11 for light and 2026-11-12 for night).
 *
 * This file has no imports on purpose: the contrast check
 * (scripts/check-contrast.ts) reads it directly with Node, and fails on a
 * text pair below WCAG 2.2 AA. Components never import it; they read the same roles
 * from the Unistyles theme (`theme.colors.ink`), so no hex is written outside
 * `src/theme/`.
 *
 * Translucent colours use `rgba()`, the same values as the PWA's
 * `rgb(r g b / a%)`.
 */

export interface Palette {
  /** Brand accent for non-text: focus rings, active indicators, icons. */
  radiant: string;
  /** Primary button fill (white text). */
  radiantStrong: string;
  /** Pressed primary button. */
  radiantPressed: string;
  /** Radiant-coloured text and links. */
  radiantText: string;
  /** Brand-tinted backgrounds. */
  radiantSoft: string;
  /** Screen background. */
  bg: string;
  /** Cards, sheets. */
  surface: string;
  /** Nested surfaces, hover rows. */
  surface2: string;
  /** Controls, tracks, skeletons. */
  surface3: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Tertiary text, chevrons. */
  subtle: string;
  /** Hairlines, card borders. */
  line: string;
  /** Inverse surfaces. */
  inverse: string;
  /** Text on `inverse`. */
  onInverse: string;
  /** Text on `radiantStrong` and `radiantPressed`: the primary button's label. */
  onRadiant: string;
  /** Reminder status «Al día»: dots, bars, icons. */
  ok: string;
  okSoft: string;
  /** «Al día» text, on surfaces and on `okSoft` badges. */
  okText: string;
  /** Reminder status «Por vencer»: dots, bars, icons. */
  soon: string;
  soonSoft: string;
  /** «Por vencer» text, on surfaces and on `soonSoft` badges. */
  soonText: string;
  /** Reminder status «Vencido»: dots, bars, icons. */
  overdue: string;
  overdueSoft: string;
  /** «Vencido» text, on surfaces, on `bg` and on `overdueSoft` badges. */
  overdueText: string;
  /** Reminder status unknown (no last Service known). */
  unknown: string;
  unknownSoft: string;
  /** Unknown-status text; the base colour already passes AA, so it is the same. */
  unknownText: string;
}

/** The two shadows. React Native's `boxShadow` (New Architecture) takes these strings. */
export interface Shadows {
  /** Cards and selected segments. */
  card: string;
  /** Floating controls and sheets. */
  float: string;
  /** The primary button's radiant glow (`shadow-[0_8px_20px_rgb(232_83_34/28%)]`). */
  primary: string;
}

/**
 * Colours of the vector art (the isotype, the body-type silhouettes), which
 * keep the PWA's own values: they are drawings, not UI roles, and none of
 * them carries text.
 */
export interface Art {
  /** The isotype's S and its four accent ticks (`--seibi-mark-accent`). */
  logoAccent: string;
  /** Its neutral ticks, which follow the theme (`--seibi-mark-tick`). */
  logoTick: string;
  /** The neutral ticks when the isotype sits on a light or a dark surface whatever the theme. */
  logoTickOnLight: string;
  logoTickOnDark: string;
  /** A silhouette's paint when the Vehicle has none (the PWA's `paintHex(null)`, silver). */
  carPaint: string;
  /** Its outline, windows, tyres, rims and hubs. */
  carOutline: string;
  carGlass: string;
  carTire: string;
  carRim: string;
  carHub: string;
  /** The ground shadow under it (`fill-ink/10`). */
  carGround: string;
  /** The sheen gradient: light at the top, dark at the bottom. */
  carSheenLight: string;
  carSheenDark: string;
  /** The wordmark's square dot over the «ı» (`bg-[#e0464f]` in the PWA's Lockup). */
  wordmarkDot: string;
  /**
   * Google's sign-in button, light style, as Google's branding guidelines
   * fix it: fill, 1 pt inside stroke, text, and the four colours of the «G».
   * Not Seibi's roles: they never change with the theme.
   */
  googleFill: string;
  googleStroke: string;
  googleText: string;
  googleBlue: string;
  googleGreen: string;
  googleYellow: string;
  googleRed: string;
  /**
   * The 13 paint presets a Vehicle can have (`vehicles.color`), as the PWA
   * draws them (`apps/app/src/lib/paint.ts`): the Vehicle form's swatches and
   * a silhouette's paint. They never carry text.
   */
  paint: Record<PaintSwatch, string>;
  /** A swatch's hairline, so white and beige show on a white surface (`ring-black/10`). */
  paintRing: string;
  /** The check on the chosen swatch: dark on the light paints, white on the rest. */
  paintCheckOnLight: string;
  paintCheckOnDark: string;
}

/** The paint codes (`src/lib/paint.ts` → `PAINT_CODES`), kept here too so this file has no imports. */
export type PaintSwatch =
  | 'white'
  | 'silver'
  | 'gray'
  | 'black'
  | 'red'
  | 'burgundy'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'brown'
  | 'beige'
  | 'gold';

export const light: Palette = {
  radiant: '#e85322',
  radiantStrong: '#c9431a',
  radiantPressed: '#b83d18',
  radiantText: '#c14019',
  radiantSoft: '#fdeee8',
  bg: '#f2f4f7',
  surface: '#ffffff',
  surface2: '#f7f8fa',
  surface3: '#eceef2',
  ink: '#141517',
  muted: '#5b606a',
  subtle: '#686e79',
  line: 'rgba(20, 21, 23, 0.08)',
  inverse: '#141517',
  onInverse: '#f2f4f7',
  onRadiant: '#ffffff',
  ok: '#178a55',
  okSoft: '#e3f5ec',
  okText: '#157c4c',
  soon: '#b86e00',
  soonSoft: '#fdf1dc',
  soonText: '#9d5e00',
  overdue: '#d0342a',
  overdueSoft: '#fde8e6',
  overdueText: '#c63128',
  unknown: '#5b606a',
  unknownSoft: '#eceef2',
  unknownText: '#5b606a',
};

/**
 * The PWA's night, with two text roles lightened (same hue and saturation)
 * until they reach 4.6:1 on every background they sit on: `subtle` (was
 * #7c828c, 4.27 on `surface2`) and `radiantText` (was the `radiant` base,
 * 3.74 on `radiantSoft` over `surface2`). Every other text role equals its
 * base colour, which already passes.
 */
export const night: Palette = {
  radiant: '#e85322',
  radiantStrong: '#c9431a',
  radiantPressed: '#b83d18',
  radiantText: '#ec7148',
  radiantSoft: 'rgba(232, 83, 34, 0.16)',
  bg: '#0e0f11',
  surface: '#17181b',
  surface2: '#1d1f23',
  surface3: '#26282d',
  ink: '#f2f4f7',
  muted: '#a3a8b1',
  subtle: '#828891',
  line: 'rgba(242, 244, 247, 0.09)',
  inverse: '#f2f4f7',
  onInverse: '#141517',
  onRadiant: '#ffffff',
  ok: '#3ccf8a',
  okSoft: 'rgba(60, 207, 138, 0.14)',
  okText: '#3ccf8a',
  soon: '#f2b544',
  soonSoft: 'rgba(242, 181, 68, 0.14)',
  soonText: '#f2b544',
  overdue: '#ff6b5e',
  overdueSoft: 'rgba(255, 107, 94, 0.15)',
  overdueText: '#ff6b5e',
  unknown: '#a3a8b1',
  unknownSoft: 'rgba(163, 168, 177, 0.14)',
  unknownText: '#a3a8b1',
};

/**
 * Garage (Inicio v3 and the Intro): its own light palette (`.v3`,
 * `.intro-v3` in the PWA). Red is only for «Vencido», and its red passes AA
 * as text, so `overdueText` equals `overdue`. `muted` is darkened (same hue
 * and saturation) from the PWA's #6b6e74, 4.03 on `surface3`, to reach 4.6:1
 * there. Night is not art-directed for Garage: in night, Garage uses `night`.
 */
export const garage: Palette = {
  ...light,
  bg: '#f1f1f2',
  surface: '#ffffff',
  surface2: '#f4f4f5',
  surface3: '#e4e4e6',
  ink: '#0e0f11',
  muted: '#62656b',
  subtle: '#6a6c72',
  line: 'rgba(14, 15, 17, 0.08)',
  inverse: '#0e0f11',
  onInverse: '#ffffff',
  overdue: '#ad2831',
  overdueSoft: '#f8e6e7',
  overdueText: '#ad2831',
};

export const palettes = { light, night, garage } as const;

export type PaletteName = keyof typeof palettes;

/** The PWA draws the primary button's glow the same in every theme. */
const PRIMARY_GLOW = '0 8px 20px rgba(232, 83, 34, 0.28)';

export const shadows: Record<PaletteName, Shadows> = {
  light: {
    card: '0 1px 2px rgba(20, 21, 23, 0.04), 0 10px 28px rgba(20, 21, 23, 0.06)',
    float: '0 12px 40px rgba(20, 21, 23, 0.16), 0 2px 6px rgba(20, 21, 23, 0.08)',
    primary: PRIMARY_GLOW,
  },
  night: {
    card: 'inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 10px 28px rgba(0, 0, 0, 0.35)',
    float: '0 16px 44px rgba(0, 0, 0, 0.55)',
    primary: PRIMARY_GLOW,
  },
  garage: {
    card: '0 1px 2px rgba(14, 15, 17, 0.04), 0 10px 28px rgba(14, 15, 17, 0.06)',
    float: '0 12px 40px rgba(14, 15, 17, 0.16), 0 2px 6px rgba(14, 15, 17, 0.08)',
    primary: PRIMARY_GLOW,
  },
};

/** The art's colours that don't change with the theme (apps/app/src/components). */
const CAR = {
  carPaint: '#c3c7cd',
  carOutline: 'rgba(0, 0, 0, 0.18)',
  carGlass: '#1d2430',
  carTire: '#15161a',
  carRim: '#b9bec6',
  carHub: '#3a3d44',
  carSheenLight: '#ffffff',
  carSheenDark: '#000000',
};
const LOGO = { logoAccent: '#ec3a27', logoTickOnLight: '#1f1f1f', logoTickOnDark: '#ffffff', wordmarkDot: '#e0464f' };
/** developers.google.com/identity/branding-guidelines: the light button and the standard «G». */
const GOOGLE = {
  googleFill: '#ffffff',
  googleStroke: '#747775',
  googleText: '#1f1f1f',
  googleBlue: '#4285f4',
  googleGreen: '#34a853',
  googleYellow: '#fbbc05',
  googleRed: '#ea4335',
};

/** The PWA's `PAINTS` (apps/app/src/lib/paint.ts), the same in every theme. */
const PAINT = {
  paint: {
    white: '#f4f5f7',
    silver: '#c3c7cd',
    gray: '#6d7178',
    black: '#16171a',
    red: '#c8261d',
    burgundy: '#6b1a24',
    blue: '#1f4f9a',
    green: '#2f6b45',
    yellow: '#e9c030',
    orange: '#e8702a',
    brown: '#6b4a32',
    beige: '#d8c7a6',
    gold: '#b8964d',
  },
  paintRing: 'rgba(0, 0, 0, 0.1)',
  paintCheckOnLight: '#000000',
  paintCheckOnDark: '#ffffff',
} satisfies Pick<Art, 'paint' | 'paintRing' | 'paintCheckOnLight' | 'paintCheckOnDark'>;

export const art: Record<PaletteName, Art> = {
  light: { ...LOGO, ...CAR, ...GOOGLE, ...PAINT, logoTick: LOGO.logoTickOnLight, carGround: 'rgba(20, 21, 23, 0.1)' },
  night: { ...LOGO, ...CAR, ...GOOGLE, ...PAINT, logoTick: LOGO.logoTickOnDark, carGround: 'rgba(242, 244, 247, 0.1)' },
  garage: { ...LOGO, ...CAR, ...GOOGLE, ...PAINT, logoTick: LOGO.logoTickOnLight, carGround: 'rgba(14, 15, 17, 0.1)' },
};
