import { Image } from 'expo-image';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { vehicleName } from '@/lib/format';
import { paintLabel } from '@/lib/paint';
import {
  contactShadow,
  paintAccent,
  paintGlow,
  paintHex,
  paintTint,
  posterFeather,
  reflectionFade,
  stageFloor,
  stageVignette,
} from '@/theme/garage';
import { motion, posterAspect } from '@/theme/tokens';
import { IconButton } from '@/ui/button';
import { Silhouette } from '@/ui/silhouette';
import { Text } from '@/ui/text';

import { pageAt, stepIndex } from './garage-logic';

/** The silhouette's drawing is 240 × 96. */
const SILHOUETTE_RATIO = 240 / 96;
/** Its box: 90 % of the page's width, 57 % of the floor's height (the PWA's 40 % of the stage). */
const CAR_WIDTH = 0.9;
const CAR_HEIGHT = 0.57;

/**
 * Inicio's stage (Garage v3): the active Vehicle on a lit floor, its make,
 * name and «año · pintura» above it, and a pager when there is more than one.
 *
 * The Vehicles are pages of a native paging scroll view (UIScrollView,
 * Android's ScrollView): the page follows the finger, flicks with its
 * velocity and settles where the platform settles it. The arrows and the
 * pager step through the same pages. For VoiceOver and TalkBack the pager is
 * one adjustable control, as a system page control is: swipe up or down to
 * change the Vehicle, and it says which one and its place. The Vehicle's
 * name is a button that opens it.
 */
export function Stage({
  vehicles,
  active,
  onSelect,
  onOpen,
}: {
  vehicles: readonly VehicleView[];
  active: VehicleView;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  /** The page the scroll view rests on, or -1 before it has been placed. */
  const resting = useRef(-1);
  const count = vehicles.length;
  const index = Math.max(0, vehicles.findIndex((v) => v.id === active.id));

  // Bring the scroll view to the active Vehicle when it changes from outside
  // a swipe: the arrows, the pager, a Vehicle withdrawn elsewhere, and the
  // first layout (no animation then).
  useEffect(() => {
    if (width === 0 || resting.current === index) return;
    scroller.current?.scrollTo({ x: index * width, animated: resting.current !== -1 && !reduced });
    resting.current = index;
  }, [index, width, reduced]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = pageAt(event.nativeEvent.contentOffset.x, width, count);
    resting.current = page;
    const next = vehicles[page];
    if (next && next.id !== active.id) onSelect(next.id);
  };

  const step = (delta: number) => {
    const next = vehicles[stepIndex(index, delta, count)];
    if (next && next.id !== active.id) onSelect(next.id);
  };

  const onAdjust = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') step(1);
    if (event.nativeEvent.actionName === 'decrement') step(-1);
  };

  return (
    <View style={styles.stage} onLayout={onLayout} testID="home-stage">
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        scrollEnabled={count > 1}
        showsHorizontalScrollIndicator={false}
        // Starts on the active page on iOS; Android is placed by the effect above.
        contentOffset={{ x: index * width, y: 0 }}
        onMomentumScrollEnd={onSettle}
        testID="home-stage-pages"
      >
        {width > 0
          ? vehicles.map((vehicle, i) => (
              <StagePage key={vehicle.id} vehicle={vehicle} width={width} current={i === index} onOpen={onOpen} />
            ))
          : null}
      </ScrollView>

      {count > 1 ? (
        <View style={styles.pager}>
          <IconButton
            icon="back"
            variant="secondary"
            round
            label={t('home.stage.previous')}
            onPress={() => step(-1)}
            testID="home-stage-previous"
          />
          <View
            testID="home-pager"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t('home.stage.label')}
            accessibilityValue={{
              text: t('home.stage.position', { name: vehicleName(active), index: index + 1, count }),
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAdjust}
            style={styles.dots}
          >
            {vehicles.map((v) => (
              <Dot key={v.id} on={v.id === active.id} accent={paintAccent(paintHex(active.color))} />
            ))}
          </View>
          <IconButton
            icon="forward"
            variant="secondary"
            round
            label={t('home.stage.next')}
            onPress={() => step(1)}
            testID="home-stage-next"
          />
        </View>
      ) : null}
    </View>
  );
}

/** One Vehicle on the floor. Only the current page is in the accessibility tree. */
function StagePage({
  vehicle,
  width,
  current,
  onOpen,
}: {
  vehicle: VehicleView;
  width: number;
  current: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const paint = paintHex(vehicle.color);
  const details = [vehicle.year, paintLabel(vehicle.color, t)].filter(Boolean).join(' · ');
  const name = vehicleName(vehicle);
  return (
    <View
      style={[styles.page, { width }]}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!current}
    >
      <View style={[styles.fill, { backgroundImage: paintTint(paint) }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.stage.vehicle', { name, details })}
        accessibilityHint={t('home.stage.open')}
        onPress={() => onOpen(vehicle.id)}
        style={styles.heading}
        testID={current ? 'home-stage-vehicle' : undefined}
      >
        <Text step="footnote" weight={500} tone="muted" testID={current ? 'home-vehicle-brand' : undefined}>
          {vehicle.brand}
        </Text>
        <Text weight={300} style={styles.model} testID={current ? 'home-vehicle-model' : undefined}>
          {vehicle.model}
        </Text>
        <Text step="footnote" weight={500} tone="muted" style={styles.details} testID={current ? 'home-vehicle-details' : undefined}>
          {details}
        </Text>
      </Pressable>
      <View style={styles.floor}>
        <StageCar vehicle={vehicle} pageWidth={width} paint={paint} />
      </View>
      <View style={styles.vignette} pointerEvents="none" />
    </View>
  );
}

/**
 * The Vehicle: the fal poster when it exists, feathered into the floor, else
 * the paint-coloured silhouette standing on the floor with its reflection.
 * The poster goes through expo-image's memory and disk cache, so it is
 * downloaded once.
 */
function StageCar({ vehicle, pageWidth, paint }: { vehicle: VehicleView; pageWidth: number; paint: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(posterAspect);
  const poster = failed ? null : (vehicle.render?.posterUrl ?? null);

  if (poster) {
    return (
      <>
        <View style={[styles.glow, { backgroundImage: paintGlow(paint) }]} />
        <View style={styles.posterBox}>
          <View style={[styles.poster, { aspectRatio: aspect }]}>
            <Image
              source={poster}
              cachePolicy="memory-disk"
              contentFit="contain"
              transition={motion.progress.duration}
              recyclingKey={vehicle.id}
              onLoad={(event) => setAspect(event.source.width / event.source.height)}
              onError={() => setFailed(true)}
              style={styles.posterImage}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('home.stage.poster', { name: vehicleName(vehicle), year: vehicle.year })}
              testID="home-vehicle-poster"
            />
            <View style={styles.feather} pointerEvents="none" />
          </View>
        </View>
      </>
    );
  }

  const silhouetteWidth = Math.min(pageWidth * CAR_WIDTH, theme.size.stage.floor * CAR_HEIGHT * SILHOUETTE_RATIO);
  return (
    <>
      <View style={[styles.glow, { backgroundImage: paintGlow(paint) }]} />
      <View style={styles.contact} />
      <View style={styles.reflection} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.mirrored}>
          <Silhouette bodyType={vehicle.bodyType} paint={paint} width={silhouetteWidth} />
        </View>
        <View style={styles.reflectionFade} />
      </View>
      <View style={styles.carBox}>
        <Silhouette bodyType={vehicle.bodyType} paint={paint} width={silhouetteWidth} testID="home-vehicle-silhouette" />
      </View>
    </>
  );
}

/** A pager dot: the active one is wider and takes the paint's accent; both change in 200 ms. */
function Dot({ on, accent }: { on: boolean; accent: string }) {
  const reduced = useReducedMotion();
  styles.useVariants({ on });
  return <Animated.View style={[styles.dot, on && { backgroundColor: accent }, !reduced && dotTransition]} />;
}

// Timing, not colours or sizes: a plain Reanimated CSS transition.
const dotTransition = {
  transitionProperty: ['width', 'backgroundColor'] as ['width', 'backgroundColor'],
  transitionDuration: 200,
  transitionTimingFunction: cubicBezier(...motion.curve.paint),
};

const styles = StyleSheet.create((theme) => ({
  stage: {
    marginHorizontal: theme.space[3],
    minHeight: theme.size.stage.height,
    overflow: 'hidden',
    borderRadius: theme.radius['3xl'],
    borderCurve: 'continuous',
    backgroundImage: stageFloor(theme.garage),
  },
  page: {
    minHeight: theme.size.stage.height,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  heading: {
    zIndex: 1,
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[4.5],
  },
  model: {
    marginTop: theme.space[1],
    fontSize: theme.garageType.display.fontSize,
    lineHeight: theme.garageType.display.lineHeight,
    letterSpacing: theme.garageType.display.fontSize * theme.garageType.display.tracking,
  },
  details: {
    marginTop: theme.space[1.5],
    fontVariant: ['tabular-nums'],
  },
  // Where the Vehicle stands: the rest of the stage under the text.
  floor: {
    flex: 1,
    minHeight: theme.size.stage.floor,
  },
  glow: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    bottom: '21%',
    height: '32%',
    borderRadius: theme.radius.pill,
  },
  contact: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    bottom: '33%',
    height: '10%',
    backgroundImage: contactShadow(theme.garage),
  },
  carBox: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    bottom: '36%',
    height: '57%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // The silhouette mirrored from its tyre line, faded into the floor.
  reflection: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '64%',
    height: '57%',
    overflow: 'hidden',
    opacity: 0.1,
  },
  mirrored: {
    alignItems: 'center',
    transform: [{ scaleY: -1 }],
  },
  reflectionFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: reflectionFade(theme.garage),
  },
  posterBox: {
    position: 'absolute',
    left: '2%',
    right: '2%',
    bottom: '13%',
    height: '89%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    height: '100%',
    maxWidth: '100%',
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
    mixBlendMode: theme.garage.posterBlend,
  },
  feather: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: posterFeather(theme.garage),
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: stageVignette(theme.garage),
  },
  pager: {
    position: 'absolute',
    left: theme.space[2.5],
    right: theme.space[2.5],
    bottom: theme.space[2.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
    // A target as tall as the arrows, so the adjustable control is easy to find by touch.
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[2],
  },
  dot: {
    height: theme.size.pagerDot.side,
    borderRadius: theme.size.pagerDot.side / 2,
    variants: {
      on: {
        true: { width: theme.size.pagerDot.active },
        false: { width: theme.size.pagerDot.side, backgroundColor: theme.garage.dot },
      },
    },
  },
}));
