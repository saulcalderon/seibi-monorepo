import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useSaveAppointment } from '@/data/appointment/mutations';
import { errorMessage, InputError } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useActiveVehicle } from '@/data/preferences/store';
import { useProfile } from '@/data/profile/queries';
import { taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { dayToDate, isoDate, vehicleName } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { taskIcon } from '@/lib/task-icon';
import { SheetError, SheetHeader, SheetMessage, WithGarage } from '@/reminders/sheet-parts';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { DateField, SelectField } from '@/ui/controls';
import { EmptyState } from '@/ui/feedback';
import { Field, TextAreaField, TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { notify } from '@/ui/toast';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

import { taskChoices } from './appointment-logic';

/**
 * «Agendar Cita» (`/schedule-appointment?vehicleId=&tasks=`), the PWA's
 * AppointmentForm (forms/SmallForms.tsx at 6e3b818): a day for work the
 * person will do, the Maintenance tasks it is for, the Shop and notes.
 * With no `vehicleId` it starts on the Vehicle Inicio shows; with two or
 * more Vehicles it offers a picker. `tasks` (a Reminder's «Agendar») starts
 * with those chips on.
 */
export function AppointmentSheet({ vehicleId, taskCodes }: { vehicleId?: string; taskCodes?: string[] }) {
  const { t } = useTranslation();
  return (
    <WithGarage testID="appointment">
      {(garage) =>
        garage.vehicles.length === 0 ? (
          <SheetMessage testID="appointment-empty">
            <EmptyState icon="vehicle" title={t('reminders.empty.title')} body={t('reminders.empty.body')} />
          </SheetMessage>
        ) : (
          <AppointmentBody vehicles={garage.vehicles} tasks={garage.tasks} vehicleId={vehicleId} openedWith={taskCodes ?? []} />
        )
      }
    </WithGarage>
  );
}

function AppointmentBody({
  vehicles,
  tasks,
  vehicleId,
  openedWith,
}: {
  vehicles: VehicleView[];
  tasks: MaintenanceTask[];
  vehicleId?: string;
  openedWith: string[];
}) {
  const { t } = useTranslation();
  const { active } = useActiveVehicle(vehicles);
  const profile = useProfile();
  const save = useSaveAppointment();
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const byCode = taskMap(tasks);
  const [start] = useState(() => ({
    vehicleId: vehicles.find((v) => v.id === vehicleId)?.id ?? active?.id ?? vehicles[0].id,
    scheduledOn: isoDate(),
    codes: openedWith.filter((code) => byCode.has(code)),
  }));
  const [chosen, setChosen] = useState(start.vehicleId);
  // Opens on today: a native date picker has no empty value, where the PWA's field started blank.
  const [scheduledOn, setScheduledOn] = useState(start.scheduledOn);
  const [codes, setCodes] = useState<string[]>(start.codes);
  const [shop, setShop] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const vehicle = vehicles.find((v) => v.id === chosen) ?? vehicles[0];
  const choices = taskChoices({ reminders: vehicle.reminders, openedWith: start.codes, tasks });

  const dirty =
    chosen !== start.vehicleId ||
    scheduledOn !== start.scheduledOn ||
    codes.join(',') !== start.codes.join(',') ||
    shop.trim() !== '' ||
    notes.trim() !== '';
  const { leave } = useUnsavedGuard(dirty, {
    title: t('appointments.form.discard.title'),
    message: t('appointments.form.discard.body'),
    confirmLabel: t('appointments.form.discard.confirm'),
    cancelLabel: t('appointments.form.discard.cancel'),
  });
  const fieldError = (field: string) => (error?.field === field ? error.message : null);

  const toggle = (code: string) => {
    setError(null);
    setCodes((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));
  };

  const submit = async () => {
    setError(null);
    try {
      await save.mutateAsync({ vehicleId: chosen, scheduledOn, shop, notes, taskCodes: codes });
      notify.success(t('appointments.form.saved'));
      leave();
    } catch (e) {
      setError({ field: e instanceof InputError ? e.field : 'form', message: errorMessage(e, t) });
    }
  };

  return (
    <FormLayout
      testID="appointment-sheet"
      footer={
        <>
          {error?.field === 'form' ? <SheetError testID="appointment-error" message={error.message} /> : null}
          <Button testID="appointment-save" block size="lg" label={t('appointments.form.save')} loading={save.isPending} onPress={() => void submit()} />
        </>
      }
    >
      <SheetHeader testID="appointment" title={t('appointments.form.title')} body={t('appointments.form.body')} />
      {vehicles.length > 1 ? (
        <SelectField
          testID="appointment-vehicle"
          label={t('appointments.form.vehicle')}
          value={chosen}
          onChange={(id) => {
            setError(null);
            setChosen(id);
          }}
          options={vehicles.map((v) => ({ value: v.id, label: `${vehicleName(v)} ${v.year}` }))}
        />
      ) : null}
      <DateField
        testID="appointment-date"
        label={t('appointments.form.date')}
        value={dayToDate(scheduledOn)}
        minimumDate={dayToDate(isoDate())}
        error={fieldError('scheduledOn')}
        onChange={(date) => {
          setError(null);
          setScheduledOn(isoDate(date));
        }}
      />
      <Field label={t('appointments.form.what')} optional>
        <View style={styles.chips}>
          {choices.map((code) => {
            const label = taskLabel(byCode.get(code), code, k);
            return (
              <Chip
                key={code}
                testID={`appointment-task-${code}`}
                label={label}
                icon={taskIcon(code)}
                selected={codes.includes(code)}
                onPress={() => toggle(code)}
              />
            );
          })}
        </View>
      </Field>
      <TextField testID="appointment-shop" label={t('appointments.form.shop')} optional value={shop} onChangeText={setShop} autoCapitalize="words" returnKeyType="next" />
      <TextAreaField testID="appointment-notes" label={t('appointments.form.notes')} optional value={notes} onChangeText={setNotes} />
    </FormLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
}));
