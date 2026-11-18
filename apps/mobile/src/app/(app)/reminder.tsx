import { useLocalSearchParams } from 'expo-router';

import { ReminderDetailSheet } from '@/reminders/reminder-detail';

/**
 * A Reminder's detail (S9), a form sheet over the tabs. Params: `vehicleId`
 * and `task` (its Maintenance task code), from a Reminder row in Avisos,
 * the Vehicle detail or Inicio's «Estado».
 */
export default function ReminderSheet() {
  const { vehicleId, task } = useLocalSearchParams<{ vehicleId?: string; task?: string }>();
  return <ReminderDetailSheet vehicleId={vehicleId} taskCode={task} />;
}
