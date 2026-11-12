import { Host, Picker, Switch } from '@expo/ui';
import { MenuView } from '@expo/ui/community/menu';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Field, type FieldShellProps } from './fields';
import { Icon, icons, type IconName } from './icon';
import { DateControl, switchModifiers } from './native-controls';
import type { DateControlProps } from './native-controls.types';
import { Text } from './text';

/*
 * Selects, switches, menus and the date picker are the platform's own
 * controls, from @expo/ui: SwiftUI on iOS, Jetpack Compose on Android
 * (docs/DESIGN.md → Components). Seibi only lays them out and labels them;
 * their look, motion and haptics are the system's.
 */

export interface SelectFieldProps<T extends string | number> extends FieldShellProps {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

/**
 * One choice from a short list: SwiftUI's menu picker on iOS (inside a field
 * box), Material's exposed dropdown on Android (which draws its own box).
 */
export function SelectField<T extends string | number>({ label, hint, error, optional, value, onChange, options, testID }: SelectFieldProps<T>) {
  const { theme } = useUnistyles();
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {/* The testID goes where a tap opens the menu: iOS's picker is its label; Android's
          dropdown ignores testID but fills the box. */}
      <View style={styles.select} testID={process.env.EXPO_OS === 'android' ? testID : undefined}>
        <Host matchContents seedColor={theme.colors.radiant}>
          <Picker selectedValue={value} onValueChange={onChange} accessibilityLabel={label} testID={process.env.EXPO_OS === 'ios' ? testID : undefined}>
            {options.map((option) => (
              <Picker.Item key={String(option.value)} label={option.label} value={option.value} />
            ))}
          </Picker>
        </Host>
      </View>
    </Field>
  );
}

export interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * A setting that is on or off: its text on the left, the native switch on
 * the right (iOS Settings, Material lists). The switch is the control; the
 * text is its spoken label.
 */
export function Toggle({ label, description, value, onChange, disabled = false, testID }: ToggleProps) {
  const { theme } = useUnistyles();
  const spoken = description ? `${label}, ${description}` : label;
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleText} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text step="body" weight={600}>
          {label}
        </Text>
        {description ? (
          <Text step="footnote" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Host matchContents seedColor={theme.colors.radiant}>
        <Switch value={value} onValueChange={onChange} disabled={disabled} testID={testID} modifiers={switchModifiers(spoken)} />
      </Host>
    </View>
  );
}

export interface MenuAction {
  id: string;
  title: string;
  /** An SF Symbol on iOS; Android menus show text only. */
  icon?: IconName;
  destructive?: boolean;
}

/**
 * A button that opens the platform's menu: SwiftUI's `Menu` on iOS,
 * Material's dropdown on Android. The trigger looks like a secondary
 * IconButton; the menu itself handles the tap.
 */
export function MenuButton({
  label,
  icon = 'more',
  actions,
  onAction,
  testID,
}: {
  /** Required: the trigger has no visible words. */
  label: string;
  icon?: IconName;
  actions: MenuAction[];
  onAction: (id: string) => void;
  testID?: string;
}) {
  return (
    <MenuView
      testID={testID}
      actions={actions.map((action) => ({
        id: action.id,
        title: action.title,
        image: process.env.EXPO_OS === 'ios' && action.icon ? icons[action.icon].ios : undefined,
        attributes: action.destructive ? { destructive: true } : undefined,
      }))}
      onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)}
    >
      <View accessible accessibilityRole="button" accessibilityLabel={label} style={styles.menuTrigger}>
        <Icon name={icon} size="md" />
      </View>
    </MenuView>
  );
}

/** A date in a Field: SwiftUI's compact picker on iOS, Material's dialog on Android. */
export function DateField({ hint, error, optional, ...control }: DateControlProps & Omit<FieldShellProps, 'label' | 'testID'>) {
  return (
    <Field label={control.label} hint={hint} error={error} optional={optional}>
      <View style={styles.date}>
        <DateControl {...control} />
      </View>
    </Field>
  );
}

const styles = StyleSheet.create((theme) => ({
  select: {
    // iOS's picker is a bare menu button, so it sits in a field box; Android's dropdown draws its own.
    ...(process.env.EXPO_OS === 'ios'
      ? {
          minHeight: theme.size.field,
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingHorizontal: theme.space[2],
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          borderCurve: 'continuous',
          borderWidth: theme.size.border.thin,
          borderColor: theme.colors.line,
        }
      : {}),
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.row,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  toggleText: {
    flex: 1,
    gap: theme.space[0.5],
  },
  menuTrigger: {
    minWidth: theme.size.target,
    minHeight: theme.size.target,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    borderWidth: theme.size.border.thin,
    borderColor: theme.colors.line,
    boxShadow: theme.shadow.card,
  },
  date: {
    alignItems: process.env.EXPO_OS === 'ios' ? 'flex-start' : 'stretch',
  },
}));
