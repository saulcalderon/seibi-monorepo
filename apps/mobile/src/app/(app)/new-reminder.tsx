import { useLocalSearchParams } from 'expo-router';

import { ManualReminderSheet } from '@/reminders/manual-reminder-form';

/**
 * «Nuevo Recordatorio» (S9), a form sheet over the tabs. Param: `vehicleId`
 * (Avisos' Vehicle, or the Vehicle detail's); without it, Inicio's Vehicle.
 */
export default function NewReminderRoute() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  return <ManualReminderSheet vehicleId={vehicleId} />;
}
