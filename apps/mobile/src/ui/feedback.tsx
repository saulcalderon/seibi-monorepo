import type { ReminderStatus } from '@seibi/maintenance-engine/reminders';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type DimensionValue } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { motion, opacity, type TypeStep } from '@/theme/tokens';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

// ---------------------------------------------------------------------------
// Loading: placeholders shaped like the content they stand in for
// ---------------------------------------------------------------------------

/** The pulse every skeleton shares. With Reduce Motion on, skeletons stay still. */
function usePulse() {
  const reduced = useReducedMotion();
  return reduced ? undefined : PULSE;
}

const PULSE = {
  animationName: { from: { opacity: 1 }, to: { opacity: opacity.skeleton } },
  animationDuration: motion.skeleton.duration,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: cubicBezier(...motion.curve.smooth),
} as const;

/**
 * A group of placeholders, announced once as loading. Put the skeletons of
 * one block of content inside it.
 */
export function SkeletonGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const pulse = usePulse();
  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('feedback.loading')}
      accessibilityState={{ busy: true }}
      style={pulse}
    >
      {children}
    </Animated.View>
  );
}

/** A block placeholder. Pass sizes from the theme (`theme.size.tile.md`) or percentages. */
export function Skeleton({ width, height, round = 'md' }: { width: DimensionValue; height: DimensionValue; round?: 'md' | 'lg' | 'xl' | '3xl' | 'pill' }) {
  styles.useVariants({ round });
  return <View style={[styles.bone, { width, height }]} />;
}

/**
 * A line of text that hasn't loaded: as tall as a line of `step` at the
 * phone's text size, so the placeholder and the text take the same space.
 */
export function TextSkeleton({ step = 'body', width = '60%' }: { step?: TypeStep; width?: DimensionValue }) {
  styles.useVariants({ step });
  return (
    <View style={styles.textLine}>
      <View style={[styles.textBar, { width }]} />
    </View>
  );
}

/** A ListRow that hasn't loaded: the same padding, tile and lines. */
export function ListRowSkeleton({ tile = true, subtitle = true }: { tile?: boolean; subtitle?: boolean }) {
  return (
    <View style={styles.row}>
      {tile ? <View style={styles.rowTile} /> : null}
      <View style={styles.rowText}>
        <TextSkeleton step="body" width="62%" />
        {subtitle ? <TextSkeleton step="footnote" width="40%" /> : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty and error
// ---------------------------------------------------------------------------

/** Nothing here yet: what it is and how to add the first one. */
export function EmptyState({ icon, title, body, action, testID }: { icon: IconName; title: string; body: string; action?: ReactNode; testID?: string }) {
  return (
    <View style={styles.state} testID={testID}>
      <View style={[styles.stateTile, styles.emptyTile]}>
        <Icon name={icon} size="xl" tone="radiant" fixed />
      </View>
      <Text step="headline" family="display" align="center" heading>
        {title}
      </Text>
      <Text step="subhead" tone="muted" align="center" style={styles.stateBody}>
        {body}
      </Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

/** Loading failed: what happened and a way to try again. */
export function ErrorState({ title, body, onRetry, testID }: { title?: string; body?: string; onRetry?: () => void; testID?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.state} testID={testID} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={[styles.stateTile, styles.errorTile]}>
        <Icon name="warning" size="xl" tone="overdue" fixed />
      </View>
      <Text step="headline" family="display" align="center" heading>
        {title ?? t('feedback.errorTitle')}
      </Text>
      <Text step="subhead" tone="muted" align="center" style={styles.stateBody}>
        {body ?? t('feedback.errorBody')}
      </Text>
      {onRetry ? (
        <View style={styles.stateAction}>
          <Button testID={testID ? `${testID}-retry` : undefined} variant="secondary" icon="refresh" label={t('feedback.retry')} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reminder status
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<ReminderStatus, IconName> = { overdue: 'alert', soon: 'clock', unknown: 'help', ok: 'success' };

/**
 * A Reminder's status as a badge: an icon and its word on the status's soft
 * fill. The word is always there, so colour is never the only signal.
 */
export function StatusBadge({ status, label, testID }: { status: ReminderStatus; label?: string; testID?: string }) {
  const { t } = useTranslation();
  styles.useVariants({ status });
  return (
    <View style={styles.badge} testID={testID}>
      <Icon name={STATUS_ICON[status]} size="xs" tone={status} />
      <Text step="caption" weight={700} tone={status}>
        {label ?? t(`status.${status}`)}
      </Text>
    </View>
  );
}

/**
 * How much of a Reminder's interval is used, in the status's colour. It fills
 * to its value on mount (the PWA's 0.7 s); with Reduce Motion it is drawn
 * full at once. Pair it with a StatusBadge: the bar alone is colour only.
 */
export function ProgressBar({ value, status, testID }: { value: number; status: ReminderStatus; testID?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const pct = Math.max(4, Math.min(100, Math.round(value * 100)));
  styles.useVariants({ status });
  const fill: `${number}%` = `${pct}%`;
  return (
    <View
      testID={testID}
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('feedback.intervalUsed')}
      accessibilityValue={{ min: 0, max: 100, now: pct, text: t('feedback.percent', { pct }) }}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: fill },
          reduced
            ? undefined
            : {
                animationName: { from: { width: '0%' }, to: { width: fill } },
                animationDuration: motion.progress.duration,
                animationTimingFunction: cubicBezier(...motion.curve.smooth),
              },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  bone: {
    backgroundColor: theme.colors.surface3,
    borderCurve: 'continuous',
    variants: {
      round: {
        md: { borderRadius: theme.radius.md },
        lg: { borderRadius: theme.radius.lg },
        xl: { borderRadius: theme.radius.xl },
        '3xl': { borderRadius: theme.radius['3xl'] },
        pill: { borderRadius: theme.radius.pill },
      },
    },
  },
  // A line box as tall as the text's line height at the phone's text size, with a bar the height of the glyphs.
  textLine: {
    justifyContent: 'center',
    variants: {
      step: Object.fromEntries(
        Object.entries(theme.type).map(([name, step]) => [name, { height: step.lineHeight * rt.fontScale }]),
      ) as Record<TypeStep, { height: number }>,
    },
  },
  textBar: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.xs,
    variants: {
      step: Object.fromEntries(
        Object.entries(theme.type).map(([name, step]) => [name, { height: step.fontSize * rt.fontScale }]),
      ) as Record<TypeStep, { height: number }>,
    },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
    minHeight: theme.size.row,
  },
  rowTile: {
    width: theme.size.tile.md,
    height: theme.size.tile.md,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface3,
  },
  rowText: {
    flex: 1,
    gap: theme.space[0.5],
  },
  state: {
    alignItems: 'center',
    paddingHorizontal: theme.space[6],
    paddingVertical: theme.space[10],
    gap: theme.space[1.5],
  },
  stateTile: {
    width: theme.size.tile.lg,
    height: theme.size.tile.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space[2.5],
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
  },
  emptyTile: {
    backgroundColor: theme.colors.radiantSoft,
  },
  errorTile: {
    backgroundColor: theme.colors.overdueSoft,
  },
  stateBody: {
    maxWidth: theme.size.readable,
  },
  stateAction: {
    marginTop: theme.space[3.5],
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.size.badge,
    paddingHorizontal: theme.space[2.5],
    paddingVertical: theme.space[0.5],
    borderRadius: theme.radius.pill,
    variants: {
      status: {
        ok: { backgroundColor: theme.colors.okSoft },
        soon: { backgroundColor: theme.colors.soonSoft },
        overdue: { backgroundColor: theme.colors.overdueSoft },
        unknown: { backgroundColor: theme.colors.unknownSoft },
      },
    },
  },
  track: {
    height: theme.size.track,
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface3,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: theme.radius.pill,
    variants: {
      status: {
        ok: { backgroundColor: theme.colors.ok },
        soon: { backgroundColor: theme.colors.soon },
        overdue: { backgroundColor: theme.colors.overdue },
        unknown: { backgroundColor: theme.colors.unknown },
      },
    },
  },
}));
