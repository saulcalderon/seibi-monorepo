import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { useProfile } from '@/data/profile/queries';
import { taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { formatDay, formatDistance, formatUsd } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { Button } from '@/ui/button';
import { Card, IconTile, ListRow, RowDivider, SectionHeader } from '@/ui/card';
import { Text } from '@/ui/text';

/**
 * A Vehicle's Services as plain rows, with «Registrar un Servicio» for that
 * Vehicle: the way into the Service form from the Vehicle detail
 * placeholder until S6 ports the PWA's history. A row opens the Service to
 * edit or withdraw it.
 */
export function VehicleServices({ vehicle, tasks }: { vehicle: VehicleView; tasks: MaintenanceTask[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel);
  const byCode = taskMap(tasks);
  return (
    <View style={styles.section} testID="vehicle-services">
      <SectionHeader title={t('vehicleDetail.services.title')} />
      {vehicle.services.length > 0 ? (
        <Card>
          {vehicle.services.map((service, index) => {
            const first = service.items[0];
            const title = service.items.map((i) => (i.taskCode ? taskLabel(byCode.get(i.taskCode), i.taskCode, k) : i.name)).join(', ');
            const subtitle = [
              formatDay(service.performedOn),
              service.reading != null ? formatDistance(service.reading, vehicle.measure) : null,
              service.type === 'repair' ? t('vehicleDetail.services.repair') : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={service.id}>
                {index > 0 ? <RowDivider /> : null}
                <ListRow
                  testID={`vehicle-service-${index}`}
                  leading={<IconTile icon={taskIcon(first?.taskCode)} />}
                  title={title}
                  subtitle={subtitle}
                  trailing={
                    service.totalCost != null ? (
                      <Text step="subhead" family="mono">
                        {formatUsd(service.totalCost)}
                      </Text>
                    ) : undefined
                  }
                  onPress={() => router.push({ pathname: '/record-service', params: { serviceId: service.id } })}
                />
              </View>
            );
          })}
        </Card>
      ) : (
        <Text step="subhead" tone="muted" style={styles.empty}>
          {t('vehicleDetail.services.empty')}
        </Text>
      )}
      <Button
        testID="vehicle-record-service"
        variant="secondary"
        icon="service"
        block
        label={t('vehicleDetail.services.record')}
        onPress={() => router.push({ pathname: '/record-service', params: { vehicleId: vehicle.id } })}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: {
    gap: theme.space[3],
  },
  empty: {
    paddingHorizontal: theme.space[1],
  },
}));
