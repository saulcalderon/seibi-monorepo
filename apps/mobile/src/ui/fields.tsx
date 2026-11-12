import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatInteger, parseWholeNumber } from '@/lib/number';

import { Text } from './text';

export interface FieldShellProps {
  label: string;
  /** Help under the field. An error replaces it. */
  hint?: string;
  error?: string | null;
  optional?: boolean;
  testID?: string;
}

/**
 * The label, hint and error around a control: the PWA's Field. The error is
 * text (never only a red border) and is read out when it appears.
 */
export function Field({ label, hint, error, optional, children, testID }: FieldShellProps & { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.field} testID={testID}>
      <Text step="footnote" weight={600} tone="muted" style={styles.label}>
        {label}
        {optional ? (
          <Text step="footnote" tone="subtle">
            {t('field.optionalSuffix')}
          </Text>
        ) : null}
      </Text>
      {children}
      {error ? (
        <Text step="footnote" weight={500} tone="overdue" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.label}>
          {error}
        </Text>
      ) : hint ? (
        <Text step="footnote" tone="subtle" style={styles.label}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** What VoiceOver and TalkBack say for a field: its label, «opcional», and the error first if there is one. */
function useFieldSpeech({ label, optional, error, hint }: FieldShellProps) {
  const { t } = useTranslation();
  return {
    accessibilityLabel: [label, optional ? t('field.optional') : null, error].filter(Boolean).join(', '),
    accessibilityHint: error ? undefined : hint,
  };
}

export interface TextFieldProps extends FieldShellProps, Omit<TextInputProps, 'style' | 'placeholderTextColor' | 'testID'> {
  /** A unit shown inside the field, on the right («km»). */
  suffix?: string;
  /** Geist Mono with tabular figures, for numbers. */
  mono?: boolean;
  /** The input itself, to move focus to it (Return on the field before). */
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/** A single-line text input: the PWA's TextField. */
export function TextField({ label, hint, error, optional, suffix, mono = false, testID, multiline, onFocus, onBlur, ...input }: TextFieldProps) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const speech = useFieldSpeech({ label, hint, error, optional });
  styles.useVariants({ focused, invalid: Boolean(error), multiline: Boolean(multiline), mono });
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <View style={styles.control}>
        <TextInput
          testID={testID}
          {...speech}
          placeholderTextColor={theme.colors.subtle}
          selectionColor={theme.colors.radiant}
          cursorColor={theme.colors.radiant}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...input}
          style={styles.input}
        />
        {suffix ? (
          <Text step="subhead" weight={600} tone="muted" importantForAccessibility="no" accessibilityElementsHidden>
            {suffix}
          </Text>
        ) : null}
      </View>
    </Field>
  );
}

/** A multi-line input, three lines tall to start, growing with its text. */
export function TextAreaField(props: Omit<TextFieldProps, 'multiline' | 'suffix'>) {
  return <TextField {...props} multiline />;
}

export interface NumberFieldProps extends Omit<TextFieldProps, 'keyboardType' | 'inputMode' | 'mono'> {
  /** `decimal` allows cents (costs); `integer` whole numbers only. */
  kind?: 'integer' | 'decimal';
}

/** A number typed on the phone's keypad, in Geist Mono. Parse its text with `parseNumber`. */
export function NumberField({ kind = 'integer', ...props }: NumberFieldProps) {
  return <TextField {...props} mono keyboardType={kind === 'decimal' ? 'decimal-pad' : 'number-pad'} inputMode={kind === 'decimal' ? 'decimal' : 'numeric'} />;
}

export interface MileageFieldProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'onChangeText' | 'suffix' | 'mono' | 'keyboardType'> {
  value: number | null;
  onChange: (value: number | null) => void;
  /** The Vehicle's odometer measure: every reading uses it. */
  measure: OdometerMeasure;
}

/**
 * Kilometraje: a whole number grouped as it is typed («45,000»), with the
 * Vehicle's measure inside the field. Only digits get through.
 */
export function MileageField({ value, onChange, measure, ...props }: MileageFieldProps) {
  const { t } = useTranslation();
  return (
    <TextField
      {...props}
      mono
      keyboardType="number-pad"
      inputMode="numeric"
      autoComplete="off"
      value={value === null ? '' : formatInteger(value)}
      onChangeText={(text) => onChange(parseWholeNumber(text))}
      suffix={t(`units.${measure}`)}
    />
  );
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** The group's name, said before the options. */
  label: string;
  testID?: string;
}

/** Two to four exclusive choices side by side (the PWA's Segmented, «Tema»). */
export function Segmented<T extends string>({ value, onChange, options, label, testID }: SegmentedProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track} testID={testID}>
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          testID={testID ? `${testID}-${option.value}` : undefined}
        />
      ))}
    </View>
  );
}

function Segment({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  styles.useVariants({ selected });
  return (
    <Pressable testID={testID} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} onPress={onPress} style={styles.segment}>
      <Text step="subhead" weight={600} tone={selected ? 'ink' : 'muted'} align="center">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  field: {
    gap: theme.space[1.5],
  },
  label: {
    paddingHorizontal: theme.space[1],
  },
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
    // The PWA's focus ring: an outline, so focusing never moves the layout.
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: theme.colors.radiant,
    variants: {
      focused: { true: { outlineWidth: theme.size.border.focus }, false: {} },
      invalid: { true: { borderColor: theme.colors.overdue }, false: {} },
    },
  },
  input: {
    flex: 1,
    ...theme.type.callout,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.ink,
    paddingVertical: theme.space[3],
    variants: {
      mono: { true: { fontFamily: theme.fonts.mono, fontVariant: ['tabular-nums'] }, false: {} },
      // Three lines of text plus the padding, to start.
      multiline: { true: { minHeight: theme.type.callout.lineHeight * 3 + theme.space[3] * 2 }, false: {} },
    },
  },
  track: {
    flexDirection: 'row',
    padding: theme.space[1],
    gap: theme.space[1],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface3,
  },
  segment: {
    flex: 1,
    minHeight: theme.size.target,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous',
    variants: {
      selected: { true: { backgroundColor: theme.colors.surface, boxShadow: theme.shadow.card }, false: {} },
    },
  },
}));
