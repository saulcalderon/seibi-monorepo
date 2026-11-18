import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { KNOWLEDGE_LEVELS } from '@/lib/knowledge';
import { Option, OptionGroup } from '@/onboarding/option';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { motion } from '@/theme/tokens';

/** «¿Cuánto sabes de carros?»: the self-assessment the check questions calibrate. */
export default function LevelStep() {
  const { t } = useTranslation();
  const { selfLevel, setSelfLevel, setPicked } = useFirstRun();
  const { advance } = useStep('level');
  // One answer per visit: a second tap while the next question slides in does nothing.
  // Leaving within the pause (a back swipe) drops the pending step.
  const answered = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useFocusEffect(
    useCallback(() => {
      answered.current = false;
      return () => {
        if (pending.current) clearTimeout(pending.current);
        pending.current = null;
      };
    }, []),
  );

  return (
    <FirstRunStep step="level" title={t('onboarding.level.title')} body={t('onboarding.level.body')} footer={null}>
      <OptionGroup label={t('onboarding.level.group')}>
        {KNOWLEDGE_LEVELS.map((level) => (
          <Option
            key={level}
            testID={`first-run-level-${level}`}
            title={t(`knowledge.levels.${level}.title`)}
            selected={selfLevel === level}
            onPress={() => {
              if (answered.current) return;
              answered.current = true;
              setSelfLevel(level);
              // A new self-assessment starts the check questions over.
              setPicked([]);
              // The PWA's pause, so the chosen mark shows before the next question.
              pending.current = setTimeout(advance, motion.firstRun.chosen);
            }}
          />
        ))}
      </OptionGroup>
    </FirstRunStep>
  );
}
