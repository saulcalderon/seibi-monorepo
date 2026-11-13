// Inicio's stage (Garage v3) as React Native can draw it: the paint of the
// active Vehicle, its accent, and the stage's gradients as `backgroundImage`
// strings. Ported from the PWA's apps/app/src/lib/paint.ts and the
// `.garage-*` rules in apps/app/src/index.css. Raw colours live here, in the
// theme, so screens only call these functions.
import { paints, type GarageStage } from './palettes';

export type PaintCode = keyof typeof paints;

/** The paint's swatch; silver when the Vehicle has none or a code Seibi doesn't know. */
export function paintHex(code: string | null | undefined): string {
  return code && code in paints ? paints[code as PaintCode] : paints.silver;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba([r, g, b]: readonly [number, number, number], alpha: number) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A hex colour at an opacity, as `rgba()`. */
export function withAlpha(hex: string, alpha: number) {
  return rgba(rgb(hex), alpha);
}

// Paint → UI accent (Seibi v3). The active Vehicle's paint is the only
// accent on Inicio: the pager's dot and the interval bars. Low-chroma or very
// light paints fall back to a tinted graphite; the rest keep their hue with
// lightness capped so the accent passes 4.5:1 on white. The OKLCH maths is
// the PWA's, unchanged.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const unit = (x: number) => Math.min(1, Math.max(0, x));

function hexToOklch(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => toLinear(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToHex(L: number, C: number, H: number) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${linear.map((c) => Math.round(unit(toGamma(unit(c))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** The accent a paint gives Inicio (pager dot, interval bars). */
export function paintAccent(hex: string) {
  const { L, C, H } = hexToOklch(hex);
  if (C < 0.04 || L > 0.78) return oklchToHex(0.36, 0.02, H);
  return oklchToHex(Math.min(L, 0.5), Math.max(C, 0.12), H);
}

// ---------------------------------------------------------------------------
// The stage's gradients (`.garage-stage`, `-glow`, `-contact`, `-car.is-poster`)
// ---------------------------------------------------------------------------

/** The stage's floor and the light from above it. */
export function stageFloor(stage: GarageStage) {
  const [r, g, b, a] = stage.overhead;
  const [f0, f1, f2, f3] = stage.floor;
  return [
    `radial-gradient(64% 58% at 50% -4%, ${rgba([r, g, b], a)} 0%, ${rgba([r, g, b], 0)} 72%)`,
    `linear-gradient(180deg, ${f0} 0%, ${f1} 58%, ${f2} 66%, ${f3} 100%)`,
  ].join(', ');
}

/** The paint's light on the floor of its page (`color-mix(… var(--paint) 22%, transparent)`). */
export function paintTint(hex: string) {
  return `radial-gradient(44% 36% at 50% 62%, ${withAlpha(hex, 0.22)} 0%, ${withAlpha(hex, 0)} 72%)`;
}

/** The paint's glow under the Vehicle. */
export function paintGlow(hex: string) {
  return `radial-gradient(closest-side, ${withAlpha(hex, 0.34)}, ${withAlpha(hex, 0)})`;
}

/** The dark ellipse where a silhouette's tyres meet the floor. */
export function contactShadow(stage: GarageStage) {
  return `radial-gradient(closest-side, ${rgba(stage.contact, 0.48)}, ${rgba(stage.contact, 0)})`;
}

/** The stage's darker edges, drawn over the Vehicle. */
export function stageVignette(stage: GarageStage) {
  const [r, g, b, a] = stage.vignette;
  return `radial-gradient(115% 95% at 50% 38%, ${rgba([r, g, b], 0)} 55%, ${rgba([r, g, b], a)} 100%)`;
}

/** Fades a silhouette's reflection into the floor, as the PWA's mask does from half its height. */
export function reflectionFade(stage: GarageStage) {
  const floor = rgb(stage.floor[3]);
  return `linear-gradient(180deg, ${rgba(floor, 0)} 0%, ${rgba(floor, 1)} 50%)`;
}
