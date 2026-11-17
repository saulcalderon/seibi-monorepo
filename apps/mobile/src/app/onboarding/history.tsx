import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useGarage } from '@/data/garage/use-garage';
import { useProfile } from '@/data/profile/queries';
import { rememberTasks } from '@/data/reminder/mutations';
import { knowledgeProfile } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { HISTORY_TASKS, rememberedFromHistory, WHEN, type HistoryTask, type WhenAnswer } from '@/onboarding/flow';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * «Tu último mantenimiento»: roughly when the oil, the tire rotation and the
 * battery were last done, saved as remembered last times
 * (`reminder_states`), so the first Reminders are dated. Nothing is
 * required; a failed save still moves on, as in the PWA.
 */
export default function HistoryStep() {
  const { t } = useTranslation();
  const { vehicleId, level } = useFirstRun();
  const { advance } = useStep('history');
  const profile = useProfile();
  const garage = useGarage();
  const [answers, setAnswers] = useState<Partial<Record<HistoryTask, WhenAnswer>>>({});
  const [busy, setBusy] = useState(false);
  const explain = knowledgeProfile(level ?? profile.data?.knowledgeLevel).explain;
  const answered = Object.keys(answers).length;

  const next = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (vehicleId) await rememberTasks(vehicleId, rememberedFromHistory(answers, new Date()));
      garage.refetch();
    } catch {
      // As the PWA: the answers are a nicety, never a wall.
    } finally {
      setBusy(false);
      advance();
    }
  };

  return (
    <FirstRunStep
      step="history"
      title={t('onboarding.history.title')}
      body={t(explain ? 'onboarding.history.bodyExplain' : 'onboarding.history.body')}
      footer={
        <Button
          testID="first-run-history-continue"
          block
          size="lg"
          variant="inverse"
          trailingIcon="next"
          loading={busy}
          label={t(answered > 0 ? 'onboarding.history.calculate' : 'onboarding.continue')}
          onPress={() => void next()}
        />
      }
    >
      {HISTORY_TASKS.map((task) => (
        <Card key={task} style={styles.card}>
          <View style={styles.question}>
            <Icon name={taskIcon(task)} size="sm" />
            <Text step="callout" weight={500} style={styles.questionText}>
              {t(`onboarding.history.questions.${task}`)}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel={t(`onboarding.history.questions.${task}`)} style={styles.chips}>
            {WHEN.map((when) => (
              <Chip
                key={when.id}
                radio
                testID={`first-run-history-${task}-${when.id}`}
                label={t(`onboarding.history.when.${when.id}`)}
                selected={answers[task] === when.id}
                onPress={() => setAnswers((current) => ({ ...current, [task]: when.id }))}
              />
            ))}
          </View>
        </Card>
      ))}
    </FirstRunStep>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.space[3],
    padding: theme.space[4],
    borderRadius: theme.radius.xl,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  questionText: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
}));
