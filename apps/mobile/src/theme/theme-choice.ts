// The «Tema» choice as plain data: what is stored and what each choice
// applies. `preference.ts` carries it out on the phone (the kv-store,
// Unistyles, React Native's colour scheme); this file has no native imports,
// so the unit tests read it.

/**
 * The theme the person picked: follow the phone (`system`, the default),
 * or always `light` or `night`. The PWA's Perfil calls these Auto, Claro and
 * Oscuro (`theme.<preference>` in es.json), in this order.
 */
export const THEME_PREFERENCES = ['system', 'light', 'night'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** The stored value (`theme.v1`) as a preference: anything but a fixed choice follows the phone. */
export function parseThemePreference(saved: string | null): ThemePreference {
  return saved === 'light' || saved === 'night' ? saved : 'system';
}

type SystemPlan = { stored: null; adaptive: true; theme: null; nativeScheme: 'unspecified' };
type FixedPlan = { stored: 'light' | 'night'; adaptive: false; theme: 'light' | 'dark'; nativeScheme: 'light' | 'dark' };

/**
 * What a preference applies:
 * - `stored`: the kv-store value, `null` to remove it (Auto is the default);
 * - `adaptive`: whether Unistyles follows the phone;
 * - `theme`: the Unistyles theme for a fixed choice. Unistyles reserves the
 *   names `light` and `dark` for following the system, so the night palette
 *   is registered as `dark`;
 * - `nativeScheme`: React Native's colour scheme, which native views (alerts,
 *   `@expo/ui` controls, the status bar) follow.
 */
export function themePlan(preference: ThemePreference): SystemPlan | FixedPlan {
  if (preference === 'system') return { stored: null, adaptive: true, theme: null, nativeScheme: 'unspecified' } as const;
  const theme = preference === 'night' ? 'dark' : 'light';
  return { stored: preference, adaptive: false, theme, nativeScheme: theme } as const;
}
