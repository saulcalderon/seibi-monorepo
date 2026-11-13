import { View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, LayoutAnimationConfig, withDelay, withTiming } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme/tokens';
import { Text } from '@/ui/text';

/** How long a place takes to roll, and how much later each place to its left starts (the PWA's Ticker). */
const ROLL_MS = 550;
const STAGGER_MS = 55;
/** How far a character travels, in ems. */
const TRAVEL_EM = 0.7;

const EASE = Easing.bezier(...motion.curve.paint);

/**
 * A number whose changed places roll to their new character, units first
 * (apps/app/src/components/Ticker.tsx). Places are keyed from the right, so
 * digits stay aligned when the number grows. It doesn't roll on mount, and
 * with Reduce Motion on the characters just change (Reanimated's layout
 * animations follow the system setting). VoiceOver and TalkBack read the
 * number once, not each character.
 */
export function Ticker({ text, fontSize, style }: { text: string; fontSize: number; style?: StyleProp<TextStyle> }) {
  const chars = Array.from(text);
  const travel = fontSize * TRAVEL_EM;
  return (
    <LayoutAnimationConfig skipEntering>
      <View style={styles.row} accessible accessibilityLabel={text}>
        {chars.map((char, i) => {
          const place = chars.length - 1 - i;
          const delay = place * STAGGER_MS;
          return (
            <View key={place} style={styles.place} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Animated.View key={char} entering={rollIn(travel, delay)} exiting={rollOut(travel, delay)}>
                <Text style={style}>{char}</Text>
              </Animated.View>
            </View>
          );
        })}
      </View>
    </LayoutAnimationConfig>
  );
}

/** The new character rises into its place. */
function rollIn(travel: number, delay: number) {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: travel }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: ROLL_MS, easing: EASE })),
        transform: [{ translateY: withDelay(delay, withTiming(0, { duration: ROLL_MS, easing: EASE })) }],
      },
    };
  };
}

/** The old one leaves upwards. */
function rollOut(travel: number, delay: number) {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
      animations: {
        opacity: withDelay(delay, withTiming(0, { duration: ROLL_MS, easing: EASE })),
        transform: [{ translateY: withDelay(delay, withTiming(-travel, { duration: ROLL_MS, easing: EASE })) }],
      },
    };
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  // Each place clips its rolling characters, as the PWA's `clip-path: inset(0 -0.25em)`.
  place: {
    overflow: 'hidden',
  },
});
