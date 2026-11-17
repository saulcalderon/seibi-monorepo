import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { Card, IconTile, RowDivider, SectionHeader } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

import { routinesWeeklyTotal, usageSourceKey } from './detail-logic';

/**
 * Uso: the «Uso estimado» card (readings/routines source lines, the «severo»
 * note, «Actualizar kilometraje») and the weekly Routines — each row opens
 * the Routine sheet (`/routine?vehicleId=&routineId=`). Ported from the
 * PWA's UsageTab.
 */
export function UsageTab({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const weekly = routinesWeeklyTotal(vehicle.routines);

  return (
    <View style={styles.tab}>
      <Card style={styles.usageCard} testID="usage-estimate">
        <Text step="footnote" weight={600} tone="muted">
          {t('vehicleDetail.usage.estimated')}
        </Text>
        <Text step="title1" weight={700} family="mono" style={styles.usageValue}>
          {vehicle.usage ? `${formatNumber(vehicle.usage.perDay * 7)} ${vehicle.measure}` : t('vehicleDetail.usage.none')}
          {vehicle.usage ? (
            <Text step="subhead" weight={600} tone="muted">
              {' '}
              {t('vehicleDetail.usage.perWeek')}
            </Text>
          ) : null}
        </Text>
        <Text step="footnote" tone="muted" style={styles.usageSource}>
          {t(`vehicleDetail.usage.${usageSourceKey(vehicle.usage)}`)}
        </Text>
        {vehicle.severe ? (
          <View style={styles.severe} testID="usage-severe">
            <Text step="footnote" weight={500}>
              {t('vehicleDetail.usage.severe')}
            </Text>
          </View>
        ) : null}
        <Button
          testID="usage-update-mileage"
          variant="secondary"
          icon="mileage"
          label={t('vehicleDetail.usage.update')}
          onPress={() => router.push({ pathname: '/update-mileage', params: { vehicleId: vehicle.id } })}
        />
      </Card>

      <View style={styles.section} testID="routines-section">
        <SectionHeader title={t('vehicleDetail.routines.title')} />
        {vehicle.routines.length === 0 ? (
          <Text step="subhead" tone="muted" style={styles.hint} testID="routines-empty">
            {t('vehicleDetail.routines.emptyHint')}
          </Text>
        ) : (
          <Card>
            {vehicle.routines.map((routine, index) => (
              <View key={routine.id}>
                {index > 0 ? <RowDivider /> : null}
                <Pressable
                  testID={`routine-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={routine.name}
                  onPress={() => router.push({ pathname: '/routine', params: { vehicleId: vehicle.id, routineId: routine.id } })}
                  style={styles.routineRow}
                >
                  <IconTile icon="route" size="sm" />
                  <View style={styles.routineText}>
                    <Text step="subhead" weight={600} numberOfLines={1}>
                      {routine.name}
                    </Text>
                    <Text step="footnote" tone="muted">
                      {t('vehicleDetail.routines.roundTrip', { distance: formatNumber(routine.roundTripDistance), measure: vehicle.measure })} ·{' '}
                      {routine.daysPerWeek} {t('vehicleDetail.routines.day', { count: routine.daysPerWeek })} {t('vehicleDetail.routines.perWeek')}
                    </Text>
                  </View>
                  <Icon name="edit" size="xs" tone="subtle" />
                </Pressable>
              </View>
            ))}
            <RowDivider />
            <View style={styles.totalRow} testID="routine-total">
              <Text step="footnote" tone="muted">
                {t('vehicleDetail.routines.total')}{' '}
                <Text step="footnote" weight={700} family="mono">
                  {formatNumber(weekly)} {vehicle.measure}
                </Text>{' '}
                {t('vehicleDetail.routines.perWeek')}
              </Text>
            </View>
          </Card>
        )}
        <Button
          testID="routine-add"
          variant="secondary"
          icon="add"
          block
          label={t('vehicleDetail.routines.add')}
          onPress={() => router.push({ pathname: '/routine', params: { vehicleId: vehicle.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tab: {
    gap: theme.space[6],
  },
  usageCard: {
    gap: theme.space[2],
    padding: theme.space[5],
  },
  usageValue: {
    fontVariant: ['tabular-nums'],
  },
  usageSource: {
    marginTop: theme.space[0.5],
  },
  severe: {
    marginTop: theme.space[2],
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface3,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
  },
  section: {
    gap: theme.space[3],
  },
  hint: {
    paddingHorizontal: theme.space[1],
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    minHeight: theme.size.target,
  },
  routineText: {
    flex: 1,
    gap: theme.space[0.5],
    minWidth: 0,
  },
  totalRow: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
}));
