import { StyleSheet } from 'react-native-unistyles';

import { art, garageStage, palettes, shadows, type PaletteName } from './palettes';
import { applyNativeScheme, getThemePreference, unistylesThemeFor } from './preference';
import { displayTracking, fonts, garageType, heroType, largeTextScale, maxIconScale, opacity, radius, size, space, typeScale } from './tokens';

/**
 * Seibi's Unistyles themes. Imported once, from the app entry (`index.ts`),
 * before any `StyleSheet.create` runs.
 *
 * Components read roles from the theme in `StyleSheet.create((theme) => …)`
 * and never write a raw colour or size. A theme change (the phone's, or the
 * person's preference) updates the styles natively, without re-rendering
 * React; only components that call `useUnistyles()` re-render.
 */
function themeFrom(palette: PaletteName) {
  return {
    colors: palettes[palette],
    shadow: shadows[palette],
    art: art[palette],
    /** Inicio's stage colours (Garage v3). */
    garage: garageStage[palette],
    space,
    radius,
    size,
    opacity,
    type: typeScale,
    fonts,
    displayTracking,
    heroType,
    garageType,
    largeTextScale,
    maxIconScale,
  };
}

/**
 * `light` and `dark` follow the system (Unistyles reserves those two names
 * for adaptive themes; `dark` is the night palette). `garage` is the light
 * Garage palette, applied to a subtree with `<ScopedTheme name="garage">`.
 */
export const themes = {
  light: themeFrom('light'),
  dark: themeFrom('night'),
  garage: themeFrom('garage'),
};

type AppThemes = typeof themes;

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Unistyles' documented way to type the themes.
  export interface UnistylesThemes extends AppThemes {}
}

const preference = getThemePreference();

StyleSheet.configure({
  themes,
  settings:
    preference === 'system' ? { adaptiveThemes: true } : { initialTheme: unistylesThemeFor(preference) },
});

if (preference !== 'system') applyNativeScheme(preference);
