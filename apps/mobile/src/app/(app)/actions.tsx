import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Card, IconTile, ListRow, RowDivider } from '@/ui/card';
import { Text } from '@/ui/text';

/**
 * The actions sheet the [+] opens (the PWA's quick actions): what you can
 * record from anywhere. Scheduling an Appointment joins with S13; until then
 * it is not offered (decided 2026-11-11). Picking an action swaps this sheet
 * for that action's own.
 */
export default function ActionsSheet() {
  const { t } = useTranslation();
  const router = useRouter();
  const open = (href: Href) => router.replace(href);
  return (
    <View testID="actions-sheet" style={styles.sheet}>
      <Text step="title3" family="display" heading>
        {t('actions.title')}
      </Text>
      <Card>
        <ListRow
          testID="action-record-service"
          leading={<IconTile icon="service" tone="radiant" />}
          title={t('actions.service.title')}
          subtitle={t('actions.service.body')}
          onPress={() => open('/record-service')}
        />
        <RowDivider />
        <ListRow
          testID="action-update-mileage"
          leading={<IconTile icon="mileage" tone="radiant" />}
          title={t('actions.mileage.title')}
          subtitle={t('actions.mileage.body')}
          onPress={() => open('/update-mileage')}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  sheet: {
    gap: theme.space[4],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[6],
    // iOS sizes a fitted sheet above the home indicator already; Android's reaches the screen's edge.
    paddingBottom: (process.env.EXPO_OS === 'ios' ? 0 : rt.insets.bottom) + theme.space[6],
  },
}));
