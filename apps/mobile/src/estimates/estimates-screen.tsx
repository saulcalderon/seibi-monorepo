import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { byUrgency } from '@/data/garage/derive';
import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { errorMessage } from '@/data/errors';
import { useActiveVehicle } from '@/data/preferences/store';
import { COUNTRIES, countryName, type Country } from '@/data/profile/countries';
import { useProfile, useUpdateProfile } from '@/data/profile/queries';
import { formatDistance, vehicleChoiceLabel } from '@/lib/format';
import { canContinueCity, CITY_MAX } from '@/onboarding/flow';
import { TabScroll } from '@/shell/tab-scroll';
import { Button } from '@/ui/button';
import { Card, IconTile, ListRow, RowDivider } from '@/ui/card';
import { SelectField } from '@/ui/controls';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';
import { TextField } from '@/ui/fields';
import { Icon } from '@/ui/icon';
import { usePressed } from '@/ui/press';
import { Text } from '@/ui/text';
import { VehicleThumb } from '@/vehicle/fleet-card';

import { EstimatePanel } from './estimate-panel';

/**
 * Estimados (S10, SEI-65), the PWA's screens/Estimados.tsx as of 6e3b818
 * without its chat: price ranges for a job on one Vehicle, in the person's
 * city. The Vehicle is the one Inicio shows unless a link names another
 * (`?vehicle=`); `?task=` asks for that task's Estimate on arrival, as the
 * Reminder detail's «¿Cuánto cuesta?» does.
 */
export function EstimatesScreen() {
  const { vehicle, task } = useLocalSearchParams<{ vehicle?: string; task?: string }>();
  // A new link starts over, as the PWA's route did by keying the screen on its search.
  return <Estimados key={`${vehicle ?? ''}:${task ?? ''}`} vehicleParam={vehicle} taskParam={task} />;
}

function Estimados({ vehicleParam, taskParam }: { vehicleParam?: string; taskParam?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const { active, select } = useActiveVehicle(garage.vehicles);
  const [vehicleId, setVehicleId] = useState<string | null>(vehicleParam ?? null);
  // The link's task is asked for once: switching Vehicles remounts the panel, and must not ask (and spend an AI call) again.
  const [linkTask, setLinkTask] = useState(taskParam);
  const vehicle = garage.vehicles.find((v) => v.id === (vehicleId ?? active?.id)) ?? null;

  if (garage.isLoading) {
    return (
      <TabScroll testID="estimates-screen">
        <SkeletonGroup testID="estimates-loading">
          <Card>
            <ListRowSkeleton />
            <RowDivider />
            <ListRowSkeleton />
          </Card>
        </SkeletonGroup>
      </TabScroll>
    );
  }
  if (garage.isError) {
    return (
      <TabScroll testID="estimates-screen">
        <ErrorState testID="estimates-error" onRetry={garage.refetch} />
      </TabScroll>
    );
  }
  if (!vehicle) {
    return (
      <TabScroll testID="estimates-screen">
        <Card>
          <EmptyState
            testID="estimates-empty"
            icon="vehicle"
            title={t('estimates.empty.title')}
            body={t('estimates.empty.body')}
            action={<Button testID="estimates-add-vehicle" icon="add" label={t('estimates.empty.action')} onPress={() => router.push('/vehicle/new')} />}
          />
        </Card>
      </TabScroll>
    );
  }

  return (
    <TabScroll testID="estimates-screen" keyboardShouldPersistTaps="handled">
      <Text step="subhead" tone="muted" style={styles.subtitle}>
        {t('estimates.subtitle')}
      </Text>
      <VehicleSwitcher
        key={`switch-${vehicle.id}`}
        vehicle={vehicle}
        vehicles={garage.vehicles}
        onSelect={(id) => {
          setVehicleId(id);
          select(id);
        }}
      />
      {/* SEI-69 (Chat de Seibi) mounts its mode switch here and swaps the panel for the chat. */}
      <LocationGate>
        <EstimatePanel key={vehicle.id} vehicle={vehicle} initialTask={linkTask} onInitialTaskAsked={() => setLinkTask(undefined)} />
      </LocationGate>
    </TabScroll>
  );
}

/** Year, Plate if any, and the odometer: tells twins of the same model and year apart. */
function vehicleMeta(v: VehicleView, none: string) {
  const distance = v.odometer != null ? formatDistance(v.odometer, v.measure) : none;
  return [String(v.year), v.plate, distance].filter(Boolean).join(' · ');
}

/**
 * The Vehicle being priced and how it is doing; with more than one Vehicle a
 * tap unfolds the others, most urgent first, to switch to (and Inicio with it).
 */
function VehicleSwitcher({ vehicle, vehicles, onSelect }: { vehicle: VehicleView; vehicles: VehicleView[]; onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { pressed, pressHandlers } = usePressed();
  const others = vehicles.filter((v) => v.id !== vehicle.id).sort(byUrgency);
  const canSwitch = others.length > 0;
  styles.useVariants({ pressed: pressed && canSwitch });
  const status = (v: VehicleView) => (v.pending > 0 ? t('estimates.vehicle.pending', { count: v.pending }) : t('estimates.vehicle.ok'));
  const name = vehicleChoiceLabel(vehicle, vehicles, t);
  const line = t('estimates.vehicle.line', { name, status: status(vehicle) });
  return (
    <Card testID="estimates-vehicle">
      <Pressable
        testID="estimates-vehicle-toggle"
        accessibilityRole={canSwitch ? 'button' : undefined}
        accessibilityLabel={line}
        accessibilityHint={canSwitch ? (open ? t('estimates.vehicle.hide') : t('estimates.vehicle.show')) : undefined}
        accessibilityState={canSwitch ? { expanded: open } : undefined}
        disabled={!canSwitch}
        onPress={() => setOpen((o) => !o)}
        style={styles.switcher}
        {...pressHandlers}
      >
        <View style={styles.dot} />
        <Text testID="estimates-vehicle-name" step="footnote" tone="muted" numberOfLines={1} style={styles.grow}>
          <Text step="footnote" weight={600}>
            {name}
          </Text>
          {t('estimates.vehicle.statusAfter', { status: status(vehicle) })}
        </Text>
        {canSwitch ? <Icon name={open ? 'expand' : 'forward'} size="sm" tone="subtle" /> : null}
      </Pressable>
      {open
        ? others.map((v, i) => {
            const label = vehicleChoiceLabel(v, vehicles, t);
            const detail = vehicleMeta(v, t('estimates.vehicle.noMileage'));
            return (
              <Fragment key={v.id}>
                <RowDivider />
                <ListRow
                  testID={`estimates-vehicle-${i}`}
                  leading={<VehicleThumb vehicle={v} />}
                  title={label}
                  subtitle={detail}
                  trailing={
                    <Text step="caption" weight={600}>
                      {status(v)}
                    </Text>
                  }
                  chevron={false}
                  accessibilityLabel={t('estimates.vehicle.row', { name: label, detail, status: status(v) })}
                  onPress={() => {
                    setOpen(false);
                    onSelect(v.id);
                  }}
                />
              </Fragment>
            );
          })
        : null}
    </Card>
  );
}

/** Estimates need a country and city: asks right here when the profile has none, as the PWA. */
function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [country, setCountry] = useState<Country>('SV');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (profile.isLoading) return null;
  // Without the profile the form could save over a location the person already has.
  if (profile.isError) return <ErrorState testID="estimates-profile-error" onRetry={() => void profile.refetch()} />;
  if (profile.data?.country) return children;

  const save = () => {
    if (!canContinueCity(city) || update.isPending) return;
    setError(null);
    update.mutate({ country, city }, { onError: (cause) => setError(errorMessage(cause, t)) });
  };

  return (
    <Card testID="estimates-location" style={styles.location}>
      <View style={styles.locationHead}>
        <IconTile icon="location" />
        <View style={styles.grow}>
          <Text step="callout" weight={700} heading>
            {t('estimates.location.title')}
          </Text>
          <Text step="footnote" tone="muted">
            {t('estimates.location.body')}
          </Text>
        </View>
      </View>
      <SelectField
        testID="estimates-location-country"
        label={t('estimates.location.country')}
        value={country}
        onChange={setCountry}
        options={COUNTRIES.map((c) => ({ value: c.id, label: t('estimates.location.countryOption', { flag: c.flag, name: countryName(c.id, t) }) }))}
      />
      <TextField
        testID="estimates-location-city"
        label={t('estimates.location.city')}
        placeholder={t('estimates.location.cityPlaceholder')}
        value={city}
        onChangeText={(text) => {
          setCity(text);
          setError(null);
        }}
        error={error}
        autoCapitalize="words"
        maxLength={CITY_MAX}
        textContentType="addressCity"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <Button
        testID="estimates-location-save"
        variant="secondary"
        block
        loading={update.isPending}
        disabled={!canContinueCity(city)}
        label={t('estimates.location.save')}
        onPress={save}
      />
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  subtitle: {
    paddingHorizontal: theme.space[1],
  },
  grow: {
    flex: 1,
    minWidth: 0,
    gap: theme.space[0.5],
  },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2.5],
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[3.5],
    paddingVertical: theme.space[2.5],
    borderRadius: theme.radius['3xl'],
    borderCurve: 'continuous',
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  dot: {
    width: theme.size.dot,
    height: theme.size.dot,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.subtle,
  },
  location: {
    gap: theme.space[4],
    padding: theme.space[5],
  },
  locationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
  },
}));
