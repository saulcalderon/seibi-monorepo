import { useNavigation, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { errorMessage, InputError } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { defaultMeasure } from '@/data/profile/countries';
import { useProfile } from '@/data/profile/queries';
import { useCreateVehicle, useUpdateVehicle } from '@/data/vehicle/mutations';
import { sanitizePlate } from '@/data/vehicle/rules';
import { Button } from '@/ui/button';
import { Field, MileageField, Segmented, TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { PickerField } from '@/ui/picker';
import { Text } from '@/ui/text';
import { confirm, notify } from '@/ui/toast';

import { draftChanged, draftFrom, emptyDraft, FREE_TEXT_MAX, parseDraft, type VehicleDraft } from './form-schema';
import { PaintPicker } from './paint-picker';
import { awaitPick, type PickKind } from './picker-channel';
import { useWithdrawWithConfirm } from './use-withdraw';

export interface VehicleFormProps {
  /** The Vehicle to edit, or `null` to add one. */
  vehicle: VehicleView | null;
  /** After a save, with the Vehicle's id: close the form, or move on (S3's first run). */
  onSaved: (vehicleId: string) => void;
  /** Editing only: offers «Retirar de mi flota», and is called once the Vehicle is withdrawn. */
  onWithdrawn?: () => void;
  /** The save button's words; «Agregar Vehículo» or «Guardar cambios» by default. */
  submitLabel?: string;
  testID?: string;
}

/**
 * Adding or editing a Vehicle (the PWA's VehicleForm): make, year and model
 * from NHTSA vPIC (typed by hand when vPIC doesn't have them), engine, trim,
 * paint, Plate, the odometer measure and, when adding, today's Mileage.
 *
 * It is a whole screen's content: a `FormLayout`, whose save button rides
 * above the keyboard. Mi flota opens it at `/vehicle/new` and
 * `/vehicle/<id>/edit`; S3's first run can show it in its own screen. The
 * make, year and model fields push `/vehicle/pick`, which hands the choice
 * back. Leaving with unsaved input asks first.
 */
export function VehicleForm({ vehicle, onSaved, onWithdrawn, submitLabel, testID = 'vehicle-form' }: VehicleFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const profile = useProfile();
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const withdraw = useWithdrawWithConfirm();
  const mileageRef = useRef<ComponentRef<typeof TextInput>>(null);

  // A new Vehicle starts in the measure of the person's country (the profile is already
  // loaded: the header's avatar reads it on the first screen).
  const [start] = useState<VehicleDraft>(() => (vehicle ? draftFrom(vehicle) : emptyDraft(defaultMeasure(profile.data?.country))));
  const [draft, setDraft] = useState<VehicleDraft>(start);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  /** Set once the form is done (saved or withdrawn), so leaving no longer asks. */
  const [left, setLeft] = useState<{ saved: string } | { withdrawn: true } | null>(null);

  const dirty = draftChanged(start, draft);
  usePreventRemove(dirty && left === null, ({ data }) => {
    void confirm({
      title: t('vehicleForm.discard.title'),
      message: t('vehicleForm.discard.message'),
      confirmLabel: t('vehicleForm.discard.confirm'),
      cancelLabel: t('vehicleForm.discard.keep'),
      destructive: true,
    }).then((discard) => {
      if (discard) navigation.dispatch(data.action);
    });
  });

  // Leave only once the prevent-remove guard above has seen `left`.
  useEffect(() => {
    if (left === null) return;
    if ('saved' in left) onSaved(left.saved);
    else onWithdrawn?.();
  }, [left, onSaved, onWithdrawn]);

  const change = (patch: Partial<VehicleDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };
  const fieldError = (field: string) => (error?.field === field ? error.message : null);

  const pick = (kind: PickKind) => {
    awaitPick(kind, (value) => change(kind === 'year' ? { year: Number(value) } : { [kind]: value }));
    router.push({
      pathname: '/vehicle/pick',
      params: {
        kind,
        value: kind === 'year' ? (draft.year?.toString() ?? '') : draft[kind],
        brand: draft.brand,
        year: draft.year?.toString() ?? '',
      },
    });
  };

  const busy = create.isPending || update.isPending;
  const save = async () => {
    if (busy) return;
    setError(null);
    try {
      const { input, odometer } = parseDraft(draft);
      if (vehicle) {
        await update.mutateAsync({ vehicle, input });
        notify.success(t('vehicleForm.updated'));
        setLeft({ saved: vehicle.id });
      } else {
        const id = await create.mutateAsync({ ...input, odometer });
        notify.success(t('vehicleForm.added'));
        setLeft({ saved: id });
      }
    } catch (e) {
      setError({ field: e instanceof InputError ? e.field : 'form', message: errorMessage(e, t) });
    }
  };

  const hasReadings = (vehicle?.readings.length ?? 0) > 0;
  const modelReady = draft.brand.trim().length > 0 && draft.year !== null;

  return (
    <FormLayout
      testID={testID}
      footer={
        <Button
          testID={`${testID}-save`}
          block
          size="lg"
          loading={busy}
          label={submitLabel ?? (vehicle ? t('vehicleForm.submitEdit') : t('vehicleForm.submitAdd'))}
          onPress={() => void save()}
        />
      }
    >
      {vehicle ? null : (
        <Text step="subhead" tone="muted" style={styles.intro}>
          {t('vehicleForm.intro')}
        </Text>
      )}

      <PickerField
        testID={`${testID}-brand`}
        label={t('vehicleForm.brand')}
        value={draft.brand}
        placeholder={t('vehicleForm.brandPlaceholder')}
        accessibilityHint={t('vehicleForm.pickHint')}
        error={fieldError('brand')}
        onPress={() => pick('brand')}
      />
      <PickerField
        testID={`${testID}-year`}
        label={t('vehicleForm.year')}
        value={draft.year?.toString() ?? ''}
        placeholder={t('vehicleForm.yearPlaceholder')}
        accessibilityHint={t('vehicleForm.pickHint')}
        error={fieldError('year')}
        onPress={() => pick('year')}
      />
      <PickerField
        testID={`${testID}-model`}
        label={t('vehicleForm.model')}
        value={draft.model}
        placeholder={modelReady ? t('vehicleForm.modelPlaceholder') : t('vehicleForm.modelNeedsBrandYear')}
        hint={t('vehicleForm.modelHint')}
        accessibilityHint={t('vehicleForm.pickHint')}
        error={fieldError('model')}
        onPress={() => pick('model')}
      />

      <View style={styles.pair}>
        <View style={styles.half}>
          <TextField
            testID={`${testID}-engine`}
            label={t('vehicleForm.engine')}
            optional
            value={draft.engine}
            onChangeText={(engine) => change({ engine })}
            placeholder={t('vehicleForm.enginePlaceholder')}
            maxLength={FREE_TEXT_MAX}
            autoCorrect={false}
          />
        </View>
        <View style={styles.half}>
          <TextField
            testID={`${testID}-trim`}
            label={t('vehicleForm.trim')}
            optional
            value={draft.trimLevel}
            onChangeText={(trimLevel) => change({ trimLevel })}
            placeholder={t('vehicleForm.trimPlaceholder')}
            maxLength={FREE_TEXT_MAX}
            autoCorrect={false}
          />
        </View>
      </View>

      <PaintPicker testID={`${testID}-paint`} value={draft.color} onChange={(color) => change({ color })} />

      <TextField
        testID={`${testID}-plate`}
        label={t('vehicleForm.plate')}
        optional
        value={draft.plate}
        onChangeText={(plate) => change({ plate: sanitizePlate(plate) })}
        placeholder={t('vehicleForm.platePlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType={vehicle ? 'done' : 'next'}
        submitBehavior={vehicle ? 'blurAndSubmit' : 'submit'}
        onSubmitEditing={() => mileageRef.current?.focus()}
      />

      <Field label={t('vehicleForm.measure')} hint={hasReadings ? t('vehicleForm.measureLocked') : t('vehicleForm.measureHint')}>
        {hasReadings ? (
          <View style={styles.locked} accessible accessibilityLabel={`${t('vehicleForm.measureSpoken')}, ${t(`vehicleForm.${draft.measure}`)}`}>
            <Text step="body" weight={600}>
              {t(`vehicleForm.${draft.measure}`)}
            </Text>
          </View>
        ) : (
          <Segmented
            testID={`${testID}-measure`}
            label={t('vehicleForm.measureSpoken')}
            value={draft.measure}
            onChange={(measure) => change({ measure })}
            options={[
              { value: 'km', label: t('vehicleForm.km') },
              { value: 'mi', label: t('vehicleForm.mi') },
            ]}
          />
        )}
      </Field>

      {vehicle ? null : (
        <MileageField
          ref={mileageRef}
          testID={`${testID}-odometer`}
          label={t('vehicleForm.odometer')}
          placeholder={t('vehicleForm.odometerPlaceholder')}
          hint={t('vehicleForm.odometerHint')}
          measure={draft.measure}
          value={draft.odometer}
          error={fieldError('odometer')}
          onChange={(odometer) => change({ odometer })}
        />
      )}

      {error?.field === 'form' ? (
        <Text testID={`${testID}-error`} step="subhead" weight={500} tone="overdue" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.intro}>
          {error.message}
        </Text>
      ) : null}

      {vehicle && onWithdrawn ? (
        <View style={styles.danger}>
          <Button
            testID={`${testID}-withdraw`}
            variant="danger"
            icon="archive"
            label={t('fleet.card.withdraw')}
            loading={withdraw.isPending}
            onPress={() =>
              void withdraw.run(vehicle).then((withdrawn) => {
                if (withdrawn) setLeft({ withdrawn: true });
              })
            }
          />
        </View>
      ) : null}
    </FormLayout>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  intro: {
    paddingHorizontal: theme.space[1],
  },
  pair: {
    // Side by side as in the PWA; stacked at accessibility text sizes, so neither label is cut.
    flexDirection: rt.fontScale >= theme.largeTextScale ? 'column' : 'row',
    gap: theme.space[3],
  },
  half: {
    flexGrow: 1,
    flexBasis: rt.fontScale >= theme.largeTextScale ? 'auto' : 0,
  },
  locked: {
    justifyContent: 'center',
    minHeight: theme.size.field,
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface3,
  },
  danger: {
    paddingTop: theme.space[4],
  },
}));
