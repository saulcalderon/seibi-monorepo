import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { ProfileButton } from './profile-button';

export type TabRoot = 'index' | 'fleet' | 'reminders';

/**
 * The stack inside each tab (after Paradero's `src/components/tab-stack.tsx`,
 * MIT): the tab's first screen under a large title with the avatar, then the
 * screens opened from it. A Vehicle or Perfil opens inside the tab you are
 * in, so the tab bar and the [+] stay on screen however deep you go, and
 * each tab keeps its place while you visit another.
 */
export function TabStack({ root, title }: { root: TabRoot; title: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const ios = process.env.EXPO_OS === 'ios';
  return (
    <Stack
      screenOptions={{
        // iOS 26 draws the header as glass over the content; Android's is a plain bar on the screen's background.
        headerTransparent: ios,
        headerShadowVisible: false,
        headerStyle: ios ? undefined : { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontFamily: theme.fonts.display, color: theme.colors.ink },
        headerLargeTitleStyle: { fontFamily: theme.fonts.display, color: theme.colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        headerBackButtonMenuEnabled: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name={root} options={{ title, headerLargeTitleEnabled: true, headerRight: () => <ProfileButton /> }} />
      <Stack.Screen name="vehicle/[id]" options={{ title: '' }} />
      <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
    </Stack>
  );
}
