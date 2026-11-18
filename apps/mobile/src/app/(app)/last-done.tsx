import { useLocalSearchParams } from 'expo-router';

import { LastDoneSheet } from '@/reminders/last-done-form';

/**
 * «¿Cuándo fue “…”?» (S9), a form sheet over the tabs. Params: `vehicleId`
 * and `task`, from «Completa tu historial» or a Reminder's detail.
 */
export default function LastDoneRoute() {
  const { vehicleId, task } = useLocalSearchParams<{ vehicleId?: string; task?: string }>();
  return <LastDoneSheet vehicleId={vehicleId} taskCode={task} />;
}
