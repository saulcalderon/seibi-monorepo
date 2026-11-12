import type { ConfigContext, ExpoConfig } from 'expo/config';

// Text iOS draws for the app (permission prompts), outside i18next. One file
// per language, listed in `locales` below.
import nativeEs from './locales/es.json';

/**
 * The languages Seibi ships (src/i18n/languages.ts lists the same ones). The
 * OS draws its own text inside the app (permission prompts, system pickers)
 * in one of these, and offers only these in the per-app language setting.
 */
const LANGUAGES = ['es'];

/**
 * The EAS project that both variants share: one slug, one project id
 * (per-variant slugs break EAS). `eas init` prints the id; paste it here.
 * Until it is set, builds run locally only and EAS Update is off.
 */
const EAS_PROJECT_ID = '';

/**
 * Two installs that live side by side on one phone, picked by
 * EXPO_PUBLIC_APP_VARIANT. Each has its own URL scheme so deep links reach
 * the right one. The `preview` EAS profile builds `production`.
 */
const VARIANTS = {
  development: { name: 'Seibi Dev', id: 'com.seibiapp.app.dev', scheme: 'seibi-dev' },
  production: { name: 'Seibi', id: 'com.seibiapp.app', scheme: 'seibi' },
} as const;

type AppVariant = keyof typeof VARIANTS;

function appVariant(): AppVariant {
  // Unset means production, so an `eas update` run without the variable
  // can never ship development behaviour to store builds.
  const value = process.env.EXPO_PUBLIC_APP_VARIANT ?? 'production';
  if (value === 'development' || value === 'production') return value;
  throw new Error(`EXPO_PUBLIC_APP_VARIANT must be "development" or "production"; got "${value}".`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variantName = appVariant();
  const variant = VARIANTS[variantName];

  return {
    ...config,
    name: variant.name,
    slug: 'seibi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: variant.scheme,
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'fingerprint' },
    ios: {
      bundleIdentifier: variant.id,
      supportsTablet: false,
      config: { usesNonExemptEncryption: false },
      // Spanish is the source language, also for the native strings.
      infoPlist: { CFBundleDevelopmentRegion: 'es' },
    },
    android: {
      package: variant.id,
      adaptiveIcon: {
        backgroundColor: '#F2F4F7',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Only React Native's old debug overlay used it; Play asks every app that declares it why.
      blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    },
    locales: { es: './locales/es.json' },
    plugins: [
      // Colours come from the Unistyles theme, which updates natively; Expo
      // Router's own re-render of every screen on a colour-scheme change
      // (for its `Color` API) is not needed (SEI-42).
      ['expo-router', { adaptiveColors: false }],
      ['expo-localization', { supportedLocales: LANGUAGES }],
      // The dev client opens through `exp+seibi://`. Only Seibi Dev claims it,
      // so `expo start` never opens the store app by mistake.
      ['expo-dev-client', { addGeneratedScheme: variantName === 'development' }],
      [
        'expo-splash-screen',
        {
          // The PWA's splash is light in both themes (first-run screens stay light).
          backgroundColor: '#F2F4F7',
          image: './assets/images/splash-icon.png',
          imageWidth: 160,
        },
      ],
      [
        'expo-image-picker',
        {
          // Invoice photo on a Service (S12, SEI-67) ships by OTA, so the module is in the first binary.
          photosPermission: nativeEs.ios.NSPhotoLibraryUsageDescription,
          cameraPermission: nativeEs.ios.NSCameraUsageDescription,
          microphonePermission: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    ...(EAS_PROJECT_ID
      ? {
          extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } },
          updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
        }
      : {
          updates: { enabled: false },
        }),
  };
};
