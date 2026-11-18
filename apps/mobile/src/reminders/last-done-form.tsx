import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useProfile } from '@/data/profile/queries';
import { useReminderState, type ReminderStatePatch } from '@/data/reminder/mutations';
import { taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { isoDate } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { Button } from '@/ui/button';
import { DateField } from '@/ui/controls';
import { MileageField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

import { DONT_KNOW_PATCH, LAST_DONE_RANGES, rememberedPatch, type LastDoneRange } from './avisos-logic';
import { SheetError, SheetHeader, SheetMessage, WithGarage } from './sheet-parts';

/**
 * «¿Cuándo fue “…”?» (`/last-done?vehicleId=&task=`), the PWA's LastDoneForm:
 * for a task with no known last Service, a rough answer («Hace 3 a 6
 * meses»), the exact day with the odometer then, «No sé», or the full
 * Service. The answer is remembered on the Reminder (`reminder_states`),
 * not stored as a Service. It has a field, so its sheet has a fixed height.
 */
export function LastDoneSheet({ vehicleId, taskCode }: { vehicleId?: string; taskCode?: string }) {
  const { t } = useTranslation();
  return (
    <WithGarage testID="last-done">
      {(garage) => {
        const vehicle = garage.vehicles.find((v) => v.id === vehicleId);
        if (!vehicle || !taskCode) {
          return (
            <SheetMessage testID="last-done-gone">
              <Text step="body" tone="muted">
                {t('reminders.detail.gone')}
              </Text>
            </SheetMessage>
          );
        }
        return <LastDoneBody vehicle={vehicle} taskCode={taskCode} task={taskMap(garage.tasks).get(taskCode)} />;
      }}
    </WithGarage>
  );
}

function LastDoneBody({ vehicle, taskCode, task }: { vehicle: VehicleView; taskCode: string; task: MaintenanceTask | undefined }) {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile();
  const setState = useReminderState();
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const [exactOpen, setExactOpen] = useState(false);
  // The exact day opens on today: a native date picker has no empty value (the PWA's field started blank).
  const [exact, setExact] = useState(() => new Date());
  const [dateTouched, setDateTouched] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { leave } = useUnsavedGuard(reading !== null || (exactOpen && dateTouched), {
    title: t('reminders.lastDone.discard.title'),
    message: t('reminders.lastDone.discard.body'),
    confirmLabel: t('reminders.lastDone.discard.confirm'),
    cancelLabel: t('reminders.lastDone.discard.cancel'),
  });

  const answer = async (patch: ReminderStatePatch, done: string) => {
    if (setState.isPending) return;
    setError(null);
    try {
      await setState.mutateAsync({ vehicleId: vehicle.id, taskCode, patch });
      notify.success(done);
      leave();
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };
  // As the PWA, a typed «Kilometraje ese día» goes with any answer, a range or the exact day.
  const remember = (when: LastDoneRange | string) => answer(rememberedPatch(when, isoDate(), reading), t('reminders.lastDone.saved'));

  return (
    <FormLayout
      testID="last-done-sheet"
      divider={exactOpen}
      footer={
        <>
          {error ? <SheetError testID="last-done-error" message={error} /> : null}
          {exactOpen ? (
            <Button
              testID="last-done-save-date"
              block
              size="lg"
              label={t('reminders.lastDone.saveDate')}
              loading={setState.isPending}
              onPress={() => void remember(isoDate(exact))}
            />
          ) : null}
        </>
      }
    >
      <SheetHeader testID="last-done" title={t('reminders.lastDone.title', { task: taskLabel(task, taskCode, k) })} body={t('reminders.lastDone.body')} />
      {k.explain && task?.description ? (
        <View style={styles.explain}>
          <Text step="subhead" tone="muted">
            {task.description}
          </Text>
        </View>
      ) : null}
      <View style={styles.ranges}>
        {LAST_DONE_RANGES.map((range) => (
          <Button
            key={range.key}
            testID={`last-done-${range.key}`}
            variant="secondary"
            block
            disabled={setState.isPending}
            label={t(`reminders.lastDone.ranges.${range.key}`)}
            onPress={() => void remember(range)}
          />
        ))}
      </View>
      <View style={styles.exact}>
        <Button
          testID="last-done-exact"
          variant="ghost"
          icon={exactOpen ? 'expand' : 'forward'}
          label={t('reminders.lastDone.exact')}
          onPress={() => setExactOpen((open) => !open)}
        />
        {exactOpen ? (
          <>
            <DateField testID="last-done-date" label={t('reminders.lastDone.date')} value={exact} maximumDate={new Date()} onChange={(date) => {
                setExact(date);
                setDateTouched(true);
              }}
            />
            <MileageField testID="last-done-reading" label={t('reminders.lastDone.reading')} optional measure={vehicle.measure} value={reading} onChange={setReading} />
          </>
        ) : null}
      </View>
      <Button
        testID="last-done-invoice"
        variant="ghost"
        block
        label={t('reminders.lastDone.invoice')}
        onPress={() => router.replace({ pathname: '/record-service', params: { vehicleId: vehicle.id, tasks: taskCode } })}
      />
      <Button
        testID="last-done-dont-know"
        variant="ghost"
        block
        disabled={setState.isPending}
        label={t('reminders.lastDone.dontKnow')}
        onPress={() => void answer(DONT_KNOW_PATCH, t('reminders.lastDone.dontKnowSaved'))}
      />
    </FormLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  explain: {
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  ranges: {
    gap: theme.space[2],
  },
  exact: {
    alignItems: 'stretch',
    gap: theme.space[3],
  },
}));
