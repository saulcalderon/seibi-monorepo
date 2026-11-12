import { Stack } from 'expo-router';

// Everything that needs a session. The root layout opens this group only
// while signed in (Stack.Protected). The app shell (SEI-55) replaces this
// stack with the tabs.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
