import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

/** A link straight to a sheet still opens it over the tabs, so closing it leaves you in the app. */
export const unstable_settings = { anchor: '(tabs)' };

// Everything that needs a session. The root layout opens this group only
// while signed in (Stack.Protected). The tabs are its first screen; the
// actions sheet and the forms it opens are presented over them as native
// form sheets.
export default function AppLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: theme.radius['3xl'],
    contentStyle: { backgroundColor: theme.colors.bg },
  } as const;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="actions" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      {/* Placeholders until the Service form (S7) and the Mileage form (S8) take these routes. */}
      <Stack.Screen name="record-service" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="update-mileage" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      {/* The data check screen exists in Seibi Dev (the development variant) only. */}
      <Stack.Protected guard={process.env.EXPO_PUBLIC_APP_VARIANT === 'development'}>
        <Stack.Screen
          name="data-check"
          options={{ headerShown: true, title: t('dataCheck.title'), headerBackButtonDisplayMode: 'minimal' }}
        />
      </Stack.Protected>
    </Stack>
  );
}
