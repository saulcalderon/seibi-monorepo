import { daysBetween } from '@seibi/maintenance-engine/days';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCancelAppointment } from '@/data/appointment/mutations';
import { errorMessage } from '@/data/errors';
import type { Appointment } from '@/data/garage/types';
import type { MaintenanceTask } from '@/data/task/catalog';
import { formatDay, isoDate, relativeDays } from '@/lib/format';
import { taskLabel, type KnowledgeProfile } from '@/lib/knowledge';
import { Button } from '@/ui/button';
import { IconTile } from '@/ui/card';
import { Text } from '@/ui/text';
import { confirm, notify } from '@/ui/toast';

/**
 * An upcoming Appointment in a list, as the PWA's rows at 6e3b818. Avisos'
 * (`AppointmentRow`): «Cita · <Taller>», its day and how far it is, and
 * «Hecho». The Vehicle detail's (`AppointmentDetailRow`): the tasks it is
 * for, the day and the Shop, then «Marcar hecho» and «Cancelar». «Hecho»
 * opens «Registrar Servicio» with the Appointment's tasks and Shop; saving
 * it completes the Appointment (`useSaveService`).
 */
export function AppointmentRow({ appointment, vehicleId, testID }: { appointment: Appointment; vehicleId: string; testID: string }) {
  const { t } = useTranslation();
  const record = useRecordFromAppointment(vehicleId);
  const day = formatDay(appointment.scheduledOn, 'long');
  return (
    <View style={styles.line} testID={testID}>
      <IconTile icon="appointment" size="sm" />
      <View style={styles.text}>
        <Text step="subhead" weight={600} numberOfLines={1}>
          {appointment.shop ? t('reminders.appointmentShop', { shop: appointment.shop }) : t('reminders.appointment')}
        </Text>
        <Text step="footnote" tone="muted" numberOfLines={1}>
          {day} · {relativeDays(daysBetween(isoDate(), appointment.scheduledOn), t)}
        </Text>
      </View>
      <Button
        testID={`${testID}-done`}
        size="sm"
        variant="secondary"
        label={t('reminders.done')}
        accessibilityLabel={t('reminders.appointmentDoneSpoken', { day })}
        onPress={() => record(appointment)}
      />
    </View>
  );
}

export function AppointmentDetailRow({
  appointment,
  vehicleId,
  tasks,
  k,
  testID,
}: {
  appointment: Appointment;
  vehicleId: string;
  tasks: ReadonlyMap<string, MaintenanceTask>;
  k: KnowledgeProfile;
  testID: string;
}) {
  const { t } = useTranslation();
  const record = useRecordFromAppointment(vehicleId);
  const cancel = useCancelAppointment();
  const day = formatDay(appointment.scheduledOn, 'long');

  // Unlike the PWA, cancelling asks first: there is no undo (as deleting a hand-written Reminder).
  const cancelIt = async () => {
    const ok = await confirm({
      title: t('vehicleDetail.appointments.cancelAsk', { day }),
      message: t('vehicleDetail.appointments.cancelBody'),
      confirmLabel: t('vehicleDetail.appointments.cancelConfirm'),
      cancelLabel: t('vehicleDetail.appointments.cancelKeep'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancel.mutateAsync(appointment.id);
      notify.success(t('vehicleDetail.appointments.canceled'));
    } catch (e) {
      notify.error(errorMessage(e, t));
    }
  };

  return (
    <View style={styles.row} testID={testID}>
      <IconTile icon="appointment" />
      <View style={styles.text}>
        <Text step="subhead" weight={600} numberOfLines={1}>
          {appointment.taskCodes.length > 0
            ? appointment.taskCodes.map((c) => taskLabel(tasks.get(c), c, k)).join(', ')
            : t('vehicleDetail.appointments.workshop')}
        </Text>
        <Text step="footnote" tone="muted">
          {day} · {relativeDays(daysBetween(isoDate(), appointment.scheduledOn), t)}
          {appointment.shop ? ` · ${appointment.shop}` : ''}
        </Text>
        <View style={styles.actions}>
          <Button
            testID={`${testID}-done`}
            size="sm"
            variant="secondary"
            label={t('vehicleDetail.appointments.markDone')}
            accessibilityLabel={t('vehicleDetail.appointments.markDoneSpoken', { day })}
            disabled={cancel.isPending}
            onPress={() => record(appointment)}
          />
          <Button
            testID={`${testID}-cancel`}
            size="sm"
            variant="ghost"
            label={t('vehicleDetail.appointments.cancel')}
            accessibilityLabel={t('vehicleDetail.appointments.cancelSpoken', { day })}
            loading={cancel.isPending}
            onPress={() => void cancelIt()}
          />
        </View>
      </View>
    </View>
  );
}

/** «Hecho»: «Registrar Servicio» on this Vehicle, with the Appointment's tasks and Shop, completing it on save. */
function useRecordFromAppointment(vehicleId: string) {
  const router = useRouter();
  return (appointment: Appointment) =>
    router.push({
      pathname: '/record-service',
      params: {
        vehicleId,
        appointmentId: appointment.id,
        ...(appointment.taskCodes.length > 0 ? { tasks: appointment.taskCodes.join(',') } : {}),
        ...(appointment.shop ? { shop: appointment.shop } : {}),
      },
    });
}

const styles = StyleSheet.create((theme) => ({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
  },
  text: {
    flex: 1,
    gap: theme.space[0.5],
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
    marginTop: theme.space[2],
  },
}));
