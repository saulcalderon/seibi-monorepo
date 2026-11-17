import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { cubicBezier, Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { ScopedTheme, StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import type { MaintenanceTask } from '@/data/task/catalog';
import { formatNumber, measureLabel } from '@/lib/format';
import { knowledgeProfile, taskLabel, type KnowledgeLevel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { TabScroll } from '@/shell/tab-scroll';
import { contactShadow, paintAccent, paintHex, paintGlow, stageFloor } from '@/theme/garage';
import { motion } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

import { garageStatus, mileageHint, STATUS_CARDS, usedPercent } from './garage-logic';
import { Stage } from './stage';
import { Ticker } from './ticker';

export interface GarageProps {
  state: 'loading' | 'error' | 'ready';
  vehicles: readonly VehicleView[];
  active: VehicleView | null;
  tasks: readonly MaintenanceTask[];
  knowledgeLevel: KnowledgeLevel | null | undefined;
  onSelect: (id: string) => void;
  onOpenVehicle: (id: string) => void;
  onUpdateMileage: (id: string) => void;
  onAddVehicle: () => void;
  onRetry: () => void;
  testID?: string;
}

/**
 * Inicio (Garage v3, the PWA's apps/app/src/screens/Home.tsx without the 3D
 * branch): the stage with the active Vehicle, its Mileage as the screen's one
 * big number, and the «Estado» cards. It draws on the `garage` palette in
 * light and on night in night (Garage is not art-directed for night). Data
 * comes in as props, so the Seibi Dev sample (`garage-fixture`) draws the
 * same screen.
 */
export function Garage(props: GarageProps) {
  const { rt } = useUnistyles();
  return (
    <ScopedTheme name={rt.themeName === 'dark' ? 'dark' : 'garage'}>
      <TabScroll flush testID={props.testID}>
        <GarageBody {...props} />
      </TabScroll>
    </ScopedTheme>
  );
}

function GarageBody({
  state,
  vehicles,
  active,
  tasks,
  knowledgeLevel,
  onSelect,
  onOpenVehicle,
  onUpdateMileage,
  onAddVehicle,
  onRetry,
}: GarageProps) {
  if (state === 'loading') return <GarageSkeleton />;
  if (state === 'error') {
    return (
      <View style={styles.error}>
        <ErrorState testID="home-error" onRetry={onRetry} />
      </View>
    );
  }
  if (!active) return <EmptyGarage onAdd={onAddVehicle} />;
  return (
    <>
      <Stage vehicles={vehicles} active={active} onSelect={onSelect} onOpen={onOpenVehicle} />
      {/* The numbers under the stage fade in when the Vehicle changes (the PWA's 0.2 s). */}
      <Animated.View key={active.id} entering={FadeIn.duration(200).easing(Easing.bezier(...motion.curve.paint))}>
        <Odometer vehicle={active} onUpdate={() => onUpdateMileage(active.id)} />
        <Status vehicle={active} tasks={tasks} knowledgeLevel={knowledgeLevel} />
      </Animated.View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mileage
// ---------------------------------------------------------------------------

function Odometer({ vehicle, onUpdate }: { vehicle: VehicleView; onUpdate: () => void }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const hint = mileageHint(vehicle.mileagePrompt, t);
  const measure = measureLabel(vehicle.measure);
  return (
    <View style={styles.section}>
      <View style={styles.odometerRow}>
        <View
          style={styles.odometerText}
          accessible
          accessibilityLabel={
            vehicle.odometer != null
              ? t('home.mileage.spoken', { value: formatNumber(vehicle.odometer), measure })
              : `${t('home.mileage.label')}: ${t('home.mileage.none')}`
          }
          testID="home-odometer"
        >
          <Text step="footnote" weight={500} tone="muted">
            {t('home.mileage.label')}
          </Text>
          {vehicle.odometer != null ? (
            <View style={styles.reading}>
              <Ticker text={formatNumber(vehicle.odometer)} fontSize={theme.garageType.odometer.fontSize} style={styles.odometer} />
              <Text step="callout" tone="muted">
                {measure}
              </Text>
            </View>
          ) : (
            <Text weight={300} style={styles.display}>
              {t('home.mileage.none')}
            </Text>
          )}
        </View>
        <Button
          variant="tonal"
          icon="mileage"
          label={t('home.mileage.update')}
          accessibilityLabel={t('home.mileage.updateSpoken')}
          onPress={onUpdate}
          testID="home-update-mileage"
        />
      </View>
      {hint ? (
        <Text step="footnote" tone="muted" style={styles.hint} testID="home-mileage-hint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

function Status({
  vehicle,
  tasks,
  knowledgeLevel,
}: {
  vehicle: VehicleView;
  tasks: readonly MaintenanceTask[];
  knowledgeLevel: KnowledgeLevel | null | undefined;
}) {
  const { t } = useTranslation();
  const status = garageStatus(vehicle.reminders);
  if (status.known.length === 0) return null;
  const k = knowledgeProfile(knowledgeLevel);
  const byCode = new Map(tasks.map((task) => [task.code, task]));
  const accent = paintAccent(paintHex(vehicle.color));
  const cards = status.known.slice(0, STATUS_CARDS);
  const rows = [cards.slice(0, 2), cards.slice(2, 4)].filter((row) => row.length > 0);

  return (
    <View testID="home-status">
      <View style={styles.statusHeader}>
        <Text step="body" weight={500} heading>
          {t('home.status.title')}
        </Text>
        <View style={styles.summary} testID="home-status-summary">
          {status.overdue ? <View style={styles.alertDot} /> : null}
          <Text step="footnote" weight={500} tone={status.overdue ? 'overdue' : 'muted'}>
            {status.attention === 0 ? t('home.status.allClear') : t('home.status.attention', { count: status.attention })}
          </Text>
        </View>
      </View>
      <View style={styles.cards}>
        {rows.map((row, r) => (
          <View key={r} style={styles.cardRow}>
            {row.map((reminder, c) => (
              <StatusCard
                key={reminder.taskCode}
                reminder={reminder}
                label={taskLabel(byCode.get(reminder.taskCode), reminder.taskCode, k)}
                accent={accent}
                testID={`home-status-${r * 2 + c}`}
              />
            ))}
            {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * One task: its icon, its status word, its name and how much of its interval
 * is used, in the paint's accent (red when overdue). The Reminder's detail is
 * S9's: until then the card is information, not a button.
 */
function StatusCard({ reminder, label, accent, testID }: { reminder: Reminder; label: string; accent: string; testID: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const over = reminder.status === 'overdue';
  const word = t(`status.${reminder.status}`);
  const used = usedPercent(reminder);
  styles.useVariants({ over });
  return (
    <View style={styles.card} accessible accessibilityLabel={t('home.status.card', { task: label, status: word })} testID={testID}>
      <View style={styles.cardTop}>
        <Icon name={taskIcon(reminder.taskCode)} size="md" />
        <View style={styles.summary}>
          {over ? <View style={styles.alertDot} /> : null}
          <Text step="caption" weight={500} tone={over ? 'overdue' : 'muted'}>
            {word}
          </Text>
        </View>
      </View>
      <Text step="subhead" weight={500} numberOfLines={2} style={styles.cardLabel}>
        {label}
      </Text>
      <View style={styles.track}>
        <Animated.View
          style={[styles.bar, { width: `${used}%` as const }, !over && { backgroundColor: accent }, !reduced && barTransition]}
        />
      </View>
    </View>
  );
}

// Timing only: the bar moves to a new value in 0.4 s (the PWA's), never on mount.
const barTransition = {
  transitionProperty: 'width',
  transitionDuration: 400,
  transitionTimingFunction: cubicBezier(...motion.curve.paint),
} as const;

// ---------------------------------------------------------------------------
// Loading and empty
// ---------------------------------------------------------------------------

/** The stage's frame with placeholders where the text, the odometer and the cards go. */
function GarageSkeleton() {
  const { theme } = useUnistyles();
  return (
    <SkeletonGroup testID="home-loading">
      <View style={[styles.emptyStage, styles.skeletonStage]}>
        <TextSkeleton step="footnote" width="18%" />
        <TextSkeleton step="title1" width="45%" />
        <TextSkeleton step="footnote" width="32%" />
      </View>
      <View style={styles.section}>
        <TextSkeleton step="footnote" width="22%" />
        <Skeleton width="55%" height={theme.garageType.odometer.lineHeight} round="lg" />
      </View>
      <View style={[styles.cards, styles.skeletonCards]}>
        {[0, 1].map((r) => (
          <View key={r} style={styles.cardRow}>
            {[0, 1].map((c) => (
              <View key={c} style={styles.card}>
                <TextSkeleton step="caption" width="40%" />
                <TextSkeleton step="subhead" width="70%" />
              </View>
            ))}
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** No Vehicles yet: the empty stage, what Seibi does, and a way to add the first one. */
function EmptyGarage({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const silver = paintHex(null);
  return (
    <View testID="home-empty">
      <View style={styles.emptyStage}>
        <View style={[styles.emptyGlow, { backgroundImage: paintGlow(silver) }]} />
        <View style={styles.emptyContact} />
        <Text weight={300} heading style={styles.display} testID="home-empty-title">
          {t('home.empty.title')}
        </Text>
      </View>
      <Text step="body" tone="muted" style={styles.emptyBody}>
        {t('home.empty.body')}
      </Text>
      <View style={styles.emptyAction}>
        <Button variant="inverse" size="lg" block icon="add" label={t('home.empty.add')} onPress={onAdd} testID="home-add-vehicle" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const stacked = rt.fontScale >= theme.largeTextScale;
  return {
    error: {
      paddingHorizontal: theme.space[4],
    },
    section: {
      paddingHorizontal: theme.space[5],
      paddingTop: theme.space[5],
    },
    odometerRow: {
      flexDirection: stacked ? 'column' : 'row',
      alignItems: stacked ? 'flex-start' : 'flex-end',
      justifyContent: 'space-between',
      gap: theme.space[3],
    },
    odometerText: {
      flexShrink: 1,
    },
    reading: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: theme.space[1.5],
      marginTop: theme.space[0.5],
    },
    odometer: {
      fontFamily: theme.fonts.sans[300],
      fontSize: theme.garageType.odometer.fontSize,
      lineHeight: theme.garageType.odometer.lineHeight,
      letterSpacing: theme.garageType.odometer.fontSize * theme.garageType.odometer.tracking,
      fontVariant: ['tabular-nums'],
    },
    display: {
      marginTop: theme.space[1],
      fontSize: theme.garageType.display.fontSize,
      lineHeight: theme.garageType.display.lineHeight,
      letterSpacing: theme.garageType.display.fontSize * theme.garageType.display.tracking,
    },
    hint: {
      marginTop: theme.space[2],
    },
    statusHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[2],
      paddingHorizontal: theme.space[5],
      paddingTop: theme.space[4.5],
      paddingBottom: theme.space[2.5],
    },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[1.5],
    },
    alertDot: {
      width: theme.size.pagerDot.side,
      height: theme.size.pagerDot.side,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.overdue,
    },
    cards: {
      gap: theme.space[2.5],
      paddingHorizontal: theme.space[5],
    },
    cardRow: {
      flexDirection: stacked ? 'column' : 'row',
      gap: theme.space[2.5],
    },
    cardSpacer: {
      flex: 1,
    },
    card: {
      flex: stacked ? undefined : 1,
      gap: theme.space[3],
      paddingHorizontal: theme.space[3.5],
      paddingTop: theme.space[3.5],
      paddingBottom: theme.space[4],
      borderRadius: theme.radius['3xl'],
      borderCurve: 'continuous',
      backgroundColor: theme.colors.surface,
      boxShadow: theme.shadow.card,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[2],
    },
    cardLabel: {
      flexGrow: 1,
    },
    track: {
      height: theme.size.bar,
      overflow: 'hidden',
      borderRadius: theme.radius.xs,
      backgroundColor: theme.garage.track,
    },
    bar: {
      height: '100%',
      borderRadius: theme.radius.xs,
      variants: {
        over: { true: { backgroundColor: theme.colors.overdue }, false: {} },
      },
    },
    emptyStage: {
      marginHorizontal: theme.space[3],
      minHeight: theme.size.stage.height,
      overflow: 'hidden',
      paddingHorizontal: theme.space[5],
      paddingTop: theme.space[4.5],
      borderRadius: theme.radius['3xl'],
      borderCurve: 'continuous',
      backgroundImage: stageFloor(theme.garage),
    },
    skeletonStage: {
      gap: theme.space[2],
    },
    skeletonCards: {
      paddingTop: theme.space[10],
    },
    emptyGlow: {
      position: 'absolute',
      left: '7%',
      right: '7%',
      bottom: '15%',
      height: '22%',
    },
    emptyContact: {
      position: 'absolute',
      left: '15%',
      right: '15%',
      bottom: '23.5%',
      height: '7%',
      opacity: 0.35,
      backgroundImage: contactShadow(theme.garage),
    },
    emptyBody: {
      marginHorizontal: theme.space[5],
      marginTop: theme.space[5],
    },
    emptyAction: {
      paddingHorizontal: theme.space[5],
      paddingTop: theme.space[6],
    },
  };
});
