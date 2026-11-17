import type { TFunction } from 'i18next';

/**
 * Paint codes stored on `vehicles.color` (English, CONTEXT.md). Labels live in
 * es.json under `paint.<code>`; their colours are the theme's `art.paint`
 * (`src/theme/palettes.ts`). The Inicio accent comes with Inicio (S4).
 */
export const PAINT_CODES = [
  'white',
  'silver',
  'gray',
  'black',
  'red',
  'burgundy',
  'blue',
  'green',
  'yellow',
  'orange',
  'brown',
  'beige',
  'gold',
] as const;

export type PaintCode = (typeof PAINT_CODES)[number];

export function isPaintCode(code: string | null | undefined): code is PaintCode {
  return (PAINT_CODES as readonly (string | null | undefined)[]).includes(code);
}

/** The paint's name, or null for no paint or a code Seibi doesn't know. */
export function paintLabel(code: string | null | undefined, t: TFunction): string | null {
  return isPaintCode(code) ? t(`paint.${code}`) : null;
}

/** Paints light enough that the chosen swatch's check is drawn dark (the PWA's list). */
export const LIGHT_PAINTS: readonly PaintCode[] = ['white', 'silver', 'beige', 'yellow'];

/** A paint's colour from the theme (`theme.art.paint`), or `undefined` for none, so a silhouette stays silver. */
export function paintColor(code: string | null | undefined, swatches: Record<PaintCode, string>): string | undefined {
  return isPaintCode(code) ? swatches[code] : undefined;
}
