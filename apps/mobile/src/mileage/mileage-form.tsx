import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { errorMessage, InputError } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useAddReading } from '@/data/mileage/mutations';
import { useActiveVehicle } from '@/data/preferences/store';
import { formatDistance, formatNumber, vehicleName } from '@/lib/format';
import { Button, IconButton } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { SelectField } from '@/ui/controls';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { MileageField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

import { bumpedReading, MILEAGE_BUMPS, mileageContext, mileageDigits } from './mileage-logic';

export interface MileageFormProps {
  /** The Vehicle to update (Inicio's «Actualizar»); else the active one. */
  vehicleId?: string;
}

/**
 * Update Mileage (S8), the content of the `update-mileage` form sheet: today's
 * odometer, strictly above the current one, with the «+100 · +500 · +1,000»
 * chips. Ported from the PWA's MileageForm (SmallForms.tsx). Closing with a
 * number typed asks first.
 */
export function MileageForm({ vehicleId }: MileageFormProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const garage = useGarage();
  const { active } = useActiveVehicle(garage.vehicles);

  if (garage.isLoading) {
    return (
      <SheetMessage testID="mileage-loading">
        <SkeletonGroup>
          <TextSkeleton step="title3" width="55%" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
        </SkeletonGroup>
      </SheetMessage>
    );
  }
  if (garage.isError) {
    return (
      <SheetMessage testID="mileage-load-error">
        <ErrorState onRetry={garage.refetch} />
      </SheetMessage>
    );
  }

  const vehicle = garage.vehicles.find((v) => v.id === vehicleId) ?? active;
  if (!vehicle) {
    return (
      <SheetMessage testID="mileage-no-vehicles" onClose={() => router.back()}>
        <EmptyState
          icon="vehicle"
          title={t('forms.noVehicles.title')}
          body={t('forms.noVehicles.body')}
          action={
            <Button
              testID="forms-add-vehicle"
              variant="secondary"
              label={t('home.empty.add')}
              onPress={() => router.replace('/vehicle/new')}
            />
          }
        />
      </SheetMessage>
    );
  }
  return <MileageFormBody vehicles={garage.vehicles} vehicle={vehicle} />;
}

type FormError = { field: string; message: string };

function MileageFormBody({ vehicles, vehicle: startVehicle }: { vehicles: VehicleView[]; vehicle: VehicleView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const add = useAddReading();

  const [vehicleId, setVehicleId] = useState(startVehicle.id);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<FormError | null>(null);
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? startVehicle;
  /** Focused after the sheet settles: `autoFocus` races the formSheet's presentation on iOS. */
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    const focus = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(focus);
  }, []);
  const reading = digits ? Number(digits) : null;

  const change = (next: string) => {
    setError(null);
    setDigits(mileageDigits(next));
  };

  // Unsaved changes are never lost to a swipe, Back or «Cerrar» without asking.
  const { leave } = useUnsavedGuard(digits !== '', {
    title: t('mileage.discard.title'),
    message: t('mileage.discard.body'),
    confirmLabel: t('mileage.discard.confirm'),
    cancelLabel: t('mileage.discard.cancel'),
  });

  const show = (e: unknown) => {
    setError({ field: e instanceof InputError ? e.field : 'form', message: errorMessage(e, t) });
  };

  const submit = async () => {
    setError(null);
    try {
      if (reading === null) throw new InputError('reading', 'reading_required');
      await add.mutateAsync({ vehicle, reading });
      notify.success(t('mileage.saved'));
      leave();
    } catch (e) {
      show(e);
    }
  };

  const fieldError = error?.field === 'reading' ? error.message : null;

  return (
    <FormLayout
      testID="mileage-sheet"
      footer={
        <>
          {error?.field === 'form' ? (
            <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text testID="mileage-form-error" step="subhead" weight={500} tone="overdue">
                {error.message}
              </Text>
            </View>
          ) : null}
          <Button
            testID="mileage-save"
            block
            size="lg"
            label={reading === null ? t('mileage.save') : t('mileage.saveReading', { reading: formatDistance(reading, vehicle.measure) })}
            loading={add.isPending}
            disabled={reading === null}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <View style={styles.header}>
        <Text testID="mileage-title" step="title3" family="display" heading style={styles.title}>
          {t('mileage.title')}
        </Text>
        <IconButton testID="mileage-close" icon="close" label={t('mileage.close')} onPress={() => router.back()} />
      </View>

      <Text testID="mileage-context" step="footnote" family="mono" tone="muted">
        {mileageContext(vehicle, t)}
      </Text>

      {vehicles.length > 1 ? (
        <SelectField
          testID="mileage-vehicle"
          label={t('mileage.vehicle')}
          value={vehicleId}
          onChange={(id) => {
            setError(null);
            setVehicleId(id);
          }}
          options={vehicles.map((v) => ({ value: v.id, label: `${vehicleName(v)} ${v.year}` }))}
        />
      ) : null}

      <MileageField
        testID="mileage-reading"
        label={t('mileage.reading')}
        value={reading}
        onChange={(n) => change(n === null ? '' : String(n))}
        measure={vehicle.measure}
        placeholder={formatNumber(vehicle.odometer ?? 0)}
        error={fieldError}
        errorTestID="mileage-error"
        ref={input}
      />

      <View style={styles.bumps}>
        {MILEAGE_BUMPS.map((n) => (
          <Chip
            key={n}
            testID={`mileage-bump-${n}`}
            label={`+${formatNumber(n)}`}
            onPress={() => {
              setError(null);
              setDigits(mileageDigits(String(bumpedReading(reading, vehicle.odometer, n))));
            }}
          />
        ))}
      </View>

      <Text step="subhead" tone="muted" style={styles.recalc}>
        {t('mileage.recalc')}
      </Text>
    </FormLayout>
  );
}

/** A loading, missing or error state in the sheet, with a way to close it. */
function SheetMessage({ children, onClose, testID }: { children: ReactNode; onClose?: () => void; testID: string }) {
  const { t } = useTranslation();
  return (
    <View testID={testID} style={styles.message}>
      {children}
      {onClose ? <Button testID={`${testID}-close`} variant="secondary" block label={t('mileage.close')} onPress={onClose} /> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
    paddingTop: theme.space[4],
  },
  title: {
    flex: 1,
  },
  bumps: {
    flexDirection: 'row',
    gap: theme.space[2],
    marginTop: theme.space[3],
  },
  recalc: {
    marginTop: theme.space[4],
  },
  formError: {
    marginBottom: theme.space[2],
  },
  message: {
    padding: theme.space[5],
    gap: theme.space[4],
  },
}));
