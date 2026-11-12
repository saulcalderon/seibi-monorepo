import type { TFunction } from 'i18next';

/**
 * Paint codes stored on `vehicles.color` (English, CONTEXT.md). Labels live in
 * es.json under `paint.<code>`. The swatches and the Inicio accent come with
 * the screens that draw them (S4, S5), in the theme.
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
