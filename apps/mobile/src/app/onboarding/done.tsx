import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, BackHandler, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import { useFinishFirstRun } from '@/data/profile/queries';
import { FirstRunScreen } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * «Se guardó tu información»: the end of the questions. It saves
 * `onboarded_at` and, after the PWA's 2 s, the root layout opens Inicio. A
 * one-way door: there is no going back to the questions from here. If the
 * save fails it says so and offers to try again, where the PWA went on to
 * Inicio and sent the person back to the start.
 */
export default function DoneStep() {
  const { t } = useTranslation();
  const finish = useFinishFirstRun();
  const { mutate } = finish;
  // iOS's back swipe is off for this screen (the stack's options); Android's back does nothing here.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${t('onboarding.done.title')}. ${t('onboarding.done.body')}`);
    mutate();
  }, [mutate, t]);

  return (
    <FirstRunScreen testID="first-run-done">
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(350)}>
          <Card style={styles.card} accessible accessibilityRole="summary" accessibilityLiveRegion="polite">
            <Animated.View entering={ZoomIn.delay(120).springify()} style={styles.check}>
              <Icon name="check" size="xl" tone="onInverse" fixed />
            </Animated.View>
            <Text heading step="title1" weight={300} align="center" style={styles.title} testID="first-run-done-title">
              {t('onboarding.done.title')}
            </Text>
            <Text step="body" tone="muted" align="center">
              {t('onboarding.done.body')}
            </Text>
          </Card>
        </Animated.View>
        {finish.isError ? (
          <View style={styles.failed}>
            <Text testID="first-run-done-error" step="subhead" weight={500} tone="overdue" align="center" accessibilityRole="alert">
              {errorMessage(finish.error, t)}
            </Text>
            <Button testID="first-run-done-retry" block size="lg" variant="inverse" label={t('onboarding.done.retry')} onPress={() => mutate()} />
          </View>
        ) : null}
      </View>
    </FirstRunScreen>
  );
}

const styles = StyleSheet.create((theme) => ({
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.space[4],
    paddingHorizontal: theme.space[8],
  },
  card: {
    alignItems: 'center',
    gap: theme.space[2],
    paddingHorizontal: theme.space[6],
    paddingVertical: theme.space[10],
    borderRadius: theme.radius['2xl'],
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: theme.size.firstRunArt.check,
    height: theme.size.firstRunArt.check,
    marginBottom: theme.space[3],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.inverse,
  },
  title: {
    letterSpacing: theme.type.title1.fontSize * theme.heroType.tracking,
    lineHeight: Math.round(theme.type.title1.fontSize * theme.heroType.leading),
  },
  failed: {
    gap: theme.space[3],
  },
}));
