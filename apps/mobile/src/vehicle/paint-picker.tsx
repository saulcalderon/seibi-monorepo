import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { LIGHT_PAINTS, PAINT_CODES, type PaintCode } from '@/lib/paint';
import { Field } from '@/ui/fields';
import { Icon } from '@/ui/icon';
import { PressScale, usePressed } from '@/ui/press';

/**
 * The Vehicle's paint: the PWA's 13 swatches, one of a group (a tap on the
 * chosen one clears it, so the paint stays optional). Each swatch says its
 * name; the chosen one has a ring and a check, so colour is never the only
 * signal.
 */
export function PaintPicker({ value, onChange, testID }: { value: PaintCode | null; onChange: (value: PaintCode | null) => void; testID?: string }) {
  const { t } = useTranslation();
  return (
    <Field label={t('vehicleForm.color')} optional>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('vehicleForm.color')} style={styles.grid} testID={testID}>
        {PAINT_CODES.map((code) => (
          <Swatch
            key={code}
            code={code}
            label={t(`paint.${code}`)}
            selected={value === code}
            onPress={() => onChange(value === code ? null : code)}
            testID={testID ? `${testID}-${code}` : undefined}
          />
        ))}
      </View>
    </Field>
  );
}

function Swatch({ code, label, selected, onPress, testID }: { code: PaintCode; label: string; selected: boolean; onPress: () => void; testID?: string }) {
  const { theme } = useUnistyles();
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ selected });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      hitSlop={(theme.size.target - theme.size.swatch) / 2}
      {...pressHandlers}
    >
      <PressScale pressed={pressed}>
        {/* The ring is always drawn (transparent when not chosen), so choosing never moves the grid. */}
        <View style={styles.ring}>
          <View style={[styles.swatch, { backgroundColor: theme.art.paint[code] }]}>
            {selected ? (
              <Icon name="check" size="sm" color={LIGHT_PAINTS.includes(code) ? theme.art.paintCheckOnLight : theme.art.paintCheckOnDark} fixed />
            ) : null}
          </View>
        </View>
      </PressScale>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
  ring: {
    padding: theme.size.border.focus,
    borderRadius: theme.radius.pill,
    borderWidth: theme.size.border.focus,
    variants: {
      selected: {
        true: { borderColor: theme.colors.radiant },
        false: { borderColor: theme.colors.bg },
      },
    },
  },
  swatch: {
    width: theme.size.swatch,
    height: theme.size.swatch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: theme.size.border.thin,
    borderColor: theme.art.paintRing,
  },
}));
