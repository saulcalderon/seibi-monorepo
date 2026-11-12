// iOS half of the floating [+]: a Liquid Glass circle (expo-glass-effect).
// Android's half is floating-action.tsx; both export the same component.
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './icon';
import type { FloatingActionProps } from './floating-action.types';
import { PressScale, usePressed } from './press';

/**
 * The glass is interactive, so it answers a touch the way the system's own
 * glass buttons do; the press scale adds the kit's feedback on top. Before
 * iOS 26 (no Liquid Glass) it is a solid `inverse` circle, the PWA's [+].
 */
export function FloatingAction({ label, onPress, testID }: FloatingActionProps) {
  const { theme } = useUnistyles();
  const { pressed, pressHandlers } = usePressed();
  const glass = isGlassEffectAPIAvailable();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...pressHandlers}>
      <PressScale pressed={pressed}>
        {glass ? (
          <GlassView isInteractive glassEffectStyle="regular" tintColor={theme.colors.radiant} style={styles.button}>
            <Icon name="add" size="lg" tone="onRadiant" fixed />
          </GlassView>
        ) : (
          <View style={[styles.button, styles.solid]}>
            <Icon name="add" size="lg" tone="onInverse" fixed />
          </View>
        )}
      </PressScale>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    width: theme.size.fab,
    height: theme.size.fab,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  solid: {
    backgroundColor: theme.colors.inverse,
    boxShadow: theme.shadow.float,
  },
}));
