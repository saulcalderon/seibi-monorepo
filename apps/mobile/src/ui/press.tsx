import { useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

/**
 * The pressed state of a button-like control, for its pressed colour. Set on
 * press-in, so the feedback lands with the finger, not on release.
 */
export function usePressed() {
  const [pressed, setPressed] = useState(false);
  return {
    pressed,
    pressHandlers: { onPressIn: () => setPressed(true), onPressOut: () => setPressed(false) },
  };
}

/**
 * Press feedback: the control shrinks to 97 % in 120 ms with a strong
 * ease-out, on the UI thread (a Reanimated CSS transition). It only scales,
 * so the Unistyles styles stay on the plain views inside it. With Reduce
 * Motion on it renders nothing extra and nothing moves; the pressed colour
 * still changes, without animating.
 */
export function PressScale({ pressed, style, children }: { pressed: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduced = useReducedMotion();
  return <Animated.View style={[!reduced && scale.base, !reduced && pressed && scale.pressed, style]}>{children}</Animated.View>;
}

// Transforms and timing, not colours or sizes: plain Reanimated styles
// (React Native's StyleSheet doesn't type CSS transitions).
const scale = {
  base: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: motion.press.duration,
    transitionTimingFunction: cubicBezier(...motion.curve.out),
  },
  pressed: { transform: [{ scale: motion.press.scale }] },
} as const;
