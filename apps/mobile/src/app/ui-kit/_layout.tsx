import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

/**
 * The UI kit's sample screens (SEI-54): every component on one screen, plus
 * a form in a sheet. For development builds only. The variant is inlined at
 * bundle time and an unset one means production (ARCHITECTURE.md →
 * Variants), so in Seibi, a preview build or any EAS Update without it, the
 * route only redirects home and none of the samples mount.
 *
 * Open it in Seibi Dev with `seibi-dev://ui-kit`.
 */
export default function UIKitLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  if (process.env.EXPO_PUBLIC_APP_VARIANT !== 'development') return <Redirect href="/" />;

  const header = {
    headerStyle: { backgroundColor: theme.colors.bg },
    headerTintColor: theme.colors.ink,
    headerTitleStyle: { fontFamily: theme.fonts.display },
    headerShadowVisible: false,
  };
  return (
    <>
      {/* The root stack's header for this route, so its native back button returns to where the link opened. */}
      <Stack.Screen options={{ headerShown: true, title: t('uiKit.title'), headerBackButtonDisplayMode: 'minimal', ...header }} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="form"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true, sheetCornerRadius: theme.radius['3xl'] }}
        />
      </Stack>
    </>
  );
}
