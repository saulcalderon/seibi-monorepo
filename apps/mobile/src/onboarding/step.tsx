import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { FormLayout } from '@/ui/form';
import { Logo } from '@/ui/logo';
import { Text } from '@/ui/text';
import { Wordmark } from '@/ui/wordmark';

import type { Step } from './flow';
import { useStep } from './state';

/**
 * One first-run step, the PWA's Onboarding panel: the lockup at the top,
 * then the eyebrow (the step's category), the title and its body, the
 * step's content, and an action bar with the step's buttons and the dots.
 * The bar rides on the keyboard (`FormLayout`).
 */
export function FirstRunStep({
  step,
  title,
  body,
  mark,
  footer,
  children,
}: {
  step: Step;
  title: string;
  body?: string;
  /** Drawn after the title (the dashboard light on the coolant question). */
  mark?: ReactNode;
  footer: ReactNode;
  children?: ReactNode;
}) {
  return (
    <FirstRunScreen testID={`first-run-${step}`}>
      <FormLayout
        divider={false}
        testID={`first-run-${step}-form`}
        footer={
          <>
            {footer}
            <StepDots step={step} />
          </>
        }
      >
        <StepHeading step={step} title={title} body={body} mark={mark} />
        {children}
      </FormLayout>
    </FirstRunScreen>
  );
}

/** The screen around a step: the lockup, fixed above what scrolls. */
export function FirstRunScreen({ children, testID }: { children: ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen} testID={testID}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.lockup} accessible accessibilityRole="image" accessibilityLabel={t('brand.name')}>
          <Logo size="sm" surface="light" />
          <Wordmark step="title2" />
        </View>
      </View>
      {children}
    </View>
  );
}

/** The eyebrow, said with «paso N de M», the title as the screen's heading, and the body. */
export function StepHeading({ step, title, body, mark }: { step: Step; title: string; body?: string; mark?: ReactNode }) {
  const { t } = useTranslation();
  const { index, count } = useStep(step);
  const category = t(`onboarding.category.${step}`);
  return (
    <View style={styles.heading}>
      <Text
        step="footnote"
        weight={500}
        tone="muted"
        accessibilityLabel={t('onboarding.step', { category, index: index + 1, count })}
        testID={`first-run-${step}-eyebrow`}
      >
        {category}
      </Text>
      <View style={styles.titleRow}>
        <Text heading step="title1" weight={300} style={styles.title} testID={`first-run-${step}-title`}>
          {title}
        </Text>
        {mark}
      </View>
      {body ? (
        <Text step="body" tone="muted" style={styles.body}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/** Where the step sits among the steps: the PWA's dots. Drawing only; the eyebrow says it. */
export function StepDots({ step }: { step: Step }) {
  const { index, count } = useStep(step);
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  styles.useVariants({ active });
  return <View style={styles.dot} />;
}

/** The first-run headline: `title1` tracked and leaded as Login's (`heroType`). */
export function firstRunTitle(theme: { type: { title1: { fontSize: number } }; heroType: { tracking: number; leading: number } }) {
  return {
    letterSpacing: theme.type.title1.fontSize * theme.heroType.tracking,
    lineHeight: Math.round(theme.type.title1.fontSize * theme.heroType.leading),
  };
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[2],
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.space[1.5],
    minHeight: theme.size.target,
  },
  heading: {
    gap: theme.space[2],
    paddingTop: theme.space[2],
    paddingHorizontal: theme.space[1],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
  },
  title: {
    flexShrink: 1,
    ...firstRunTitle(theme),
  },
  body: {
    paddingTop: theme.space[1],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.space[8],
  },
  dot: {
    height: theme.size.pagerDot.side,
    borderRadius: theme.radius.pill,
    variants: {
      active: {
        true: { width: theme.size.pagerDot.active, backgroundColor: theme.colors.ink },
        false: { width: theme.size.pagerDot.side, backgroundColor: theme.colors.surface3 },
      },
    },
  },
}));
