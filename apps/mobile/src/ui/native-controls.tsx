// Android half of the native controls: Jetpack Compose through @expo/ui.
// iOS's half is native-controls.ios.tsx; both export the same names and props.
import type { SwitchProps } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { DropdownMenu, DropdownMenuItem, Host, RNHostView, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatDate } from '@/lib/date';

import { Icon } from './icon';
import type { DateControlProps, SelectControlProps } from './native-controls.types';
import { Text } from './text';

/**
 * Seibi's field box with the chosen option and a chevron, as on iOS; a tap
 * anywhere on it opens Material's dropdown menu under it, with a check on
 * the current option. Not the universal `Picker`: on Android that is
 * Material's exposed dropdown, which draws its own tinted box at Material's
 * width (280 dp) with no chevron. The box is React Native inside the menu's
 * anchor: the host takes the field's width and grows with the text.
 */
export function SelectControl<T extends string | number>({ label, value, onChange, options, testID }: SelectControlProps<T>) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  const chosen = options.find((option) => option.value === value);
  return (
    <View testID={testID}>
      <Host matchContents={{ vertical: true }} seedColor={theme.colors.radiant}>
        <DropdownMenu
          expanded={open}
          onDismissRequest={() => setOpen(false)}
          // Unclipped, as in @expo/ui's MenuView: a clipped popup loses the status bar offset and
          // detaches from a field near the bottom of an edge-to-edge screen.
          properties={{ clippingEnabled: false }}
          modifiers={[fillMaxWidth()]}
        >
          <DropdownMenu.Trigger>
            <RNHostView matchContents={{ vertical: true }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={chosen ? `${label}, ${chosen.label}` : label}
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen(true)}
                style={({ pressed }) => [styles.control, pressed && styles.pressed]}
              >
                <Text step="callout" style={styles.value}>
                  {chosen?.label}
                </Text>
                <Icon name="expand" size="sm" tone="muted" />
              </Pressable>
            </RNHostView>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {options.map((option) => (
              <DropdownMenuItem
                key={String(option.value)}
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
              >
                <DropdownMenuItem.Text>
                  <ComposeText>{option.label}</ComposeText>
                </DropdownMenuItem.Text>
                {option.value === value ? (
                  <DropdownMenuItem.TrailingIcon>
                    {/* TalkBack says «seleccionado», not the glyph's name. */}
                    <ComposeText modifiers={[semantics({ contentDescription: t('field.selected') })]}>✓</ComposeText>
                  </DropdownMenuItem.TrailingIcon>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  );
}

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
