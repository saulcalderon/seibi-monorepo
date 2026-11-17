import { Image } from 'expo-image';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { vehicleName } from '@/lib/format';
import { contactShadow, paintGlow, reflectionFade } from '@/theme/garage';
import { motion, posterAspect } from '@/theme/tokens';
import { Silhouette } from '@/ui/silhouette';

/**
 * The Vehicle's art, shared by Inicio's stage and the Vehicle detail hero
 * (the PWA's VehicleVisual): the fal poster when it exists, feathered into
 * the floor, else the paint-coloured silhouette standing on the floor with
 * its reflection. The caller shapes the box and the silhouette's width.
 */
export function VehicleArt({ vehicle, paint, silhouetteWidth, testID }: { vehicle: VehicleView; paint: string; silhouetteWidth: number; testID?: string }) {
  const poster = useCachedPoster(vehicle.render?.posterUrl ?? null);

  if (vehicle.render?.posterUrl && !poster.failed) {
    return (
      <>
        <View style={[styles.glow, { backgroundImage: paintGlow(paint) }]} />
        {poster.file ? <Poster vehicle={vehicle} file={poster.file} /> : null}
      </>
    );
  }
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
        <Silhouette bodyType={vehicle.bodyType} paint={paint} width={silhouetteWidth} testID={testID} />
      </View>
    </>
  );
}

/**
 * The poster as a file on the phone: expo-image downloads it once into its
 * disk cache (the cache key is the URL), and every later launch reads it from
 * there. `null` while it loads; `failed` when it can't be had, so the
 * silhouette stands in.
 */
export function useCachedPoster(url: string | null) {
  const [state, setState] = useState<{ url: string | null; file: string | null; failed: boolean }>({
    url: null,
    file: null,
    failed: false,
  });
  useEffect(() => {
    if (!url) return;
    let live = true;
    Image.prefetch(url, 'disk')
      .then((ok) => (ok ? Image.getCachePathAsync(url) : null))
      .then((path) => {
        if (live) setState({ url, file: path ? `file://${path}` : null, failed: !path });
      })
      .catch(() => {
        if (live) setState({ url, file: null, failed: true });
      });
    return () => {
      live = false;
    };
  }, [url]);
  return state.url === url ? state : { url, file: null, failed: false };
}

/**
 * The poster is a studio photo, not a cut-out. As the PWA does, its edges
 * fade out through a radial mask (opaque to 72 % of the ellipse, clear at its
 * edge), drawn with react-native-svg because React Native views can't be
 * masked; in light the masked poster multiplies into the floor, so its grey
 * sweep becomes the floor's shade. It fades in once, the first time it shows.
 */
function Poster({ vehicle, file }: { vehicle: VehicleView; file: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const mask = `feather-${useId().replace(/:/g, '')}`;
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const width = box ? Math.min(box.width, box.height * posterAspect) : 0;
  const height = width / posterAspect;
  return (
    <View style={styles.posterBox} onLayout={(event) => setBox(event.nativeEvent.layout)}>
      {box ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(motion.progress.duration)} style={styles.poster}>
          <Svg
            width={width}
            height={height}
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('home.stage.poster', { name: vehicleName(vehicle), year: vehicle.year })}
            testID="vehicle-poster"
          >
            <Defs>
              <RadialGradient id={`${mask}-fade`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0.72" stopColor={FEATHER_OPAQUE} stopOpacity={1} />
                <Stop offset="1" stopColor={FEATHER_OPAQUE} stopOpacity={0} />
              </RadialGradient>
              <Mask id={mask}>
                <Rect width={width} height={height} fill={`url(#${mask}-fade)`} />
              </Mask>
            </Defs>
            <SvgImage href={file} width={width} height={height} preserveAspectRatio="xMidYMid meet" mask={`url(#${mask})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A mask lets through what is white in it: the luminance that keeps the poster, not a colour on screen. */
const FEATHER_OPAQUE = 'white';

const styles = StyleSheet.create((theme) => ({
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
  // One view, so the masked poster multiplies into the floor as one layer.
  poster: {
    mixBlendMode: theme.garage.posterBlend,
  },
}));
