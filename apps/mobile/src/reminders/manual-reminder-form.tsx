import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessage, InputError } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useActiveVehicle } from '@/data/preferences/store';
import { useSaveManualReminder } from '@/data/reminder/mutations';
import { isoDate, vehicleName } from '@/lib/format';
import { Button } from '@/ui/button';
import { DateField, SelectField } from '@/ui/controls';
import { EmptyState } from '@/ui/feedback';
import { TextAreaField, TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { notify } from '@/ui/toast';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

import { SheetError, SheetHeader, SheetMessage, WithGarage } from './sheet-parts';

/** A calendar day as a local Date, for the date picker. */
const dayToDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * «Nuevo Recordatorio» (`/new-reminder?vehicleId=`), the PWA's
 * ManualReminderForm: something with a date to remember on a Vehicle (the
 * insurance, the inspection), with optional notes. With no `vehicleId` it
 * starts on the Vehicle Inicio shows; with two or more Vehicles it offers a
 * picker. It has fields, so its sheet has a fixed height.
 */
export function ManualReminderSheet({ vehicleId }: { vehicleId?: string }) {
  const { t } = useTranslation();
  return (
    <WithGarage testID="new-reminder">
      {(garage) =>
        garage.vehicles.length === 0 ? (
          <SheetMessage testID="new-reminder-empty">
            <EmptyState icon="vehicle" title={t('reminders.empty.title')} body={t('reminders.empty.body')} />
          </SheetMessage>
        ) : (
          <ManualReminderBody vehicles={garage.vehicles} vehicleId={vehicleId} />
        )
      }
    </WithGarage>
  );
}

function ManualReminderBody({ vehicles, vehicleId }: { vehicles: VehicleView[]; vehicleId?: string }) {
  const { t } = useTranslation();
  const { active } = useActiveVehicle(vehicles);
  const save = useSaveManualReminder();
  const [chosen, setChosen] = useState(() => vehicles.find((v) => v.id === vehicleId)?.id ?? active?.id ?? vehicles[0].id);
  const [title, setTitle] = useState('');
  // Opens on today: a native date picker has no empty value, where the PWA's field started blank.
  const [dueOn, setDueOn] = useState(() => isoDate());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const { leave } = useUnsavedGuard(title.trim() !== '' || notes.trim() !== '', {
    title: t('reminders.form.discard.title'),
    message: t('reminders.form.discard.body'),
    confirmLabel: t('reminders.form.discard.confirm'),
    cancelLabel: t('reminders.form.discard.cancel'),
  });
  const fieldError = (field: string) => (error?.field === field ? error.message : null);

  const submit = async () => {
    setError(null);
    try {
      await save.mutateAsync({ vehicleId: chosen, title, dueOn, notes });
      notify.success(t('reminders.form.saved'));
      leave();
    } catch (e) {
      setError({ field: e instanceof InputError ? e.field : 'form', message: errorMessage(e, t) });
    }
  };

  return (
    <FormLayout
      testID="new-reminder-sheet"
      footer={
        <>
          {error?.field === 'form' ? <SheetError testID="new-reminder-error" message={error.message} /> : null}
          <Button testID="new-reminder-save" block size="lg" label={t('reminders.form.save')} loading={save.isPending} onPress={() => void submit()} />
        </>
      }
    >
      <SheetHeader testID="new-reminder" title={t('reminders.form.title')} body={t('reminders.form.body')} />
      {vehicles.length > 1 ? (
        <SelectField
          testID="new-reminder-vehicle"
          label={t('reminders.form.vehicle')}
          value={chosen}
          onChange={setChosen}
          options={vehicles.map((v) => ({ value: v.id, label: `${vehicleName(v)} ${v.year}` }))}
        />
      ) : null}
      <TextField
        testID="new-reminder-what"
        label={t('reminders.form.what')}
        placeholder={t('reminders.form.placeholder')}
        value={title}
        error={fieldError('title')}
        onChangeText={(text) => {
          setTitle(text);
          setError(null);
        }}
        autoCapitalize="sentences"
        returnKeyType="next"
      />
      <DateField testID="new-reminder-date" label={t('reminders.form.date')} value={dayToDate(dueOn)} error={fieldError('dueOn')} onChange={(date) => setDueOn(isoDate(date))} />
      <TextAreaField testID="new-reminder-notes" label={t('reminders.form.notes')} optional value={notes} onChangeText={setNotes} />
    </FormLayout>
  );
}
