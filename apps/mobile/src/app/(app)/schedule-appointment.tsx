import { useLocalSearchParams } from 'expo-router';

import { AppointmentSheet } from '@/appointments/appointment-form';

/**
 * «Agendar Cita» (S13), a form sheet over the tabs. Params: `vehicleId`
 * (the Vehicle detail's, a Reminder's), else Inicio's Vehicle; `tasks`,
 * Maintenance task codes comma-separated, to start with (a Reminder's
 * «Agendar»).
 */
export default function ScheduleAppointmentRoute() {
  const { vehicleId, tasks } = useLocalSearchParams<{ vehicleId?: string; tasks?: string }>();
  return <AppointmentSheet vehicleId={vehicleId} taskCodes={tasks ? tasks.split(',').filter(Boolean) : undefined} />;
}
