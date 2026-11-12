import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Everything that needs a session. The root layout opens this group only
// while signed in (Stack.Protected). The app shell (SEI-55) replaces this
// stack with the tabs.
export default function AppLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
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
