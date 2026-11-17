import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from '@/ui/icon';
import { PressScale, usePressed } from '@/ui/press';
import { Text } from '@/ui/text';

/**
 * One answer of a first-run question, the PWA's Onboarding `Option`: a card
 * with the answer and a round mark on the right that fills when chosen. It
 * is a radio in an `OptionGroup`, or a button where the answer moves on at once.
 */
export function Option({
  title,
  selected = false,
  onPress,
  role = 'radio',
  testID,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  /** `button` for an answer that moves on at once and is never shown chosen (the check questions). */
  role?: 'radio' | 'button';
  testID?: string;
}) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ selected });
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={title}
      accessibilityState={role === 'radio' ? { checked: selected } : undefined}
      onPress={onPress}
      {...pressHandlers}
    >
      <PressScale pressed={pressed}>
        <View style={styles.option}>
          <Text step="callout" weight={500} style={styles.title}>
            {title}
          </Text>
          <View style={styles.mark}>{selected ? <Icon name="check" size="xs" tone="onInverse" fixed /> : null}</View>
        </View>
      </PressScale>
    </Pressable>
  );
}

/** The answers to one question, said as a group with its name. */
export function OptionGroup({ label, children, testID }: { label?: string; children: ReactNode; testID?: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: {
    gap: theme.space[2.5],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.row,
    padding: theme.space[4],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    boxShadow: theme.shadow.card,
    // The PWA's `ring-2 ring-ink` on the chosen answer: an outline, so choosing never moves the layout.
    outlineStyle: 'solid',
    outlineColor: theme.colors.ink,
    variants: {
      selected: {
        true: { outlineWidth: theme.size.border.focus },
        false: { outlineWidth: 0 },
      },
    },
  },
  title: {
    flex: 1,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: theme.size.icon.lg,
    height: theme.size.icon.lg,
    borderRadius: theme.radius.pill,
    borderWidth: theme.size.border.focus,
    variants: {
      selected: {
        true: { backgroundColor: theme.colors.inverse, borderColor: theme.colors.inverse },
        false: { backgroundColor: theme.colors.surface, borderColor: theme.colors.surface3 },
      },
    },
  },
}));
