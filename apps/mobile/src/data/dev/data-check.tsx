import { Button, Host } from '@expo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import { useGarage } from '@/data/garage/use-garage';
import type { VehicleView } from '@/data/garage/types';
import { useAddReading } from '@/data/mileage/mutations';
import { useActiveVehicle } from '@/data/preferences/store';
import { useCreateVehicle } from '@/data/vehicle/mutations';
import type { VehicleInput } from '@/data/vehicle/rules';
import { formatDay, formatDistance, formatMonth, formatUsd, formatUsdRange, vehicleName } from '@/lib/format';
import type { PaintCode } from '@/lib/paint';

const TEST_PAINT: PaintCode = 'black';

/**
 * The test Vehicle the empty state creates: one whose Maintenance schedule
 * and Model render already exist on seibi-dev, so creating it spends no AI
 * lookup and no fal render.
 */
const TEST_VEHICLE: VehicleInput & { odometer: number } = {
  brand: 'Toyota',
  model: 'Yaris',
  year: 2015,
  plate: null,
  engine: null,
  trimLevel: null,
  color: TEST_PAINT,
  measure: 'km',
  odometer: 50000,
};

/**
 * Development builds only (the route requires this module behind
 * EXPO_PUBLIC_APP_VARIANT, so other bundles don't carry it). Proves the data
 * layer against seibi-dev before any real screen uses it: lists the
 * person's Vehicles from the garage query, saves a standalone Mileage reading
 * through the Mileage rules, and prints the formatters as Hermes renders
 * them. The screens of the port (S4–S11) replace it.
 */
export function DataCheckScreen() {
  const { t } = useTranslation();
  const garage = useGarage();
  const { active } = useActiveVehicle(garage.vehicles);

  return (
    <ScrollView
      testID="data-check"
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.note}>{t('dataCheck.subtitle')}</Text>

      <Text accessibilityRole="header" style={styles.heading}>
        {t('dataCheck.vehicles')}
      </Text>
      <Vehicles garage={garage} />

      {active ? <AddReading vehicle={active} /> : null}

      <Formats />
    </ScrollView>
  );
}

function Vehicles({ garage }: { garage: ReturnType<typeof useGarage> }) {
  const { t } = useTranslation();
  const createVehicle = useCreateVehicle();

  if (garage.isLoading) {
    return (
      <Text testID="data-check-loading" style={styles.note}>
        {t('dataCheck.loading')}
      </Text>
    );
  }
  if (garage.isError && garage.vehicles.length === 0) {
    return (
      <View style={styles.group}>
        <Text testID="data-check-error" accessibilityRole="alert" style={styles.error}>
          {errorMessage(garage.error, t)}
        </Text>
        <Host matchContents>
          <Button testID="data-check-retry" label={t('dataCheck.retry')} variant="outlined" onPress={garage.refetch} />
        </Host>
      </View>
    );
  }
  if (garage.vehicles.length === 0) {
    return (
      <View style={styles.group}>
        <Text testID="data-check-empty" style={styles.note}>
          {t('dataCheck.empty')}
        </Text>
        <Host matchContents>
          <Button
            testID="data-check-create-vehicle"
            label={createVehicle.isPending ? t('dataCheck.creating') : t('dataCheck.createVehicle')}
            variant="outlined"
            disabled={createVehicle.isPending}
            onPress={() => createVehicle.mutate(TEST_VEHICLE)}
          />
        </Host>
        {createVehicle.isError ? (
          <Text testID="data-check-create-error" accessibilityRole="alert" style={styles.error}>
            {errorMessage(createVehicle.error, t)}
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.group}>
      {garage.vehicles.map((vehicle, index) => (
        <View key={vehicle.id} testID={`data-check-vehicle-${index}`} style={styles.card}>
          <Text style={styles.title}>{t('dataCheck.vehicle', { name: vehicleName(vehicle), year: vehicle.year })}</Text>
          <Text testID={index === 0 ? 'data-check-odometer' : undefined} style={styles.value}>
            {vehicle.odometer != null
              ? t('dataCheck.odometer', { value: formatDistance(vehicle.odometer, vehicle.measure) })
              : t('dataCheck.noOdometer')}
          </Text>
          <Text style={styles.note}>{t('dataCheck.readingCount', { n: vehicle.readings.length })}</Text>
        </View>
      ))}
    </View>
  );
}

/** [+] → update Mileage, in its simplest form: today's reading, through the Mileage rules. */
function AddReading({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const addReading = useAddReading();
  const [draft, setDraft] = useState('');

  function save() {
    if (addReading.isPending) return;
    addReading.mutate(
      { vehicle, reading: draft.trim() === '' ? Number.NaN : Number(draft) },
      { onSuccess: () => setDraft('') },
    );
  }

  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('dataCheck.addReading')}
      </Text>
      <View style={styles.row}>
        <TextInput
          testID="data-check-reading-input"
          style={styles.input}
          value={draft}
          onChangeText={(text) => {
            setDraft(text.replace(/\D/g, ''));
            if (!addReading.isIdle) addReading.reset();
          }}
          placeholder={t('dataCheck.readingPlaceholder')}
          placeholderTextColor={theme.colors.subtle}
          accessibilityLabel={t('dataCheck.addReading')}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <Host matchContents>
          <Button
            testID="data-check-reading-save"
            label={addReading.isPending ? t('dataCheck.saving') : t('dataCheck.save')}
            variant="outlined"
            disabled={addReading.isPending}
            onPress={save}
          />
        </Host>
      </View>
      {addReading.isError ? (
        <Text testID="data-check-reading-error" accessibilityRole="alert" style={styles.error}>
          {errorMessage(addReading.error, t)}
        </Text>
      ) : null}
      {addReading.isSuccess ? (
        <Text testID="data-check-reading-saved" style={styles.value}>
          {t('dataCheck.saved', { value: formatDistance(addReading.data.reading, vehicle.measure) })}
        </Text>
      ) : null}
    </View>
  );
}

/** The formatters as this phone's JavaScript engine (Hermes) prints them; they must match the PWA's. */
function Formats() {
  const { t } = useTranslation();
  const rows = [
    { id: 'format-usd', label: t('dataCheck.usd'), value: formatUsd(1234) },
    { id: 'format-usd-negative', label: t('dataCheck.usd'), value: formatUsd(-40) },
    { id: 'format-usd-cents', label: t('dataCheck.usdCents'), value: formatUsd(1234.5, true) },
    { id: 'format-usd-range', label: t('dataCheck.usdRange'), value: formatUsdRange({ min: 80, max: 120 }) },
    { id: 'format-distance', label: t('dataCheck.distance'), value: formatDistance(30500, 'km') },
    { id: 'format-day', label: t('dataCheck.day'), value: formatDay('2025-01-03') },
    { id: 'format-month', label: t('dataCheck.month'), value: formatMonth('2026-11-12') },
  ];
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('dataCheck.formats')}
      </Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.formatRow}>
          <Text style={styles.note}>{row.label}</Text>
          <Text testID={row.id} style={styles.mono}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    gap: theme.space[4],
    padding: theme.space[5],
    paddingBottom: theme.space[16],
  },
  heading: {
    ...theme.type.headline,
    fontFamily: theme.fonts.sans[600],
    color: theme.colors.ink,
  },
  group: {
    gap: theme.space[2],
  },
  card: {
    gap: theme.space[1],
    padding: theme.space[4],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.card,
  },
  title: {
    ...theme.type.callout,
    fontFamily: theme.fonts.sans[600],
    color: theme.colors.ink,
  },
  value: {
    ...theme.type.body,
    fontFamily: theme.fonts.sans[500],
    color: theme.colors.ink,
  },
  note: {
    ...theme.type.footnote,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.muted,
  },
  error: {
    ...theme.type.footnote,
    fontFamily: theme.fonts.sans[500],
    color: theme.colors.overdueText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  input: {
    ...theme.type.callout,
    flex: 1,
    // 44 pt: the minimum touch target (docs/DESIGN.md → Accessibility).
    minHeight: theme.space[11],
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: theme.space[3],
  },
  formatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.space[3],
  },
  mono: {
    ...theme.type.footnote,
    fontFamily: theme.fonts.mono,
    color: theme.colors.ink,
  },
}));
