import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useUpdateProfile } from '@/data/profile/queries';
import { KNOWLEDGE_LEVELS, levelTitle } from '@/lib/knowledge';
import { Option, OptionGroup } from '@/onboarding/option';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { Card, IconTile } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/** The calibrated Knowledge level, what it changes, and «Prefiero otro nivel» to pick another. */
export default function ResultStep() {
  const { t } = useTranslation();
  const { level: calibrated, selfLevel, setLevel } = useFirstRun();
  const level = calibrated ?? selfLevel ?? 'basic';
  const { advance } = useStep('result');
  const update = useUpdateProfile();
  const [other, setOther] = useState(false);

  return (
    <FirstRunStep
      step="result"
      title={t(`onboarding.result.${level}.title`)}
      body={t(`onboarding.result.${level}.body`)}
      footer={<Button testID="first-run-result-continue" block size="lg" variant="inverse" trailingIcon="next" label={t('onboarding.continue')} onPress={advance} />}
    >
      <Card style={styles.level} accessible accessibilityLabel={`${t('onboarding.result.yourLevel')}: ${levelTitle(level, t)}`} testID="first-run-result-level">
        <IconTile icon="knowledge" size="md" />
        <View style={styles.levelText}>
          <Text step="footnote" weight={600} tone="muted">
            {t('onboarding.result.yourLevel')}
          </Text>
          <Text step="body" weight={700}>
            {levelTitle(level, t)}
          </Text>
        </View>
      </Card>

      {/* The PWA's <details>: a disclosure that opens the four levels. */}
      <Card style={styles.other}>
        <Pressable
          testID="first-run-result-other"
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.result.other')}
          accessibilityState={{ expanded: other }}
          onPress={() => setOther((open) => !open)}
          style={styles.otherToggle}
        >
          <Text step="subhead" weight={600} style={styles.otherLabel}>
            {t('onboarding.result.other')}
          </Text>
          <View style={other ? styles.chevronOpen : undefined}>
            <Icon name="expand" size="sm" tone="muted" />
          </View>
        </Pressable>
        {other ? (
          <OptionGroup label={t('onboarding.level.group')}>
            {KNOWLEDGE_LEVELS.map((choice) => (
              <Option
                key={choice}
                testID={`first-run-result-level-${choice}`}
                title={t(`knowledge.levels.${choice}.title`)}
                selected={choice === level}
                onPress={() => {
                  setLevel(choice);
                  update.mutate({ knowledgeLevel: choice });
                }}
              />
            ))}
          </OptionGroup>
        ) : null}
      </Card>
    </FirstRunStep>
  );
}

const styles = StyleSheet.create((theme) => ({
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[4],
    borderRadius: theme.radius.xl,
  },
  levelText: {
    flex: 1,
  },
  other: {
    gap: theme.space[3],
    padding: theme.space[4],
    borderRadius: theme.radius.xl,
  },
  otherToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.size.target,
  },
  otherLabel: {
    flex: 1,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
}));
