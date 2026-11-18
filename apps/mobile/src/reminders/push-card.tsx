import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useProfile } from '@/data/profile/queries';
import { Button } from '@/ui/button';
import { Card, IconTile } from '@/ui/card';
import { Text } from '@/ui/text';

/**
 * «Recibe los avisos en tu teléfono», the PWA's PushBanner, as a stub:
 * native push needs `expo-notifications` and `push_tokens` (SEI-47). Until
 * then «Activar» is disabled and the card says why, as Perfil's
 * notifications switch does. As in the PWA, it is hidden once the person has
 * turned notifications off (`profiles.notifications_enabled`). SEI-47 wires
 * «Activar» to the permission prompt and hides the card once granted.
 */
export function PushCard() {
  const { t } = useTranslation();
  const profile = useProfile();
  if (profile.data && !profile.data.notificationsEnabled) return null;
  return (
    <Card style={styles.card} testID="avisos-push">
      <IconTile icon="remindersOn" />
      <View style={styles.text}>
        <Text step="subhead" weight={700}>
          {t('reminders.push.title')}
        </Text>
        <Text step="footnote" tone="muted">
          {t('reminders.push.body')}
        </Text>
        <Text testID="avisos-push-unavailable" step="footnote" tone="muted">
          {t('profile.notifications.unavailable')}
        </Text>
      </View>
      <Button testID="avisos-push-enable" size="sm" variant="secondary" label={t('reminders.push.action')} disabled />
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[4],
  },
  text: {
    flex: 1,
    gap: theme.space[0.5],
  },
}));
