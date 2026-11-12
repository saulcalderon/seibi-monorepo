// Android half of the native controls: Jetpack Compose through @expo/ui.
// iOS's half is native-controls.ios.tsx; both export the same names and props.
import type { SwitchProps } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatDate } from '@/lib/date';

import { Icon } from './icon';
import type { DateControlProps } from './native-controls.types';
import { Text } from './text';

/** The switch draws no label (the row's text is the label); TalkBack still reads it. */
export function switchModifiers(label: string): NonNullable<SwitchProps['modifiers']> {
  return [semantics({ contentDescription: label })];
}

/**
 * The date as a field; a tap opens Material's date picker dialog, which is
 * mounted only while it is open (it opens on mount and calls back once).
 */
export function DateControl({ label, value, onChange, minimumDate, maximumDate, testID }: DateControlProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  const shown = formatDate(value);
  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <Text step="callout" style={styles.value}>
          {shown}
        </Text>
        <Icon name="calendar" size="md" tone="muted" />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode="date"
          presentation="dialog"
          accentColor={theme.colors.radiant}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          positiveButton={{ label: t('dateField.confirm') }}
          negativeButton={{ label: t('dateField.cancel') }}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  control: {
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
  pressed: {
    backgroundColor: theme.colors.surface2,
  },
  value: {
    flex: 1,
    paddingVertical: theme.space[3],
  },
}));
