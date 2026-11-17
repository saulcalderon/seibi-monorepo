import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, type IconName } from './icon';
import { PressScale, usePressed } from './press';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Pick<PressableProps, 'onPress' | 'testID' | 'accessibilityHint'> {
  /** The visible words. VoiceOver and TalkBack say them too, unless `accessibilityLabel` adds to them. */
  label: string;
  /** A spoken label that starts with the visible words and adds what they leave out. */
  accessibilityLabel?: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  trailingIcon?: IconName;
  /** Shows a spinner in place of the leading icon and ignores presses, keeping the label at full strength. */
  loading?: boolean;
  disabled?: boolean;
  /** Stretches to the container's width. */
  block?: boolean;
}

/** Each variant's text and icon colour. */
const TONE = { primary: 'onRadiant', secondary: 'ink', tonal: 'ink', ghost: 'ink', danger: 'overdue', inverse: 'onInverse' } as const;
/** The label's step for each size: 0.82, 0.92 and 1 rem in the PWA. */
const STEP = { sm: 'footnote', md: 'subhead', lg: 'callout' } as const;
const ICON = { sm: 'sm', md: 'sm', lg: 'md' } as const;

/**
 * The PWA's Button (`apps/app/src/ui/Button.tsx`). `sm` is 36 pt tall and
 * reaches the 44 pt target with `hitSlop`. Heights are minimums, so the
 * button grows with its text.
 */
export function Button({
  label,
  accessibilityLabel,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  block = false,
  onPress,
  testID,
  accessibilityHint,
}: ButtonProps) {
  const { theme } = useUnistyles();
  const { pressed, pressHandlers } = usePressed();
  const inactive = disabled || loading;
  // Only a disabled button fades: a busy one keeps its colours, so the spinner reads against the fill.
  styles.useVariants({ variant, size, pressed: pressed && !inactive, block, disabled });
  const tone = TONE[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={size === 'sm' ? (theme.size.target - theme.size.control.sm) / 2 : undefined}
      style={styles.pressable}
      {...pressHandlers}
    >
      <PressScale pressed={pressed && !inactive}>
        <View style={styles.button}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors[tone]} />
          ) : icon ? (
            <Icon name={icon} size={ICON[size]} tone={tone} />
          ) : null}
          <Text step={STEP[size]} weight={600} tone={tone} style={styles.label}>
            {label}
          </Text>
          {trailingIcon && !loading ? <Icon name={trailingIcon} size={ICON[size]} tone={tone} /> : null}
        </View>
      </PressScale>
    </Pressable>
  );
}

export interface IconButtonProps extends Pick<PressableProps, 'onPress' | 'testID' | 'accessibilityHint'> {
  icon: IconName;
  /** Required: the button has no visible words, so this is all VoiceOver and TalkBack say. */
  label: string;
  variant?: 'ghost' | 'secondary' | 'inverse';
  /** A circle instead of a rounded square: the carousel's arrows on Inicio. */
  round?: boolean;
  disabled?: boolean;
}

/** A 44 × 44 button with only an icon (the PWA's IconButton). */
export function IconButton({ icon, label, variant = 'ghost', round = false, disabled = false, onPress, testID, accessibilityHint }: IconButtonProps) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ iconVariant: variant, round, pressed: pressed && !disabled, disabled });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...pressHandlers}
    >
      <PressScale pressed={pressed && !disabled}>
        <View style={styles.iconButton}>
          <Icon name={icon} size="md" tone={variant === 'inverse' ? 'onInverse' : 'ink'} fixed />
        </View>
      </PressScale>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  pressable: {
    variants: {
      block: { true: { alignSelf: 'stretch' }, false: { alignSelf: 'flex-start' } },
    },
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    variants: {
      size: {
        sm: { minHeight: theme.size.control.sm, paddingHorizontal: theme.space[3.5], gap: theme.space[1.5], borderRadius: theme.radius.lg },
        md: { minHeight: theme.size.control.md, paddingHorizontal: theme.space[4.5], gap: theme.space[2], borderRadius: theme.radius.xl },
        lg: { minHeight: theme.size.control.lg, paddingHorizontal: theme.space[6], gap: theme.space[2.5], borderRadius: theme.radius.xl },
      },
      variant: {
        primary: { backgroundColor: theme.colors.radiantStrong, boxShadow: theme.shadow.primary },
        secondary: { backgroundColor: theme.colors.surface, borderWidth: theme.size.border.thin, borderColor: theme.colors.line },
        // A filled control with no border: Inicio's «Actualizar» (`--g-control`, which is `surface3` on Garage and night).
        tonal: { backgroundColor: theme.colors.surface3 },
        // No fill until pressed. On Android a rounded view with no fill is flattened away and its pressed
        // fill drawn square; `overflow: 'hidden'` keeps it a real view (docs/DESIGN.md → Corners on Android).
        ghost: { overflow: 'hidden' },
        danger: { backgroundColor: theme.colors.overdueSoft },
        inverse: { backgroundColor: theme.colors.inverse },
      },
      pressed: { true: {}, false: {} },
      disabled: { true: { opacity: theme.opacity.disabled }, false: {} },
    },
    compoundVariants: [
      { variant: 'primary', pressed: true, styles: { backgroundColor: theme.colors.radiantPressed } },
      { variant: 'secondary', pressed: true, styles: { backgroundColor: theme.colors.surface2 } },
      { variant: 'tonal', pressed: true, styles: { backgroundColor: theme.garage.controlPressed } },
      { variant: 'ghost', pressed: true, styles: { backgroundColor: theme.colors.surface3 } },
      { variant: 'danger', pressed: true, styles: { opacity: theme.opacity.pressed } },
      { variant: 'inverse', pressed: true, styles: { opacity: theme.opacity.pressed } },
    ],
  },
  label: {
    // Long labels wrap and centre instead of overflowing the button.
    flexShrink: 1,
    textAlign: 'center',
    paddingVertical: theme.space[2],
  },
  iconButton: {
    minWidth: theme.size.target,
    minHeight: theme.size.target,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    variants: {
      iconVariant: {
        // As the ghost Button: clipping keeps the pressed fill rounded on Android.
        ghost: { overflow: 'hidden' },
        secondary: {
          backgroundColor: theme.colors.surface,
          borderWidth: theme.size.border.thin,
          borderColor: theme.colors.line,
          boxShadow: theme.shadow.card,
        },
        inverse: { backgroundColor: theme.colors.inverse },
      },
      round: { true: { borderRadius: theme.radius.pill }, false: {} },
      pressed: { true: {}, false: {} },
      disabled: { true: { opacity: theme.opacity.disabled }, false: {} },
    },
    compoundVariants: [
      { iconVariant: 'ghost', pressed: true, styles: { backgroundColor: theme.colors.surface3 } },
      { iconVariant: 'secondary', pressed: true, styles: { backgroundColor: theme.colors.surface2 } },
      { iconVariant: 'inverse', pressed: true, styles: { opacity: theme.opacity.pressed } },
    ],
  },
}));
