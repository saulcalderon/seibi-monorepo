import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { savePushAnswer, type PushAnswer } from '@/data/preferences/store';
import { useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { motion } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

/**
 * «¿Te avisamos a tiempo?», the push permission ask. Native push
 * (`expo-notifications`, the push token) is SEI-47's and isn't in the app
 * yet, so neither answer asks the system: the answer is kept on the phone
 * (`savePushAnswer`) for SEI-47 to ask once it ships. Either answer moves
 * on; saying no blocks nothing.
 */
export default function NotificationsStep() {
  const { t } = useTranslation();
  const { advance } = useStep('notifications');
  const answer = (value: PushAnswer) => {
    savePushAnswer(value);
    advance();
  };
  return (
    <FirstRunStep
      step="notifications"
      title={t('onboarding.notifications.title')}
      body={t('onboarding.notifications.body')}
      footer={
        <>
          <Button testID="first-run-notifications-enable" block size="lg" variant="inverse" trailingIcon="next" label={t('onboarding.notifications.enable')} onPress={() => answer('accepted')} />
          <Button testID="first-run-notifications-later" block size="lg" variant="ghost" label={t('onboarding.notifications.later')} onPress={() => answer('declined')} />
        </>
      }
    >
      <View style={styles.stage}>
        <Bell />
      </View>
    </FirstRunStep>
  );
}

/** The PWA's ringing bell: a short wiggle, then a rest. Still with Reduce Motion on. */
function Bell() {
  const reduced = useReducedMotion();
  return (
    <Animated.View style={[styles.bell, !reduced && wiggle]}>
      <Icon name="remindersOn" size="xl" fixed />
    </Animated.View>
  );
}

// The PWA's keyframes [0, -10°, 10°, -6°, 0] over the first 0.8 s of each 2.4 s.
const wiggle = {
  animationName: {
    '0%': { transform: [{ rotate: '0deg' }] },
    '8%': { transform: [{ rotate: `${-motion.bell.angle}deg` }] },
    '17%': { transform: [{ rotate: `${motion.bell.angle}deg` }] },
    '25%': { transform: [{ rotate: `${-motion.bell.angle * motion.bell.settle}deg` }] },
    '33%': { transform: [{ rotate: '0deg' }] },
    '100%': { transform: [{ rotate: '0deg' }] },
  },
  animationDuration: motion.bell.duration,
  animationIterationCount: 'infinite',
} as const;

const styles = StyleSheet.create((theme) => ({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space[6],
  },
  bell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: theme.size.firstRunArt.bell,
    height: theme.size.firstRunArt.bell,
    borderRadius: theme.radius['3xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.card,
  },
}));
