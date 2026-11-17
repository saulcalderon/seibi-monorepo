import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScopedTheme, useUnistyles } from 'react-native-unistyles';

import { FirstRunProvider } from '@/onboarding/state';

/**
 * The first-run questions (Onboarding, S3): one screen per step in a native
 * stack, so the system's back (the edge swipe, Android's back) returns to
 * the step before, as the PWA's swipe did. The root layout opens this group
 * while the profile has no `onboarded_at` and leaves it once the last step
 * saves one. A first-run screen, so it stays on the light Garage palette in
 * night too (docs/DESIGN.md → Color), like Login.
 */
export default function FirstRunLayout() {
  return (
    <ScopedTheme name="garage">
      <FirstRunProvider>
        <StatusBar style="dark" />
        <FirstRunStack />
      </FirstRunProvider>
    </ScopedTheme>
  );
}

function FirstRunStack() {
  const { theme } = useUnistyles();
  const ios = process.env.EXPO_OS === 'ios';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="level" />
      <Stack.Screen name="check" />
      <Stack.Screen name="result" />
      <Stack.Screen name="location" />
      <Stack.Screen name="vehicle" />
      {/* «Agrega tu Vehículo»'s make, year and model picker, as in the Vehicle modal. */}
      <Stack.Screen
        name="pick"
        options={{
          headerShown: true,
          headerTransparent: ios,
          headerShadowVisible: false,
          headerStyle: ios ? undefined : { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontFamily: theme.fonts.display, color: theme.colors.ink },
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: false,
        }}
      />
      <Stack.Screen name="usage" />
      <Stack.Screen name="history" />
      <Stack.Screen name="notifications" />
      {/* «Se guardó tu información»: a one-way door, Inicio follows on its own. */}
      <Stack.Screen name="done" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
