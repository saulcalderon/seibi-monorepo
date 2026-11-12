// iOS half of the native controls: SwiftUI through @expo/ui. Android's half
// is native-controls.tsx; both export the same names and props.
import { Host, type SwitchProps } from '@expo/ui';
import { DatePicker } from '@expo/ui/swift-ui';
import { accessibilityLabel, datePickerStyle, environment, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import type { DateControlProps } from './native-controls.types';

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
