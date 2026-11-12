import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';

/**
 * The theme the person picked: follow the phone (`system`, the default),
 * or always `light` or `night`. The PWA's Perfil calls these Auto, Claro and
 * Oscuro.
 *
 * Stored in the expo-sqlite kv-store (never AsyncStorage) and read
 * synchronously, so `unistyles.ts` applies it before the first render and a
 * cold start never flashes the other theme.
 */
export type ThemePreference = 'system' | 'light' | 'night';

const KEY = 'theme.v1';

function read(): ThemePreference {
  const saved = Storage.getItemSync(KEY);
  return saved === 'light' || saved === 'night' ? saved : 'system';
}

let current: ThemePreference = read();
const listeners = new Set<() => void>();

export function getThemePreference(): ThemePreference {
  return current;
}

/**
 * The Unistyles theme for a fixed preference. Unistyles reserves the names
 * `light` and `dark` for following the system, so the night palette is
 * registered as `dark`.
 */
export function unistylesThemeFor(preference: 'light' | 'night') {
  return preference === 'night' ? 'dark' : 'light';
}

/**
 * Native views (alerts, `@expo/ui` controls, the status bar) follow React
 * Native's colour scheme, so a fixed preference overrides it too.
 */
export function applyNativeScheme(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference === 'night' ? 'dark' : 'light');
}

/** Saves the preference and applies it at once. Styles update without re-rendering React. */
export function setThemePreference(next: ThemePreference) {
  if (next === current) return;
  current = next;
  if (next === 'system') Storage.removeItemSync(KEY);
  else Storage.setItemSync(KEY, next);
  // Native first, so when Unistyles goes back to following the system it reads the phone's scheme.
  applyNativeScheme(next);
  if (next === 'system') {
    UnistylesRuntime.setAdaptiveThemes(true);
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(unistylesThemeFor(next));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The saved preference, for the control that changes it (Perfil, S11). */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference);
}
