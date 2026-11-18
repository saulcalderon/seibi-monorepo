import { useEffect, useRef, useState, type ComponentRef, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { pageAt } from '@/home/garage-logic';
import { firstRunTitle } from '@/onboarding/step';
import { motion } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Logo } from '@/ui/logo';
import { Text } from '@/ui/text';
import { Wordmark } from '@/ui/wordmark';

import { ProblemArt, StatusArt, VehicleArt } from './art';
import { slideControls } from './flow';

/** The PWA's three slides, in its order, each with its picture (src/intro/art.tsx). */
const SLIDES: readonly { key: 'what' | 'problem' | 'help'; Art: ComponentType }[] = [
  { key: 'what', Art: VehicleArt },
  { key: 'problem', Art: ProblemArt },
  { key: 'help', Art: StatusArt },
];

/**
 * The Intro (S2), the PWA's Intro without the phone and its animations: the
 * lockup and «Saltar» at the top, the slides, then «Siguiente» («Empezar» on
 * the last) and the dots. `onFinish` runs on «Saltar» and «Empezar»; the
 * root layout's guards then open Login, nothing here navigates.
 *
 * The slides are pages of a native paging scroll view, so a swipe follows
 * the finger as on Inicio; «Siguiente» moves through the same pages, without
 * animation under Reduce Motion. The dots show the slide, as Inicio's pager
 * does: too small to be touch targets of their own. For VoiceOver and TalkBack
 * only the current slide is in the tree, its eyebrow says which slide it is,
 * the dots are one adjustable control (swipe up or down), and a change of
 * slide is announced, since the focus stays on the control that made it.
 */
export function IntroScreen({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  /** The page the scroll view rests on, or -1 before it has been placed. */
  const resting = useRef(-1);
  const count = SLIDES.length;
  const controls = slideControls(index, count);

  // Bring the pages to `index` when the button or the dots change it, and
  // place them on the first layout (no animation then).
  useEffect(() => {
    if (width === 0 || resting.current === index) return;
    scroller.current?.scrollTo({ x: index * width, animated: resting.current !== -1 && !reduced });
    resting.current = index;
  }, [index, width, reduced]);

  // Say the new slide: the focus stays on «Siguiente» or the dots.
  const announced = useRef(index);
  useEffect(() => {
    if (announced.current === index) return;
    announced.current = index;
    const slide = SLIDES[index].key;
    const eyebrow = t(`intro.slides.${slide}.eyebrow`);
    AccessibilityInfo.announceForAccessibility(
      `${t('intro.position', { eyebrow, index: index + 1, count })}. ${t(`intro.slides.${slide}.title`)}`,
    );
  }, [index, count, t]);

  const go = (next: number) => setIndex(Math.min(count - 1, Math.max(0, next)));

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = pageAt(event.nativeEvent.contentOffset.x, width, count);
    resting.current = page;
    setIndex(page);
  };

  const onAdjust = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') go(index + 1);
    if (event.nativeEvent.actionName === 'decrement') go(index - 1);
  };

  return (
    <View testID="intro-screen" style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.lockup} accessible accessibilityRole="image" accessibilityLabel={t('brand.name')}>
          <Logo size="sm" surface="light" />
          <Wordmark step="title2" />
        </View>
        {controls.skip ? (
          <Pressable testID="intro-skip" accessibilityRole="button" accessibilityLabel={t('intro.skip')} onPress={onFinish} hitSlop={theme.space[2]} style={styles.skip}>
            <Text step="body" weight={500} tone="muted">
              {t('intro.skip')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pages} onLayout={onLayout}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSettle}
          testID="intro-pages"
        >
          {width > 0
            ? SLIDES.map((slide, i) => <Slide key={slide.key} slide={slide} index={i} count={count} width={width} current={i === index} />)
            : null}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          testID="intro-next"
          block
          size="lg"
          variant="inverse"
          trailingIcon="next"
          label={controls.next === 'finish' ? t('intro.start') : t('intro.next')}
          onPress={() => (controls.next === 'finish' ? onFinish() : go(controls.next))}
        />
        <View
          testID="intro-dots"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('intro.pager')}
          accessibilityValue={{ text: t('intro.pagerValue', { index: index + 1, count }) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAdjust}
          style={styles.dots}
        >
          {SLIDES.map((slide, i) => (
            <Dot key={slide.key} on={i === index} />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * One slide: its picture above, then the eyebrow, the title and the body,
 * the PWA's order. It scrolls on its own when the text is too large for the
 * screen. Only the current slide is in the accessibility tree.
 */
function Slide({
  slide,
  index,
  count,
  width,
  current,
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  count: number;
  width: number;
  current: boolean;
}) {
  const { t } = useTranslation();
  const { key, Art } = slide;
  const eyebrow = t(`intro.slides.${key}.eyebrow`);
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!current}
      testID={`intro-slide-${index}`}
    >
      <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Art />
      </View>
      <View style={styles.copy}>
        <Text
          step="footnote"
          weight={500}
          tone="muted"
          accessibilityLabel={t('intro.position', { eyebrow, index: index + 1, count })}
          testID={current ? 'intro-eyebrow' : undefined}
        >
          {eyebrow}
        </Text>
        <Text heading step="title1" weight={300} style={styles.title} testID={current ? 'intro-title' : undefined}>
          {t(`intro.slides.${key}.title`)}
        </Text>
        <Text step="body" tone="muted" style={styles.body} testID={current ? 'intro-body' : undefined}>
          {t(`intro.slides.${key}.body`)}
        </Text>
      </View>
    </ScrollView>
  );
}

/** A dot: the current one is wider and `ink`; both change in 200 ms (none under Reduce Motion). */
function Dot({ on }: { on: boolean }) {
  const reduced = useReducedMotion();
  styles.useVariants({ on });
  return <Animated.View style={[styles.dot, !reduced && dotTransition]} />;
}

// Timing, not colours or sizes: a plain Reanimated CSS transition.
const dotTransition = {
  transitionProperty: ['width', 'backgroundColor'] as ['width', 'backgroundColor'],
  transitionDuration: 200,
  transitionTimingFunction: cubicBezier(...motion.curve.paint),
};

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // As tall as «Saltar», so the slides don't move when it goes on the last one.
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[2],
    paddingBottom: theme.space[2],
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
    minHeight: theme.size.target,
  },
  skip: {
    minHeight: theme.size.target,
    justifyContent: 'center',
    paddingHorizontal: theme.space[1],
  },
  pages: {
    flex: 1,
  },
  slide: {
    flexGrow: 1,
    paddingHorizontal: theme.space[5],
  },
  // The picture fills the space above the words and sits on them.
  art: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: theme.space[2],
    paddingBottom: theme.space[6],
  },
  copy: {
    paddingBottom: theme.space[2],
  },
  title: {
    marginTop: theme.space[2],
    ...firstRunTitle(theme),
  },
  body: {
    marginTop: theme.space[3],
  },
  footer: {
    gap: theme.space[2.5],
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[2],
    paddingBottom: theme.space[3],
  },
  // As tall as a touch target, so the adjustable control is easy to find by touch (Inicio's pager).
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[2],
  },
  dot: {
    height: theme.size.pagerDot.side,
    borderRadius: theme.radius.pill,
    variants: {
      on: {
        true: { width: theme.size.pagerDot.active, backgroundColor: theme.colors.ink },
        false: { width: theme.size.pagerDot.side, backgroundColor: theme.garage.dot },
      },
    },
  },
}));
