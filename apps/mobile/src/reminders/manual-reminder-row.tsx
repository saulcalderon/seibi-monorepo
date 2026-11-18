import { daysBetween } from '@seibi/maintenance-engine/days';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import type { ManualReminder } from '@/data/garage/types';
import { useCompleteManualReminder, useDeleteManualReminder } from '@/data/reminder/mutations';
import { formatDay, isoDate, relativeDays } from '@/lib/format';
import { Button, IconButton } from '@/ui/button';
import { IconTile } from '@/ui/card';
import { Text } from '@/ui/text';
import { confirm, notify } from '@/ui/toast';

/**
 * A hand-written Reminder in a list (the PWA's rows in Avisos and the
 * Vehicle's «Citas y recordatorios»): its title, its day and how far it is,
 * its notes when `notes`, «Hecho» to complete it and, where the PWA had it
 * (the Vehicle detail), the bin to delete it after a native confirm.
 */
export function ManualReminderRow({
  reminder,
  notes = false,
  deletable = false,
  testID,
}: {
  reminder: ManualReminder;
  notes?: boolean;
  deletable?: boolean;
  testID: string;
}) {
  const { t } = useTranslation();
  const complete = useCompleteManualReminder();
  const remove = useDeleteManualReminder();
  const today = isoDate();

  const done = async () => {
    try {
      await complete.mutateAsync({ id: reminder.id, done: true });
      notify.success(t('reminders.done'));
    } catch (e) {
      notify.error(errorMessage(e, t));
    }
  };

  const deleteIt = async () => {
    const ok = await confirm({
      title: t('reminders.deleteAsk', { title: reminder.title }),
      confirmLabel: t('reminders.deleteConfirm'),
      cancelLabel: t('reminders.deleteCancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(reminder.id);
      notify.success(t('reminders.deleted'));
    } catch (e) {
      notify.error(errorMessage(e, t));
    }
  };

  return (
    <View style={styles.row} testID={testID}>
      <IconTile icon={deletable ? 'addReminder' : 'remindersOn'} size={deletable ? 'md' : 'sm'} />
      <View style={styles.text}>
        <Text step="subhead" weight={600} numberOfLines={1}>
          {reminder.title}
        </Text>
        <Text step="footnote" tone="muted">
          {formatDay(reminder.dueOn, 'long')} · {relativeDays(daysBetween(today, reminder.dueOn), t)}
        </Text>
        {notes && reminder.notes ? (
          <Text step="footnote" tone="muted" style={styles.notes}>
            {reminder.notes}
          </Text>
        ) : null}
      </View>
      <Button
        testID={`${testID}-done`}
        size="sm"
        variant="secondary"
        label={t('reminders.done')}
        accessibilityLabel={t('reminders.doneSpoken', { title: reminder.title })}
        loading={complete.isPending}
        onPress={() => void done()}
      />
      {deletable ? (
        <IconButton testID={`${testID}-delete`} icon="delete" label={t('reminders.deleteSpoken', { title: reminder.title })} onPress={() => void deleteIt()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  text: {
    flex: 1,
    gap: theme.space[0.5],
    minWidth: 0,
  },
  notes: {
    marginTop: theme.space[1],
  },
}));
