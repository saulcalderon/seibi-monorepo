import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { errorMessage, InputError } from '@/data/errors';
import type { RoutineRecord, VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useDeleteRoutine, useSaveRoutine } from '@/data/routine/mutations';
import { parseNumber } from '@/lib/number';
import { Button, IconButton } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { Field, TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { Text } from '@/ui/text';
import { confirm, notify } from '@/ui/toast';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

/** The PWA's name presets, in the order it shows them (es.json `vehicleDetail.routines.presets`). */
const PRESETS = ['work', 'university', 'school', 'groceries', 'gym'] as const;
const DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * The Routine sheet (`/routine?vehicleId=&routineId=`): a weekly round trip
 * that sharpens the usage estimate. Ported from the PWA's RoutineForm
 * (SmallForms.tsx): name with presets on create, distance in the Vehicle's
 * measure, 1–7 days; edit offers «Eliminar Rutina» after a native confirm.
 */
export function RoutineForm({ vehicleId, routineId }: { vehicleId?: string; routineId?: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const garage = useGarage();

  if (garage.isLoading) {
    return (
      <SheetMessage testID="routine-loading">
        <SkeletonGroup>
          <TextSkeleton step="title3" width="55%" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
        </SkeletonGroup>
      </SheetMessage>
    );
  }
  if (garage.isError) {
    return (
      <SheetMessage testID="routine-load-error">
        <ErrorState onRetry={garage.refetch} />
      </SheetMessage>
    );
  }

  const vehicle = garage.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    return (
      <SheetMessage testID="routine-missing" onClose={() => router.back()}>
        <EmptyState icon="vehicle" title={t('vehicleDetail.missing.title')} body={t('vehicleDetail.missing.body')} />
      </SheetMessage>
    );
  }
  const routine = routineId ? vehicle.routines.find((r) => r.id === routineId) : undefined;
  if (routineId && !routine) {
    // A stale link (the Routine was deleted elsewhere) says so instead of quietly opening «Agregar Rutina».
    return (
      <SheetMessage testID="routine-gone" onClose={() => router.back()}>
        <EmptyState icon="route" title={t('vehicleDetail.routines.formEdit')} body={t('vehicleDetail.routines.missing')} />
      </SheetMessage>
    );
  }
  return <RoutineBody vehicleId={vehicle.id} measure={vehicle.measure} routine={routine ?? null} />;
}

function RoutineBody({ vehicleId, measure, routine }: { vehicleId: string; measure: VehicleView['measure']; routine: RoutineRecord | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSaveRoutine();
  const remove = useDeleteRoutine();

  const [name, setName] = useState(routine?.name ?? '');
  const [distance, setDistance] = useState(routine ? String(routine.roundTripDistance) : '');
  const [days, setDays] = useState(routine?.daysPerWeek ?? 5);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);

  const dirty = routine ? name !== routine.name || distance !== String(routine.roundTripDistance) || days !== routine.daysPerWeek : name !== '' || distance !== '';
  const { leave } = useUnsavedGuard(dirty, {
    title: t('vehicleDetail.routines.discard.title'),
    message: t('vehicleDetail.routines.discard.body'),
    confirmLabel: t('vehicleDetail.routines.discard.confirm'),
    cancelLabel: t('vehicleDetail.routines.discard.cancel'),
  });

  const fieldError = (field: string) => (error?.field === field ? error.message : null);

  const submit = async () => {
    setError(null);
    try {
      const d = parseNumber(distance);
      if (d === null) throw new InputError('roundTripDistance', 'routine_distance_invalid');
      await save.mutateAsync({ id: routine?.id, vehicleId, name, roundTripDistance: d, daysPerWeek: days });
      notify.success(t('vehicleDetail.routines.saved'));
      leave();
    } catch (e) {
      setError({ field: e instanceof InputError ? e.field : 'form', message: errorMessage(e, t) });
    }
  };

  const deleteIt = async () => {
    if (!routine) return;
    const ok = await confirm({
      title: t('vehicleDetail.routines.delete'),
      message: t('vehicleDetail.routines.deleteAsk', { name: routine.name }),
      confirmLabel: t('vehicleDetail.routines.delete'),
      cancelLabel: t('vehicleDetail.routines.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(routine.id);
      notify.success(t('vehicleDetail.routines.deleted'));
      leave();
    } catch (e) {
      setError({ field: 'form', message: errorMessage(e, t) });
    }
  };

  return (
    <FormLayout
      testID="routine-sheet"
      footer={
        <>
          {error?.field === 'form' ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text testID="routine-error" step="subhead" weight={500} tone="overdue">
                {error.message}
              </Text>
            </View>
          ) : null}
          <Button testID="routine-save" block size="lg" label={t('vehicleDetail.routines.save')} loading={save.isPending} onPress={() => void submit()} />
          {routine ? (
            <Button testID="routine-delete" block variant="danger" label={t('vehicleDetail.routines.delete')} loading={remove.isPending} onPress={() => void deleteIt()} />
          ) : null}
        </>
      }
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text testID="routine-title" step="title3" family="display" heading>
            {t(routine ? 'vehicleDetail.routines.formEdit' : 'vehicleDetail.routines.formAdd')}
          </Text>
          <Text step="footnote" tone="muted">
            {t('vehicleDetail.routines.description')}
          </Text>
        </View>
        <IconButton testID="routine-close" icon="close" label={t('mileage.close')} onPress={() => router.back()} />
      </View>

      <TextField
        testID="routine-name"
        label={t('vehicleDetail.routines.name')}
        value={name}
        onChangeText={(v) => {
          setError(null);
          setName(v);
        }}
        placeholder={t('vehicleDetail.routines.namePlaceholder')}
        error={fieldError('name')}
      />
      {!routine ? (
        <View style={styles.presets} testID="routine-presets">
          {PRESETS.map((preset) => {
            const label = t(`vehicleDetail.routines.presets.${preset}`);
            return <Chip key={preset} testID={`routine-preset-${preset}`} label={label} onPress={() => setName(label)} />;
          })}
        </View>
      ) : null}
      <TextField
        testID="routine-distance"
        label={t('vehicleDetail.routines.distance')}
        keyboardType="decimal-pad"
        value={distance}
        onChangeText={(v) => {
          setError(null);
          setDistance(v);
        }}
        suffix={measure}
        hint={t('vehicleDetail.routines.distanceHint')}
        error={fieldError('roundTripDistance')}
      />
      <Field label={t('vehicleDetail.routines.days')} error={fieldError('daysPerWeek')} testID="routine-days">
        <View style={styles.days} accessibilityRole="radiogroup" accessibilityLabel={t('vehicleDetail.routines.days')}>
          {DAYS.map((d) => (
            <Chip
              key={d}
              testID={`routine-day-${d}`}
              label={String(d)}
              radio
              selected={days === d}
              onPress={() => setDays(d)}
            />
          ))}
        </View>
      </Field>
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
  titleWrap: {
    flex: 1,
    gap: theme.space[1.5],
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
    marginTop: -theme.space[2],
  },
  days: {
    flexDirection: 'row',
    gap: theme.space[1.5],
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.space[4],
    padding: theme.space[5],
    backgroundColor: theme.colors.bg,
  },
}));
