import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import { parseThemePreference, THEME_PREFERENCES, themePlan } from './theme-choice';

describe('THEME_PREFERENCES', () => {
  it('lists the PWA\'s «Tema» in its order: Auto · Claro · Oscuro', () => {
    expect(THEME_PREFERENCES.map((p) => t(`theme.${p}`))).toEqual(['Auto', 'Claro', 'Oscuro']);
  });
});

describe('parseThemePreference', () => {
  it('reads a saved fixed choice', () => {
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('night')).toBe('night');
  });

  it('follows the phone when nothing, or something unknown, is saved', () => {
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('dark')).toBe('system');
    expect(parseThemePreference('day')).toBe('system');
  });
});

describe('themePlan', () => {
  it('Auto follows the phone: adaptive themes on, React Native\'s scheme released, nothing stored', () => {
    expect(themePlan('system')).toEqual({ stored: null, adaptive: true, theme: null, nativeScheme: 'unspecified' });
  });

  it('Oscuro fixes the night palette (Unistyles\' `dark`) and the native views\' scheme', () => {
    expect(themePlan('night')).toEqual({ stored: 'night', adaptive: false, theme: 'dark', nativeScheme: 'dark' });
  });

  it('Claro fixes the light palette and the native views\' scheme', () => {
    expect(themePlan('light')).toEqual({ stored: 'light', adaptive: false, theme: 'light', nativeScheme: 'light' });
  });

  it('stores what it reads back', () => {
    for (const preference of THEME_PREFERENCES) expect(parseThemePreference(themePlan(preference).stored)).toBe(preference);
  });
});
