import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { reminderDueText } from '@/data/reminder/text';
import type { MaintenanceTask } from '@/data/task/catalog';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { IconTile } from '@/ui/card';
import { ProgressBar } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { usePressed } from '@/ui/press';
import { Text } from '@/ui/text';

/**
 * One derived Reminder in a list (the PWA's ReminderRow): the task's icon
 * and name, «General» for a general schedule when the person knows enough
 * to care, where it stands in words («Vencido por 1,200 km», «Pospuesto»)
 * and, unless `compact`, the share of its interval used. A tap opens its
 * detail (`/reminder`).
 */
export function ReminderRow({
  reminder,
  task,
  measure,
  k,
  compact = false,
  onPress,
  testID,
}: {
  reminder: Reminder;
  task: MaintenanceTask | undefined;
  measure: VehicleView['measure'];
  k: ReturnType<typeof knowledgeProfile>;
  /** One line of status and no bar, for Avisos' dense lists. */
  compact?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed, compact });
  const tone = reminder.snoozed ? 'unknown' : reminder.status;
  const due = reminder.snoozed ? t('reminders.snoozed') : reminderDueText(reminder, measure, t);
  const title = taskLabel(task, reminder.taskCode, k);
  const general = reminder.source === 'general' && k.detailed;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[title, general ? t('vehicleDetail.reminders.generalBadge') : null, due].filter(Boolean).join(', ')}
      onPress={onPress}
      style={styles.row}
      {...pressHandlers}
    >
      <IconTile icon={taskIcon(reminder.taskCode)} size={compact ? 'sm' : 'md'} />
      <View style={styles.text}>
        <View style={styles.top}>
          <Text step="subhead" weight={600} numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {general ? (
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
        {!compact && reminder.status !== 'unknown' ? <ProgressBar value={reminder.used} status={tone} /> : null}
      </View>
      <Icon name="forward" size="sm" tone="subtle" />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    minHeight: theme.size.row,
    variants: {
      compact: {
        true: { paddingVertical: theme.space[3] },
        false: { paddingVertical: theme.space[3.5] },
      },
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  text: {
    flex: 1,
    gap: theme.space[0.5],
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
  },
  title: {
    flexShrink: 1,
  },
  generalBadge: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface3,
    paddingHorizontal: theme.space[1.5],
    paddingVertical: theme.space[0.5],
  },
}));
