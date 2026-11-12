// iOS half of the native controls: SwiftUI through @expo/ui. Android's half
// is native-controls.tsx; both export the same names and props.
import { Host, type SwitchProps } from '@expo/ui';
import { MenuView } from '@expo/ui/community/menu';
import { DatePicker } from '@expo/ui/swift-ui';
import { accessibilityLabel, datePickerStyle, environment, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './icon';
import type { DateControlProps, SelectControlProps } from './native-controls.types';
import { Text } from './text';

/**
 * A field box showing the chosen option; a tap anywhere on it opens the
 * system menu, with a checkmark on the current option. Not SwiftUI's menu
 * Picker: that one opens only from its label and, at the largest text
 * sizes, draws its label past the box. Here the value is Seibi's text, so
 * it wraps like every other field.
 */
export function SelectControl<T extends string | number>({ label, value, onChange, options, testID }: SelectControlProps<T>) {
  const chosen = options.find((option) => option.value === value);
  return (
    <MenuView
      testID={testID}
      actions={options.map((option) => ({ id: String(option.value), title: option.label, state: option.value === value ? 'on' : 'off' }))}
      onPressAction={({ nativeEvent }) => {
        const next = options.find((option) => String(option.value) === nativeEvent.event);
        if (next) onChange(next.value);
      }}
    >
      <View accessible accessibilityRole="button" accessibilityLabel={chosen ? `${label}, ${chosen.label}` : label} style={styles.select}>
        <Text step="callout" style={styles.value}>
          {chosen?.label}
        </Text>
        <Icon name="expand" size="sm" tone="muted" />
      </View>
    </MenuView>
  );
}

/** The switch draws no label (the row's text is the label); VoiceOver still reads it. */
export function switchModifiers(label: string): NonNullable<SwitchProps['modifiers']> {
  return [labelsHidden(), accessibilityLabel(label)];
}

/**
 * SwiftUI's compact date picker: a pill with the date that opens the
 * calendar in a popover. Its title is hidden on screen (the Field shows the
 * label) and read by VoiceOver.
 */
export function DateControl({ label, value, onChange, minimumDate, maximumDate, testID }: DateControlProps) {
  const { theme } = useUnistyles();
  const { i18n } = useTranslation();
  return (
    <Host matchContents testID={testID}>
      <DatePicker
        title={label}
        selection={value}
        displayedComponents={['date']}
        range={minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined}
        onDateChange={onChange}
        modifiers={[
          datePickerStyle('compact'),
          labelsHidden(),
          tint(theme.colors.radiant),
          environment('locale', i18n.language),
        ]}
      />
    </Host>
  );
}

const styles = StyleSheet.create((theme) => ({
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.size.field,
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderWidth: theme.size.border.thin,
    borderColor: theme.colors.line,
  },
  value: {
    flex: 1,
    paddingVertical: theme.space[3],
  },
}));
