import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useProfile } from '@/data/profile/queries';
import { useReminderState } from '@/data/reminder/mutations';
import { intervalText, reminderDueText } from '@/data/reminder/text';
import { taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { formatDay, formatNumber, isoDate, measureLabel, vehicleName } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { Button } from '@/ui/button';
import { Card, IconTile } from '@/ui/card';
import { ProgressBar, StatusBadge } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';

import { SNOOZE_DAYS, snoozeOffer, snoozePatch } from './avisos-logic';
import { SheetHeader, SheetMessage, WithGarage } from './sheet-parts';

/** A source title longer than this is cut with «…», as the PWA's. */
const SOURCE_TITLE_MAX = 48;

/**
 * A Reminder's detail (`/reminder?vehicleId=&task=`), the PWA's
 * ReminderDetail sheet: where it stands, in words and as the share of its
 * interval used; the task's description when the person wants it explained
 * (or nothing is known); how often, the last time, when it comes due, and
 * the schedule's source with its links. It records the Service, asks the
 * last time of an unknown task, and snoozes or restores a due one.
 * «Agendar» (S13) and «¿Cuánto cuesta?» (S10) join it with their screens.
 */
export function ReminderDetailSheet({ vehicleId, taskCode }: { vehicleId?: string; taskCode?: string }) {
  const { t } = useTranslation();
  return (
    <WithGarage testID="reminder-detail">
      {(garage) => {
        const vehicle = garage.vehicles.find((v) => v.id === vehicleId);
        const reminder = vehicle?.reminders.find((r) => r.taskCode === taskCode);
        if (!vehicle || !reminder) {
          return (
            <SheetMessage testID="reminder-detail-gone">
              <Text step="body" tone="muted">
                {t('reminders.detail.gone')}
              </Text>
            </SheetMessage>
          );
        }
        return <Detail vehicle={vehicle} reminder={reminder} task={taskMap(garage.tasks).get(reminder.taskCode)} />;
      }}
    </WithGarage>
  );
}

function Detail({ vehicle, reminder, task }: { vehicle: VehicleView; reminder: Reminder; task: MaintenanceTask | undefined }) {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile();
  const setState = useReminderState();
  const [snoozing, setSnoozing] = useState<number | 'restore' | null>(null);
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const title = taskLabel(task, reminder.taskCode, k);
  const measure = measureLabel(vehicle.measure);
  const interval = intervalText(reminder, vehicle.measure, t);
  const offer = snoozeOffer(reminder);
  const sources = reminder.source === 'model' ? (vehicle.schedule?.sources ?? []).slice(0, 3) : [];

  const snooze = async (days: number | null) => {
    setSnoozing(days ?? 'restore');
    try {
      await setState.mutateAsync({ vehicleId: vehicle.id, taskCode: reminder.taskCode, patch: snoozePatch(days, isoDate()) });
      notify.success(days == null ? t('reminders.detail.restored') : t('reminders.detail.snoozedToast', { days }));
      router.back();
    } catch (e) {
      notify.error(errorMessage(e, t));
    } finally {
      setSnoozing(null);
    }
  };

  return (
    <ScrollView testID="reminder-detail" contentContainerStyle={styles.sheet}>
      <SheetHeader testID="reminder-detail" title={title} body={vehicleName(vehicle)} />

      <Card style={styles.block}>
        <View style={styles.statusRow}>
          <IconTile icon={taskIcon(reminder.taskCode)} />
          <View style={styles.statusText}>
            <StatusBadge testID="reminder-detail-status" status={reminder.status} />
            <Text testID="reminder-detail-due" step="footnote" tone="muted">
              {reminder.snoozed ? `${t('reminders.snoozed')} · ${reminderDueText(reminder, vehicle.measure, t)}` : reminderDueText(reminder, vehicle.measure, t)}
            </Text>
          </View>
        </View>
        {reminder.status !== 'unknown' ? <ProgressBar value={reminder.used} status={reminder.snoozed ? 'unknown' : reminder.status} /> : null}
      </Card>

      {task && (k.explain || reminder.status === 'unknown') ? (
        <Card style={[styles.block, styles.explain]}>
          <Icon name="info" size="sm" tone="muted" />
          <Text step="subhead" style={styles.explainText}>
            {task.description}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.block} testID="reminder-detail-facts">
        {interval ? (
          <Fact testID="reminder-detail-frequency" label={t('reminders.detail.frequency')} value={reminder.severe ? t('reminders.detail.severe', { interval }) : interval} />
        ) : null}
        {reminder.lastDone ? (
          <Fact
            testID="reminder-detail-last"
            label={t('reminders.detail.lastDone')}
            value={(() => {
              const day = formatDay(reminder.lastDone.performedOn, 'long');
              const withReading = reminder.lastDone.reading != null ? `${day} · ${formatNumber(reminder.lastDone.reading)} ${measure}` : day;
              return reminder.lastDone.remembered ? t('reminders.detail.approximate', { day: withReading }) : withReading;
            })()}
          />
        ) : null}
        {reminder.dueReading != null ? (
          <Fact
            testID="reminder-detail-due-at"
            label={t('reminders.detail.dueAt')}
            value={
              reminder.dueOn
                ? t('reminders.detail.dueOr', { reading: `${formatNumber(reminder.dueReading)} ${measure}`, day: formatDay(reminder.dueOn, 'long') })
                : `${formatNumber(reminder.dueReading)} ${measure}`
            }
          />
        ) : null}
        <Fact
          testID="reminder-detail-source"
          label={t('reminders.detail.source')}
          value={reminder.source === 'model' ? t('reminders.detail.sourceModel', { brand: vehicle.brand, model: vehicle.model }) : t('reminders.detail.sourceGeneral')}
        >
          {sources.map((source, i) => (
            <Pressable
              key={source.url}
              testID={`reminder-detail-link-${i}`}
              accessibilityRole="link"
              accessibilityLabel={source.title}
              onPress={() => void openBrowserAsync(source.url)}
              style={styles.link}
            >
              <Text step="footnote" weight={600} tone="radiant" style={styles.linkText}>
                {source.title.length > SOURCE_TITLE_MAX ? `${source.title.slice(0, SOURCE_TITLE_MAX)}…` : source.title}
              </Text>
              <Icon name="external" size="xs" tone="radiant" />
            </Pressable>
          ))}
        </Fact>
      </Card>

      <View style={styles.actions}>
        <Button
          testID="reminder-detail-record"
          variant="secondary"
          size="lg"
          icon="success"
          block
          label={t('reminders.detail.recordService')}
          onPress={() => router.replace({ pathname: '/record-service', params: { vehicleId: vehicle.id, tasks: reminder.taskCode } })}
        />
        {reminder.status === 'unknown' ? (
          <Button
            testID="reminder-detail-ask-last"
            variant="secondary"
            icon="history"
            block
            label={t('reminders.detail.askLast')}
            onPress={() => router.replace({ pathname: '/last-done', params: { vehicleId: vehicle.id, task: reminder.taskCode } })}
          />
        ) : null}
        {offer === 'restore' ? (
          <Button
            testID="reminder-detail-restore"
            variant="ghost"
            icon="undo"
            block
            label={t('reminders.detail.restore')}
            loading={snoozing === 'restore'}
            disabled={snoozing !== null}
            onPress={() => void snooze(null)}
          />
        ) : offer === 'snooze' ? (
          <View style={styles.pair}>
            {SNOOZE_DAYS.map((days, i) => (
              <View key={days} style={styles.half}>
                <Button
                  testID={`reminder-detail-snooze-${days}`}
                  variant="ghost"
                  icon={i === 0 ? 'remindersOff' : undefined}
                  block
                  label={t('reminders.detail.snooze', { days })}
                  loading={snoozing === days}
                  disabled={snoozing !== null && snoozing !== days}
                  onPress={() => void snooze(days)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** One fact about the Reminder: its label over its value, and anything under them (the source's links). */
function Fact({ label, value, children, testID }: { label: string; value: string; children?: ReactNode; testID: string }) {
  return (
    <View style={styles.fact} testID={testID}>
      <Text step="footnote" tone="muted">
        {label}
      </Text>
      <Text step="subhead" weight={600}>
        {value}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[5],
    paddingBottom: theme.space[8],
  },
  block: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
  },
  statusText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: theme.space[1],
  },
  explain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[2],
  },
  explainText: {
    flex: 1,
  },
  fact: {
    gap: theme.space[0.5],
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.size.target,
  },
  linkText: {
    flexShrink: 1,
  },
  actions: {
    gap: theme.space[2],
  },
  pair: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  half: {
    flex: 1,
  },
}));
