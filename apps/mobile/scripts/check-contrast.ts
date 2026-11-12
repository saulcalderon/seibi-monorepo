/**
 * check-contrast: fails when a text colour in one of Seibi's palettes
 * (src/theme/palettes.ts: light, night, garage) is below WCAG 2.2 AA on a
 * background it sits on: 4.5:1 for text, 3:1 for the non-text status and
 * brand colours (dots, bars, icons, focus rings). The pairs are
 * docs/DESIGN.md → Accessibility; add a pair here when a role starts sitting
 * on a new background.
 *
 * Translucent fills (night's soft badges) are drawn over each surface a badge
 * can sit on (bg, surface, surface2) and measured on every one.
 *
 * Run it with `pnpm check` at the repo root, or alone with
 * `node --no-warnings scripts/check-contrast.ts` in apps/mobile (Node strips
 * the types).
 *
 * Adapted from Paradero's scripts/check-contrast.ts, under its licence:
 *
 * MIT License
 *
 * Copyright (c) 2026 Croma and the Paradero contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { palettes, type Palette } from '../src/theme/palettes.ts';

type Role = keyof Palette;
type Rgba = [number, number, number, number];

function parse(color: string): Rgba {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as Rgba;
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) throw new Error(`check-contrast can't read the colour ${color}: write it as #rrggbb or rgba(r, g, b, a).`);
  const [r, g, b, a = 1] = rgba[1].split(',').map(Number);
  return [r, g, b, a];
}

/** A colour drawn over an opaque one. */
function over([r, g, b, a]: Rgba, [ur, ug, ub]: Rgba): Rgba {
  return [r * a + ur * (1 - a), g * a + ug * (1 - a), b * a + ub * (1 - a), 1];
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(over(fg, bg)), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Where content sits: the screen, cards and sheets, nested rows. */
const SURFACES = ['bg', 'surface', 'surface2'] as const satisfies Role[];

/**
 * Each text role and the backgrounds it sits on. `soft` is its badge fill,
 * measured over each of SURFACES.
 */
const TEXT: { fg: Role; on: readonly Role[]; soft?: Role; why: string }[] = [
  { fg: 'ink', on: [...SURFACES, 'surface3'], why: 'primary text, also on controls' },
  { fg: 'muted', on: [...SURFACES, 'surface3'], why: 'secondary text, also on controls' },
  { fg: 'subtle', on: SURFACES, why: 'tertiary text' },
  { fg: 'radiantText', on: SURFACES, soft: 'radiantSoft', why: 'radiant text and links' },
  { fg: 'okText', on: SURFACES, soft: 'okSoft', why: '«Al día» text' },
  { fg: 'soonText', on: SURFACES, soft: 'soonSoft', why: '«Por vencer» text' },
  { fg: 'overdueText', on: SURFACES, soft: 'overdueSoft', why: '«Vencido» text' },
  { fg: 'unknownText', on: SURFACES, soft: 'unknownSoft', why: 'unknown-status text' },
  { fg: 'onInverse', on: ['inverse', 'overdue'], why: 'text on inverse surfaces and the error toast' },
  { fg: 'onRadiant', on: ['radiantStrong', 'radiantPressed'], why: 'the primary button label' },
];

/** Non-text colours (WCAG 1.4.11): dots, bars, icons and focus rings on SURFACES. */
const NON_TEXT: Role[] = ['radiant', 'ok', 'soon', 'overdue', 'unknown'];

interface Pair {
  palette: string;
  fg: Role;
  bg: string;
  value: number;
  min: number;
  why: string;
}

const pairs: Pair[] = Object.entries(palettes).flatMap(([name, palette]) => {
  const color = (role: Role) => parse(palette[role]);
  const measure = (fg: Role, bg: string, bgColor: Rgba, min: number, why: string): Pair => ({
    palette: name,
    fg,
    bg,
    value: ratio(color(fg), bgColor),
    min,
    why,
  });
  return [
    ...TEXT.flatMap(({ fg, on, soft, why }) => [
      ...on.map((bg) => measure(fg, bg, over(color(bg), parse('#ffffff')), 4.5, why)),
      ...(soft ? SURFACES.map((base) => measure(fg, `${soft} over ${base}`, over(color(soft), color(base)), 4.5, why)) : []),
    ]),
    ...NON_TEXT.flatMap((fg) => SURFACES.map((bg) => measure(fg, bg, color(bg), 3, 'non-text: dots, bars, icons'))),
  ];
});

const failures = pairs.filter((pair) => pair.value < pair.min);

if (failures.length > 0) {
  const rows = failures.map(
    (p) => `  ${p.palette}: ${p.fg} on ${p.bg} is ${p.value.toFixed(2)}:1, needs ${p.min}:1 (${p.why})`,
  );
  console.error(
    [
      `check-contrast: ${failures.length} ${failures.length === 1 ? 'pair is' : 'pairs are'} below WCAG 2.2 AA in apps/mobile/src/theme/palettes.ts:`,
      '',
      ...rows,
      '',
      'Fix: change the text role, not the background or the fill. Keep its hue and saturation and move its lightness',
      '(darker on light palettes, lighter on night) until it reaches 4.6:1 on every background listed for it here;',
      "then update the role's value in docs/DESIGN.md (Color, and the Accessibility table).",
    ].join('\n'),
  );
  process.exit(1);
}

const worst = Object.keys(palettes).map((name) => {
  const text = pairs.filter((p) => p.palette === name && p.min === 4.5).sort((a, b) => a.value - b.value)[0];
  return `${name} ${text.value.toFixed(2)} (${text.fg} on ${text.bg})`;
});
console.log(
  `check-contrast: ${pairs.length} pairs in ${Object.keys(palettes).length} palettes pass WCAG 2.2 AA. Lowest text pair: ${worst.join('; ')}.`,
);
