import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { MaintenanceTask } from '@/data/task/catalog';
import { knowledgeProfile, taskLabel, type KnowledgeLevel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { Card, IconTile } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { Text } from '@/ui/text';

import { historyPrompt } from './avisos-logic';

/**
 * «Completa tu historial» (the PWA's UnknownTasks): the tasks with no known
 * last Service as one card of chips instead of a row each, the ones people
 * know best first. A chip opens «¿Cuándo fue…?» (`/last-done`) for that
 * task; «Ver N más» shows the rest. A task the person answered «No sé»
 * about shows a question mark and says so.
 */
export function HistoryCard({
  vehicleId,
  reminders,
  tasks,
  level,
  initial = 5,
  testID = 'history-card',
}: {
  vehicleId: string;
  reminders: readonly Reminder[];
  tasks: ReadonlyMap<string, MaintenanceTask>;
  level: KnowledgeLevel | null | undefined;
  initial?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const [all, setAll] = useState(false);
  if (reminders.length === 0) return null;
  const k = knowledgeProfile(level);
  const prompt = historyPrompt(reminders, tasks, initial, all);
  const count = reminders.length;

  return (
    <Card style={styles.card} testID={testID}>
      <View style={styles.header}>
        <IconTile icon="history" tone="unknown" />
        <View style={styles.headerText}>
          <Text step="callout" weight={700} heading>
            {t('reminders.history.title')}
          </Text>
          <Text step="subhead" tone="muted">
            {t('reminders.history.body', { count })}
            {prompt.dontKnow > 0 ? ` ${t('reminders.history.dontKnow', { count: prompt.dontKnow })}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.chips}>
        {prompt.shown.map((reminder) => {
          const label = taskLabel(tasks.get(reminder.taskCode), reminder.taskCode, k);
          const dontKnow = reminder.unknownReason === 'dont_know';
          return (
            // A «No sé» task shows the question mark instead of its icon, so the answer isn't told by colour alone.
            <Chip
              key={reminder.taskCode}
              testID={`history-task-${reminder.taskCode}`}
              label={label}
              icon={dontKnow ? 'help' : taskIcon(reminder.taskCode)}
              accessibilityLabel={dontKnow ? t('reminders.history.dontKnowChip', { task: label }) : label}
              onPress={() => router.push({ pathname: '/last-done', params: { vehicleId, task: reminder.taskCode } })}
            />
          );
        })}
        {prompt.more > 0 ? (
          <Pressable
            testID={`${testID}-more`}
            accessibilityRole="button"
            accessibilityState={{ expanded: all }}
            hitSlop={(theme.size.target - theme.size.chip) / 2}
            onPress={() => setAll((open) => !open)}
            style={styles.more}
          >
            <Text step="subhead" weight={600} tone="radiant">
              {all ? t('reminders.history.less') : t('reminders.history.more', { count: prompt.more })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: theme.space[4],
    gap: theme.space[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
  },
  headerText: {
    flex: 1,
    gap: theme.space[0.5],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
  more: {
    minHeight: theme.size.chip,
    justifyContent: 'center',
    paddingHorizontal: theme.space[3],
  },
}));
