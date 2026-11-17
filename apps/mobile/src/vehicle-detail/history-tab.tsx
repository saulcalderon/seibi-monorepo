import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { ServiceRecord, VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useProfile } from '@/data/profile/queries';
import { useWithdrawService } from '@/data/service/mutations';
import { taskMap } from '@/data/task/catalog';
import { errorMessage } from '@/data/errors';
import { formatDay, formatMonth, formatNumber, formatUsd, isoDate } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { Button } from '@/ui/button';
import { Card, IconTile, RowDivider, SectionHeader } from '@/ui/card';
import { EmptyState } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { confirm, notify } from '@/ui/toast';

import { latestReadings, servicesByMonth, yearSpend } from './detail-logic';

/**
 * Historial: the stats, «Registrar Servicio», Services by month as the PWA's
 * expandable ServiceCard (Quitar asks first; «Factura» waits for S12), and
 * the latest Mileage readings, each opening «Corregir lectura».
 */
export function HistoryTab({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const months = servicesByMonth(vehicle.services);
  const spent = yearSpend(vehicle.services, isoDate());
  const readings = latestReadings(vehicle.readings);

  return (
    <View style={styles.tab}>
      <View style={styles.stats}>
        <Card style={styles.stat} testID="stat-services">
          <Text step="footnote" weight={600} tone="muted">
            {t('vehicleDetail.history.services')}
          </Text>
          <Text step="title3" weight={700} family="mono">
            {vehicle.services.length}
          </Text>
        </Card>
        <Card style={styles.stat} testID="stat-spent">
          <Text step="footnote" weight={600} tone="muted">
            {t('vehicleDetail.history.spent')}
          </Text>
          <Text step="title3" weight={700} family="mono">
            {formatUsd(spent)}
          </Text>
        </Card>
      </View>

      <Button
        testID="record-service"
        variant="secondary"
        icon="add"
        block
        label={t('vehicleDetail.history.record')}
        onPress={() => router.push({ pathname: '/record-service', params: { vehicleId: vehicle.id } })}
      />

      {months.length === 0 ? (
        <EmptyState testID="history-empty" icon="history" title={t('vehicleDetail.history.emptyTitle')} body={t('vehicleDetail.history.emptyBody')} />
      ) : (
        months.map(([month, services]) => (
          <View key={month} style={styles.section} testID={`history-month-${month}`}>
            <SectionHeader title={formatMonth(`${month}-01`)} />
            {services.map((service, index) => (
              <ServiceCard key={service.id} vehicle={vehicle} service={service} index={index} />
            ))}
          </View>
        ))
      )}

      {readings.length > 0 ? (
        <View style={styles.section} testID="history-readings">
          <SectionHeader title={t('vehicleDetail.history.readings')} />
          <Card>
            {readings.map((reading, index) => (
              <View key={reading.id}>
                {index > 0 ? <RowDivider /> : null}
                <Pressable
                  testID={`reading-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatNumber(reading.reading)} ${vehicle.measure}, ${formatDay(reading.recordedOn)}`}
                  accessibilityHint={t('vehicleDetail.correct.title')}
                  onPress={() => router.push({ pathname: '/correct-reading', params: { readingId: reading.id, vehicleId: vehicle.id } })}
                  style={styles.readingRow}
                >
                  <Icon name="mileage" size="sm" tone="muted" />
                  <Text step="subhead" weight={600} family="mono" style={styles.readingValue}>
                    {formatNumber(reading.reading)} {vehicle.measure}
                  </Text>
                  <Text step="footnote" tone="muted">
                    {formatDay(reading.recordedOn)}
                  </Text>
                  <Icon name="edit" size="xs" tone="subtle" />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/** The PWA's ServiceCard: collapsed by default, expanded for lines, Taller, notes, «Editar» and «Quitar». */
function ServiceCard({ vehicle, service, index }: { vehicle: VehicleView; service: ServiceRecord; index: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel);
  const byCode = taskMap(garage.tasks);
  const withdraw = useWithdrawService();
  const [open, setOpen] = useState(false);
  const first = service.items[0];

  const remove = async () => {
    const ok = await confirm({
      // Title and message apart, as the Service form asks it: Android cuts an alert's title at two lines.
      title: t('serviceForm.withdraw.title'),
      message: t('serviceForm.withdraw.body'),
      confirmLabel: t('vehicleDetail.history.remove'),
      cancelLabel: t('vehicleDetail.history.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await withdraw.mutateAsync(service.id);
      notify.success(t('vehicleDetail.history.removed'));
    } catch (error) {
      notify.error(errorMessage(error, t));
    }
  };

  return (
    <Card style={styles.serviceCard} testID={`service-card-${index}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={service.items.map((i) => (i.taskCode ? taskLabel(byCode.get(i.taskCode), i.taskCode, k) : i.name)).join(', ')}
        onPress={() => setOpen((o) => !o)}
        style={styles.serviceHead}
      >
        <IconTile icon={taskIcon(first?.taskCode)} />
        <View style={styles.serviceText}>
          <Text step="subhead" weight={600} numberOfLines={1}>
            {service.items.map((i) => (i.taskCode ? taskLabel(byCode.get(i.taskCode), i.taskCode, k) : i.name)).join(', ')}
          </Text>
          <Text step="footnote" tone="muted" numberOfLines={1}>
            {formatDay(service.performedOn)}
            {service.reading != null ? ` · ${formatNumber(service.reading)} ${vehicle.measure}` : ''}
            {service.type === 'repair' ? ` · ${t('vehicleDetail.history.repair')}` : ''}
          </Text>
        </View>
        {service.totalCost != null ? (
          <Text step="subhead" weight={700} family="mono">
            {formatUsd(service.totalCost)}
          </Text>
        ) : null}
      </Pressable>
      {open ? (
        <View style={styles.serviceBody} testID={`service-card-body-${index}`}>
          <View style={styles.serviceLines}>
            {service.items.map((item) => (
              <View key={item.id} style={styles.serviceLine}>
                <Text step="footnote" style={styles.serviceLineName}>
                  {item.taskCode ? taskLabel(byCode.get(item.taskCode), item.taskCode, k) : item.name}
                  {item.partBrand || item.partNumber ? (
                    <Text tone="muted"> · {[item.partBrand, item.partNumber].filter(Boolean).join(' ')}</Text>
                  ) : null}
                </Text>
                {item.cost != null ? (
                  <Text step="footnote" family="mono" tone="muted">
                    {formatUsd(item.cost, true)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          {service.shop ? (
            <Text step="footnote" tone="muted" style={styles.serviceMeta}>
              {t('vehicleDetail.history.shop', { shop: service.shop })}
            </Text>
          ) : null}
          {service.notes ? (
            <Text step="footnote" tone="muted" style={styles.serviceMeta}>
              {service.notes}
            </Text>
          ) : null}
          <View style={styles.serviceActions}>
            <Button
              testID={`service-card-edit-${index}`}
              size="sm"
              variant="secondary"
              icon="edit"
              label={t('vehicleDetail.history.edit')}
              onPress={() => router.push({ pathname: '/record-service', params: { serviceId: service.id } })}
            />
            <Button
              testID={`service-card-withdraw-${index}`}
              size="sm"
              variant="ghost"
              icon="archive"
              loading={withdraw.isPending}
              label={t('vehicleDetail.history.remove')}
              onPress={() => void remove()}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  tab: {
    gap: theme.space[6],
  },
  stats: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  stat: {
    flex: 1,
    gap: theme.space[0.5],
    padding: theme.space[4],
  },
  section: {
    gap: theme.space[3],
  },
  serviceCard: {
    overflow: 'hidden',
  },
  serviceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
  },
  serviceText: {
    flex: 1,
    gap: theme.space[0.5],
    minWidth: 0,
  },
  serviceBody: {
    borderTopWidth: theme.size.border.thin,
    borderTopColor: theme.colors.line,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    gap: theme.space[2],
  },
  serviceLines: {
    gap: theme.space[1.5],
  },
  serviceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.space[3],
  },
  serviceLineName: {
    flex: 1,
  },
  serviceMeta: {
    marginTop: theme.space[0.5],
  },
  serviceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
    marginTop: theme.space[2],
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    minHeight: theme.size.target,
  },
  readingValue: {
    flex: 1,
  },
}));
