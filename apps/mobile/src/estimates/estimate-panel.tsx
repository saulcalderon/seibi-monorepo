import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useEstimateHistory, useRequestEstimate, type Estimate } from '@/data/estimate/queries';
import type { EstimateResponse } from '@/data/estimate/schemas';
import { errorMessage } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useProfile } from '@/data/profile/queries';
import { taskMap } from '@/data/task/catalog';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { motion } from '@/theme/tokens';
import { IconButton } from '@/ui/button';
import { Card, IconTile, ListRow, RowDivider, SectionHeader } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { TextField } from '@/ui/fields';
import { Text } from '@/ui/text';

import { EstimateCard } from './estimate-card';
import { canAsk, estimateRequest, estimateTitle, pastQueries, pastQuerySubtitle, suggestedTasks, waitingStep, WAITING_STEP_MS, type EstimateAsk, type WaitingStep } from './estimates-logic';

/**
 * Asking for an Estimate on one Vehicle (the PWA's EstimatePanel): what to
 * price, typed or as a task chip; the question and the waiting line while the
 * research runs; the result; and the Vehicle's past queries, any of which
 * shows its result again. `initialTask` asks for that task once on arrival.
 *
 * Unlike the PWA, the question field sits at the top instead of pinned above
 * the tab bar, where the floating [+] would cover its button.
 */
export function EstimatePanel({
  vehicle,
  initialTask,
  onInitialTaskAsked,
}: {
  vehicle: VehicleView;
  initialTask?: string;
  /** Called once `initialTask` has been asked for, so the screen doesn't pass it again. */
  onInitialTaskAsked?: () => void;
}) {
  const { t } = useTranslation();
  const garage = useGarage();
  const profile = useProfile();
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const byCode = taskMap(garage.tasks);
  const request = useRequestEstimate();
  const history = useEstimateHistory();
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResponse | Estimate | null>(null);
  const [step, setStep] = useState<WaitingStep>(0);
  const autoRan = useRef(false);

  const run = (ask: EstimateAsk) => {
    if (request.isPending) return;
    const label = 'query' in ask ? ask.query.trim() : taskLabel(byCode.get(ask.taskCode), ask.taskCode, k);
    setAsked(label || t('estimates.ask.fallback'));
    setQuery('');
    setResult(null);
    setStep(0);
    Keyboard.dismiss();
    // A failure is shown from `request.error` below.
    request.mutateAsync(estimateRequest(vehicle.id, ask)).then(setResult, () => undefined);
  };

  // Once, when the catalog that names the task has loaded (the PWA's effect).
  const askInitialTask = useEffectEvent(() => {
    if (!initialTask || autoRan.current) return;
    autoRan.current = true;
    run({ taskCode: initialTask });
    onInitialTaskAsked?.();
  });
  const initialTaskKnown = initialTask ? byCode.has(initialTask) : false;
  useEffect(() => {
    if (initialTaskKnown) askInitialTask();
  }, [initialTaskKnown]);

  useEffect(() => {
    if (!request.isPending) return;
    const started = Date.now();
    const timer = setInterval(() => setStep(waitingStep(Date.now() - started)), WAITING_STEP_MS);
    return () => clearInterval(timer);
  }, [request.isPending]);

  const submit = () => {
    if (canAsk(query)) run({ query });
  };
  const suggestions = suggestedTasks(vehicle.reminders, [...byCode.keys()]);
  const past = pastQueries(history.data ?? [], vehicle.id);

  return (
    <>
      <View style={styles.ask}>
        <View style={styles.askField}>
          <TextField
            testID="estimates-query"
            label={t('estimates.ask.label')}
            placeholder={t('estimates.ask.placeholder')}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={submit}
          />
        </View>
        <IconButton testID="estimates-send" icon="send" label={t('estimates.ask.send')} variant="inverse" disabled={!canAsk(query) || request.isPending} onPress={submit} />
      </View>

      <View style={styles.chips} testID="estimates-tasks">
        {suggestions.map(({ code, due }) => {
          const label = taskLabel(byCode.get(code), code, k);
          return (
            <Chip
              key={code}
              testID={`estimates-task-${code}`}
              label={label}
              icon={taskIcon(code)}
              dot={due ?? undefined}
              // The dot's colour says overdue or «Por vencer»; the spoken label says it in words.
              accessibilityLabel={due ? t(`estimates.ask.task.${due}`, { task: label }) : label}
              disabled={request.isPending}
              onPress={() => run({ taskCode: code })}
            />
          );
        })}
      </View>

      {asked ? (
        <View style={styles.thread} testID="estimates-thread">
          <View style={styles.question}>
            {/* The id is on the words, so a flow can match what was asked. */}
            <Text testID="estimates-asked" step="subhead" tone="onInverse">
              {asked}
            </Text>
          </View>
          {request.isPending ? <Waiting step={step} /> : null}
          {request.isError ? (
            <Card style={styles.error} testID="estimates-request-error">
              <Text step="subhead" tone="overdue" accessibilityRole="alert" accessibilityLiveRegion="polite">
                {errorMessage(request.error, t)}
              </Text>
            </Card>
          ) : null}
          {result && !request.isPending ? (
            <Appear key={`${result.id}-${result.createdAt}`}>
              <EstimateCard estimate={result} vehicle={vehicle} />
            </Appear>
          ) : null}
        </View>
      ) : null}

      {past.length > 0 && !request.isPending ? (
        <View style={styles.section} testID="estimates-past">
          <SectionHeader title={t('estimates.past.title')} />
          <Card>
            {past.map((e, i) => (
              <View key={`${e.id}-${e.createdAt}`}>
                {i > 0 ? <RowDivider /> : null}
                <ListRow
                  testID={`estimates-past-${i}`}
                  leading={<IconTile icon={taskIcon(e.taskCode)} size="sm" />}
                  title={estimateTitle(e)}
                  subtitle={pastQuerySubtitle(e, t)}
                  chevron={false}
                  onPress={() => {
                    request.reset();
                    setAsked(estimateTitle(e));
                    setResult(e);
                  }}
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </>
  );
}

/** The line that says Seibi is still looking, moving through its three steps. */
function Waiting({ step }: { step: WaitingStep }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  return (
    <View
      testID="estimates-waiting"
      style={styles.waiting}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('estimates.waiting.spoken')}
      accessibilityState={{ busy: true }}
      accessibilityValue={{ text: t(`estimates.waiting.step${step}`) }}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="small" color={theme.colors.muted} />
      <Text step="footnote" tone="muted">
        {t(`estimates.waiting.step${step}`)}
      </Text>
    </View>
  );
}

/** The result rises into place, as the PWA's (still with Reduce Motion on). */
function Appear({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <Animated.View entering={reduced ? undefined : FadeInDown.duration(motion.estimate.duration)}>{children}</Animated.View>;
}

const styles = StyleSheet.create((theme) => ({
  ask: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.space[2],
  },
  askField: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
  thread: {
    gap: theme.space[3],
  },
  question: {
    alignSelf: 'flex-end',
    maxWidth: theme.size.bubble,
    backgroundColor: theme.colors.inverse,
    borderRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  waiting: {
    alignSelf: 'flex-start',
    maxWidth: theme.size.bubble,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2.5],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderBottomLeftRadius: theme.radius.sm,
    borderCurve: 'continuous',
    boxShadow: theme.shadow.card,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  error: {
    padding: theme.space[4],
  },
  section: {
    gap: theme.space[3],
  },
}));
