import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, type IconName } from './icon';
import { PressScale, usePressed } from './press';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** A count after the label (filters: «Por vencer 3»). */
  count?: number;
  /** In a set where only one can be on, chips are radios. */
  radio?: boolean;
  /** Spoken label; defaults to the label and the count. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A pill for filters and choices (the PWA's Chip). Selected chips turn
 * inverse; the state is also spoken, so colour is never the only signal.
 * Chips are 40 pt tall to sit in a row; `hitSlop` takes the touch area to 44.
 */
export function Chip({ label, selected = false, onPress, icon, count, radio = false, accessibilityLabel, testID }: ChipProps) {
  const { theme } = useUnistyles();
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ selected });
  const tone = selected ? 'onInverse' : 'ink';
  return (
    <Pressable
      testID={testID}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityLabel={accessibilityLabel ?? (count == null ? label : `${label}, ${count}`)}
      accessibilityState={radio ? { checked: selected } : { selected }}
      onPress={onPress}
      hitSlop={(theme.size.target - theme.size.chip) / 2}
      {...pressHandlers}
    >
      <PressScale pressed={pressed}>
        <View style={styles.chip}>
          {icon ? <Icon name={icon} size="sm" tone={tone} /> : null}
          <Text step="subhead" weight={600} tone={tone}>
            {label}
          </Text>
          {count != null ? (
            // The testID sits on a plain wrapper: on the badge it would keep Fabric from flattening it,
            // and hide the Android bug a flow checks for (docs/DESIGN.md → Corners on Android).
            <View style={styles.countSlot} testID={testID ? `${testID}-count` : undefined}>
              <View style={styles.count}>
                <Text step="caption" family="mono" tone={tone}>
                  {count}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </PressScale>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
    minHeight: theme.size.chip,
    paddingHorizontal: theme.space[3.5],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.pill,
    borderWidth: theme.size.border.thin,
    variants: {
      selected: {
        true: { backgroundColor: theme.colors.inverse, borderColor: theme.colors.inverse },
        false: { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
      },
    },
  },
  countSlot: {
    marginLeft: theme.space[0.5],
  },
  count: {
    paddingHorizontal: theme.space[1.5],
    borderRadius: theme.radius.pill,
    variants: {
      // The PWA tints the count on a selected chip with 15 % of `onInverse`; the port keeps the inverse fill.
      // A fill in both states: on Android a rounded view with no fill at mount is flattened away, and
      // when a fill appears later it is drawn square (docs/DESIGN.md → Corners on Android).
      selected: { true: { backgroundColor: theme.colors.inverse }, false: { backgroundColor: theme.colors.surface3 } },
    },
  },
}));
