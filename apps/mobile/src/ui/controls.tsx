import { Host, Switch } from '@expo/ui';
import { MenuView } from '@expo/ui/community/menu';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Field, type FieldShellProps } from './fields';
import { Icon, icons, type IconName } from './icon';
import { DateControl, SelectControl, switchModifiers } from './native-controls';
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
 * One choice from a short list, in a field: Seibi's field box opens the
 * system menu on iOS and Material's dropdown menu on Android.
 */
export function SelectField<T extends string | number>({ label, hint, error, optional, value, onChange, options, testID }: SelectFieldProps<T>) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <SelectControl label={label} value={value} onChange={onChange} options={options} testID={testID} />
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
 * IconButton, or like a secondary Button when it has `text` (the Service
 * form's «Adjuntar foto»); the menu itself handles the tap.
 */
export function MenuButton({
  label,
  text,
  icon = 'more',
  actions,
  onAction,
  testID,
}: (
  | {
      /** Spoken: the trigger has no visible words. */
      label: string;
      text?: undefined;
    }
  | {
      /** Visible words beside the icon, also spoken unless `label` says more. */
      text: string;
      label?: string;
    }
) & {
  icon?: IconName;
  actions: MenuAction[];
  onAction: (id: string) => void;
  testID?: string;
}) {
  const withText = text !== undefined;
  styles.useVariants({ withText });
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
      <View accessible accessibilityRole="button" accessibilityLabel={label ?? text} style={styles.menuTrigger}>
        <Icon name={icon} size={withText ? 'sm' : 'md'} fixed={!withText} />
        {withText ? (
          <Text step="subhead" weight={600} style={styles.menuText}>
            {text}
          </Text>
        ) : null}
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

const styles = StyleSheet.create((theme, rt) => ({
  toggle: {
    // At accessibility text sizes the switch goes under its text, as in iOS Settings.
    flexDirection: rt.fontScale >= theme.largeTextScale ? 'column' : 'row',
    alignItems: rt.fontScale >= theme.largeTextScale ? 'flex-start' : 'center',
    gap: theme.space[3],
    minHeight: theme.size.row,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  toggleText: {
    flexGrow: 1,
    flexShrink: 1,
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
    // Android's MenuView clips its child to the trigger's square bounds, so a shadow there shows as
    // a grey square behind the rounded button: the border alone carries it on Android.
    boxShadow: process.env.EXPO_OS === 'ios' ? theme.shadow.card : undefined,
    variants: {
      // With words it takes a secondary Button's `md` padding and gap (button.tsx).
      withText: {
        true: { flexDirection: 'row', gap: theme.space[2], paddingHorizontal: theme.space[4.5], alignSelf: 'flex-start' },
        false: {},
      },
    },
  },
  menuText: {
    flexShrink: 1,
    paddingVertical: theme.space[2],
  },
  date: {
    alignItems: process.env.EXPO_OS === 'ios' ? 'flex-start' : 'stretch',
  },
}));
