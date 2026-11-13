import { describe, expect, it } from 'vitest';

import { paintAccent, paintHex, paintTint, stageFloor, withAlpha } from './garage';
import { garageStage, paints } from './palettes';

// What the PWA's apps/app/src/lib/paint.ts returns for each preset (run with
// Node on 2026-11-12): the port must give the same accents.
const PWA_ACCENTS: Record<keyof typeof paints, string> = {
  white: '#383d48',
  silver: '#373e48',
  gray: '#373d48',
  black: '#393d48',
  red: '#ba100c',
  burgundy: '#6d1622',
  blue: '#1f4f9a',
  green: '#036f3b',
  yellow: '#413d31',
  orange: '#ab3700',
  brown: '#823c00',
  beige: '#423c31',
  gold: '#835c00',
};

describe('paint', () => {
  it('keeps the 13 presets', () => {
    expect(Object.keys(paints)).toHaveLength(13);
  });

  it('falls back to silver for no paint or an unknown code', () => {
    expect(paintHex(null)).toBe(paints.silver);
    expect(paintHex('teal')).toBe(paints.silver);
    expect(paintHex('red')).toBe(paints.red);
  });

  it.each(Object.entries(PWA_ACCENTS))('gives %s the PWA accent', (code, accent) => {
    expect(paintAccent(paintHex(code))).toBe(accent);
  });
});

describe('stage gradients', () => {
  it('writes colours React Native parses', () => {
    expect(withAlpha('#c8261d', 0.22)).toBe('rgba(200, 38, 29, 0.22)');
    expect(paintTint('#c8261d')).toBe('radial-gradient(44% 36% at 50% 62%, rgba(200, 38, 29, 0.22) 0%, rgba(200, 38, 29, 0) 72%)');
  });

  it('puts the light above the floor, as the PWA layers them', () => {
    const floor = stageFloor(garageStage.garage);
    expect(floor.indexOf('radial-gradient')).toBeLessThan(floor.indexOf('linear-gradient'));
    expect(floor).toContain('#f7f7f8 0%, #ededef 58%, #e3e3e6 66%, #efeff1 100%');
  });
});
