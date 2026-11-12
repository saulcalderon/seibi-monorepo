import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAuth } from '@/auth/session';
import { useProfile } from '@/data/profile/queries';
import { usePressed } from '@/ui/press';
import { Text } from '@/ui/text';

import { identityFromUser, initials } from './identity';

/**
 * The avatar on the right of every tab's header (the PWA's, on Inicio). It
 * opens Perfil inside the current tab. Google's picture when there is one,
 * else the person's initials, else the email's first letter.
 */
export function ProfileButton() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const auth = useAuth();
  const profile = useProfile();
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed });

  const identity = identityFromUser(auth.status === 'signed-in' ? auth.session.user : null);
  const name = profile.data?.displayName ?? identity.fullName?.split(' ')[0] ?? identity.email ?? '';
  return (
    <Pressable
      testID="open-profile"
      accessibilityRole="button"
      accessibilityLabel={t('shell.profile')}
      onPress={() => router.push('/profile')}
      hitSlop={(theme.size.target - theme.size.avatar) / 2}
      {...pressHandlers}
    >
      <View style={styles.avatar}>
        {identity.avatarUrl ? (
          <Image source={identity.avatarUrl} style={styles.picture} accessible={false} />
        ) : (
          <Text step="footnote" weight={600} maxFontSizeMultiplier={1}>
            {initials(name)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  avatar: {
    width: theme.size.avatar,
    height: theme.size.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    // iOS 26 seats header items on a glass circle of their own; Android's header has none, so it gets a fill.
    backgroundColor: process.env.EXPO_OS === 'ios' ? undefined : theme.colors.surface3,
    variants: {
      pressed: { true: { opacity: theme.opacity.pressed }, false: {} },
    },
  },
  picture: {
    width: theme.size.avatar,
    height: theme.size.avatar,
  },
}));
