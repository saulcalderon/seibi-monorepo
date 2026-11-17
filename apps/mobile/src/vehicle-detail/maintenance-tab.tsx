import { daysBetween } from '@seibi/maintenance-engine/days';
import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useProfile } from '@/data/profile/queries';
import { reminderDueText } from '@/data/reminder/text';
import { taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { useRefreshVehicleData } from '@/data/vehicle/mutations';
import { formatDay, isoDate, relativeDays } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { plainText } from '@/lib/text';
import { Button } from '@/ui/button';
import { Card, IconTile, RowDivider, SectionHeader } from '@/ui/card';
import { ProgressBar, StatusBadge } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

import { scheduleBanner, scheduleGeneralBody } from './detail-logic';

/**
 * Mantenimiento: the schedule banner, the Reminder groups and «Citas y
 * recordatorios». The rows and list are read-only here: a Reminder's own
 * screen is S9, Marcar hecho/Cancelar/Hecho/Eliminar and the buttons are
 * S13/S9 — as the PWA's MaintenanceTab minus those actions.
 */
export function MaintenanceTab({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const garage = useGarage();
  const profile = useProfile();
  const byCode = taskMap(garage.tasks);
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const today = isoDate();

  const groups = (['overdue', 'soon', 'ok'] as const)
    .map((status) => ({ status, items: vehicle.reminders.filter((r) => r.status === status) }))
    .filter((g) => g.items.length > 0);
  const appointments = [...vehicle.upcomingAppointments, ...vehicle.openManualReminders];

  return (
    <View style={styles.tab}>
      <ScheduleBanner vehicle={vehicle} />
      {groups.map((g) => (
        <View key={g.status} style={styles.section} testID={`reminder-group-${g.status}`}>
          <SectionHeader title={`${t(`status.${g.status}`)} (${g.items.length})`} />
          <Card>
            {g.items.map((reminder, index) => (
              <View key={reminder.taskCode}>
                {index > 0 ? <RowDivider /> : null}
                <ReminderRow reminder={reminder} measure={vehicle.measure} task={byCode.get(reminder.taskCode)} k={k} />
              </View>
            ))}
          </Card>
        </View>
      ))}
      {appointments.length > 0 ? (
        <View style={styles.section} testID="detail-appointments">
          <SectionHeader title={t('vehicleDetail.appointments.title')} />
          <Card>
            {vehicle.upcomingAppointments.map((a) => (
              <View key={`a-${a.id}`} style={styles.row} testID="detail-appointment">
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
            ))}
            {vehicle.openManualReminders.map((m, index) => (
              <View key={`m-${m.id}`}>
                {index > 0 || vehicle.upcomingAppointments.length > 0 ? <RowDivider /> : null}
                <View style={styles.row} testID="detail-manual-reminder">
                  <IconTile icon="addReminder" />
                  <View style={styles.rowText}>
                    <Text step="subhead" weight={600} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <Text step="footnote" tone="muted">
                      {formatDay(m.dueOn, 'long')} · {relativeDays(daysBetween(today, m.dueOn), t)}
                    </Text>
                    {m.notes ? (
                      <Text step="footnote" tone="muted" style={styles.notes}>
                        {m.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/** A Reminder row, not tappable until S9 gives each Reminder a screen (the PWA's ReminderRow, plain variant). */
function ReminderRow({ reminder, measure, task, k }: { reminder: Reminder; measure: VehicleView['measure']; task: MaintenanceTask | undefined; k: ReturnType<typeof knowledgeProfile> }) {
  const { t } = useTranslation();
  const tone = reminder.snoozed ? 'unknown' : reminder.status;
  const due = reminder.snoozed ? t('reminders.snoozed', { defaultValue: 'Pospuesto' }) : reminderDueText(reminder, measure, t);
  return (
    <View style={styles.row} testID={`reminder-${reminder.taskCode}`}>
      <IconTile icon={taskIcon(reminder.taskCode)} />
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <Text step="subhead" weight={600} numberOfLines={1} style={styles.rowTitle}>
            {taskLabel(task, reminder.taskCode, k)}
          </Text>
          {reminder.source === 'general' && k.detailed ? (
            <View style={styles.generalBadge}>
              <Text step="caption" weight={700} tone="muted">
                {t('vehicleDetail.reminders.generalBadge')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text step="footnote" tone="muted" numberOfLines={1}>
          {due}
        </Text>
        {reminder.status !== 'unknown' ? <ProgressBar value={reminder.used} status={tone} /> : null}
      </View>
      <StatusBadge status={reminder.status} testID={`reminder-status-${reminder.taskCode}`} />
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
          <Text step="footnote" style={styles.bannerBody}>
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
      <Text step="footnote" tone="muted" style={styles.bannerBody}>
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
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
  },
  rowTitle: {
    flexShrink: 1,
  },
  generalBadge: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface3,
    paddingHorizontal: theme.space[1.5],
    paddingVertical: theme.space[0.5],
  },
  notes: {
    marginTop: theme.space[1],
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
  bannerBody: {},
}));
