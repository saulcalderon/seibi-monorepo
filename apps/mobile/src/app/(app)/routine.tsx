import { useLocalSearchParams } from 'expo-router';

import { RoutineForm } from '@/vehicle-detail/routine-form';

/**
 * The Routine sheet (S6), a form sheet over the tabs. Params: `vehicleId`
 * always; `routineId` edits that Routine, absent adds one.
 */
export default function RoutineSheet() {
  const { vehicleId, routineId } = useLocalSearchParams<{ vehicleId?: string; routineId?: string }>();
  return <RoutineForm vehicleId={vehicleId} routineId={routineId} />;
}
