import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useUpdateProfile } from '@/data/profile/queries';
import { CHECK_QUESTIONS, checkOptionText } from '@/lib/knowledge';
import { levelFromChecks } from '@/onboarding/flow';
import { Option, OptionGroup } from '@/onboarding/option';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';

// The coolant temperature light, the PWA's coolant-temp.png.
const COOLANT = require('../../../assets/images/coolant-temp.png') as number;
/** The PNG has room around the light; the PWA zooms it 1.85× inside its box. */
const MARK_ZOOM = 1.85;

/**
 * One check question (`?q=0|1|2`), each its own screen so back returns to the
 * one before. The last answer calibrates the self-assessment and saves the
 * Knowledge level (`profiles.knowledge_level`).
 */
export default function CheckStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const index = Math.min(Math.max(Number(params.q ?? 0) || 0, 0), CHECK_QUESTIONS.length - 1);
  const question = CHECK_QUESTIONS[index];
  const { selfLevel, picked, setPicked, setLevel } = useFirstRun();
  const { advance } = useStep('check');
  const update = useUpdateProfile();
  // One answer per visit: a second tap while the next question slides in does nothing.
  const answered = useRef(false);
  useFocusEffect(
    useCallback(() => {
      answered.current = false;
    }, []),
  );

  const answer = (correct: boolean) => {
    if (answered.current) return;
    answered.current = true;
    const next = picked.slice();
    next[index] = correct;
    setPicked(next);
    if (index < CHECK_QUESTIONS.length - 1) {
      router.push({ pathname: '/onboarding/check', params: { q: String(index + 1) } });
      return;
    }
    const level = levelFromChecks(selfLevel ?? 'basic', next);
    setLevel(level);
    update.mutate({ knowledgeLevel: level });
    advance();
  };

  return (
    <FirstRunStep
      step="check"
      title={t(`knowledge.check.${question.id}.question`)}
      mark={
        'mark' in question ? (
          <View style={styles.mark} accessible accessibilityRole="image" accessibilityLabel={t('onboarding.check.coolantMark')}>
            <Image source={COOLANT} contentFit="contain" style={styles.markImage} />
          </View>
        ) : null
      }
      footer={null}
    >
      <OptionGroup label={t(`knowledge.check.${question.id}.question`)}>
        {question.options.map((option) => (
          <Option
            key={option.id}
            testID={`first-run-check-${index}-${option.id}`}
            title={checkOptionText(question, option.id, t)}
            onPress={() => answer(option.correct)}
          />
        ))}
      </OptionGroup>
    </FirstRunStep>
  );
}

const styles = StyleSheet.create((theme) => ({
  mark: {
    width: theme.size.icon.xl,
    height: theme.size.icon.xl,
    overflow: 'hidden',
  },
  markImage: {
    width: theme.size.icon.xl,
    height: theme.size.icon.xl,
    transform: [{ scale: MARK_ZOOM }],
  },
}));
