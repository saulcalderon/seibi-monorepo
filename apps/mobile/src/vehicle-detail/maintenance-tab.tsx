import { daysBetween } from '@seibi/maintenance-engine/days';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useProfile } from '@/data/profile/queries';
import { taskMap } from '@/data/task/catalog';
import { useRefreshVehicleData } from '@/data/vehicle/mutations';
import { formatDay, isoDate, relativeDays } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { plainText } from '@/lib/text';
import { HistoryCard } from '@/reminders/history-card';
import { ManualReminderRow } from '@/reminders/manual-reminder-row';
import { ReminderRow } from '@/reminders/reminder-row';
import { Button } from '@/ui/button';
import { Card, IconTile, RowDivider, SectionHeader } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

import { scheduleBanner, scheduleGeneralBody } from './detail-logic';

/**
 * Mantenimiento: the schedule banner, «Completa tu historial», the Reminder
 * groups and «Citas y recordatorios», as the PWA's MaintenanceTab. A
 * Reminder opens its detail (S9); a hand-written Reminder has «Hecho» and
 * the bin, and «Recordatorio» writes a new one. Appointments are read-only
 * and «Agendar Cita» is missing until S13 ships them.
 */
export function MaintenanceTab({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const profile = useProfile();
  const byCode = taskMap(garage.tasks);
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const today = isoDate();

  const groups = (['overdue', 'soon', 'ok'] as const)
    .map((status) => ({ status, items: vehicle.reminders.filter((r) => r.status === status) }))
    .filter((g) => g.items.length > 0);

  return (
    <View style={styles.tab}>
      <ScheduleBanner vehicle={vehicle} />
      <HistoryCard testID="detail-history" vehicleId={vehicle.id} reminders={vehicle.reminders.filter((r) => r.status === 'unknown')} tasks={byCode} level={profile.data?.knowledgeLevel} />
      {groups.map((g) => (
        <View key={g.status} style={styles.section} testID={`reminder-group-${g.status}`}>
          <SectionHeader title={`${t(`status.${g.status}`)} (${g.items.length})`} />
          <Card>
            {g.items.map((reminder, index) => (
              <View key={reminder.taskCode}>
                {index > 0 ? <RowDivider /> : null}
                <ReminderRow
                  testID={`reminder-${reminder.taskCode}`}
                  reminder={reminder}
                  measure={vehicle.measure}
                  task={byCode.get(reminder.taskCode)}
                  k={k}
                  onPress={() => router.push({ pathname: '/reminder', params: { vehicleId: vehicle.id, task: reminder.taskCode } })}
                />
              </View>
            ))}
          </Card>
        </View>
      ))}
      <View style={styles.section} testID="detail-appointments">
        <SectionHeader title={t('vehicleDetail.appointments.title')} />
        {vehicle.upcomingAppointments.length === 0 && vehicle.openManualReminders.length === 0 ? (
          <Text step="subhead" tone="muted" style={styles.emptyHint}>
            {t('vehicleDetail.appointments.emptyHint')}
          </Text>
        ) : (
          <Card>
            {vehicle.upcomingAppointments.map((a, index) => (
              <View key={`a-${a.id}`}>
                {index > 0 ? <RowDivider /> : null}
                <View style={styles.row} testID="detail-appointment">
                  <IconTile icon="appointment" />
                  <View style={styles.rowText}>
                    <Text step="subhead" weight={600} numberOfLines={1}>
                      {a.taskCodes.length > 0 ? a.taskCodes.map((c) => taskLabel(byCode.get(c), c, k)).join(', ') : t('vehicleDetail.appointments.workshop')}
                    </Text>
                    <Text step="footnote" tone="muted">
                      {formatDay(a.scheduledOn, 'long')} · {relativeDays(daysBetween(today, a.scheduledOn), t)}
                      {a.shop ? ` · ${a.shop}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {vehicle.openManualReminders.map((m, index) => (
              <View key={`m-${m.id}`}>
                {index > 0 || vehicle.upcomingAppointments.length > 0 ? <RowDivider /> : null}
                <ManualReminderRow reminder={m} notes deletable testID={`detail-manual-reminder-${index}`} />
              </View>
            ))}
          </Card>
        )}
        <Button
          testID="detail-add-reminder"
          variant="secondary"
          icon="addReminder"
          label={t('vehicleDetail.appointments.addReminder')}
          accessibilityLabel={t('vehicleDetail.appointments.addReminderSpoken')}
          onPress={() => router.push({ pathname: '/new-reminder', params: { vehicleId: vehicle.id } })}
        />
      </View>
    </View>
  );
}

/** The schedule note: pending lookup, the model's plan, or the general recommendation with «Buscar plan del fabricante». */
function ScheduleBanner({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const refresh = useRefreshVehicleData();
  const variant = scheduleBanner(vehicle);

  if (variant === 'pending') {
    return (
      <View style={styles.banner} testID="schedule-banner-pending">
        <Icon name="search" size="sm" tone="ink" />
        <Text step="footnote" weight={500} style={styles.bannerText}>
          {t('vehicleDetail.schedule.pending', { model: vehicle.model })}
        </Text>
      </View>
    );
  }
  if (variant === 'model') {
    return (
      <View style={styles.banner} testID="schedule-banner-model">
        <View style={styles.bannerHeading}>
          <Icon name="privacy" size="sm" tone="ink" />
          <Text step="footnote" weight={600} style={styles.bannerText}>
            {t('vehicleDetail.schedule.model', { name: `${vehicle.brand} ${vehicle.model} ${vehicle.year}` })}
          </Text>
        </View>
        {vehicle.schedule?.summary ? (
          <Text step="footnote">
            {plainText(vehicle.schedule.summary)}
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <View style={[styles.banner, styles.bannerGeneral]} testID="schedule-banner-general">
      <Text step="footnote" weight={600}>
        {t('vehicleDetail.schedule.generalTitle')}
      </Text>
      <Text step="footnote" tone="muted">
        {`${scheduleGeneralBody(vehicle) === 'generalFound' ? plainText(vehicle.schedule?.summary) || t('vehicleDetail.schedule.generalFound') : t('vehicleDetail.schedule.generalNone')} ${t('vehicleDetail.schedule.manualNote')}`}
      </Text>
      {variant === 'general-cta' ? (
        <Button
          testID="schedule-search"
          size="sm"
          variant="secondary"
          icon="refresh"
          loading={refresh.isPending}
          label={t('vehicleDetail.schedule.search')}
          onPress={() => refresh.mutate(vehicle.id)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tab: {
    gap: theme.space[6],
  },
  section: {
    gap: theme.space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
  },
  rowText: {
    flex: 1,
    gap: theme.space[0.5],
    minWidth: 0,
  },
  emptyHint: {
    paddingHorizontal: theme.space[1],
  },
  banner: {
    borderRadius: theme.radius['3xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    gap: theme.space[1],
  },
  bannerGeneral: {
    borderRadius: theme.radius['2xl'],
    backgroundColor: theme.colors.surface3,
    gap: theme.space[2.5],
  },
  bannerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  bannerText: {
    flex: 1,
    flexShrink: 1,
  },
}));
