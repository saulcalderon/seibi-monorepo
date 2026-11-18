import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';

import { parseThemePreference, themePlan, type ThemePreference } from './theme-choice';

export { THEME_PREFERENCES, type ThemePreference } from './theme-choice';

/*
 * The theme the person picked (`theme-choice.ts`), stored in the expo-sqlite
 * kv-store (never AsyncStorage) and read synchronously, so `unistyles.ts`
 * applies it before the first render and a cold start never flashes the
 * other theme.
 */

const KEY = 'theme.v1';

let current: ThemePreference = parseThemePreference(Storage.getItemSync(KEY));
const listeners = new Set<() => void>();

export function getThemePreference(): ThemePreference {
  return current;
}

/** Saves the preference and applies it at once. Styles update without re-rendering React. */
export function setThemePreference(next: ThemePreference) {
  if (next === current) return;
  current = next;
  const plan = themePlan(next);
  if (plan.stored === null) Storage.removeItemSync(KEY);
  else Storage.setItemSync(KEY, plan.stored);
  // Native views follow React Native's scheme. Native first, so when Unistyles goes back to following the system it reads the phone's scheme.
  Appearance.setColorScheme(plan.nativeScheme);
  UnistylesRuntime.setAdaptiveThemes(plan.adaptive);
  if (plan.theme) UnistylesRuntime.setTheme(plan.theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The saved preference, for Perfil's «Tema» control. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference);
}
