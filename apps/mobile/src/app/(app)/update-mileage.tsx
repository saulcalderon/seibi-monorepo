import { useLocalSearchParams } from 'expo-router';

import { MileageForm } from '@/mileage/mileage-form';

/**
 * Update Mileage (S8), as a form sheet over the tabs. Params:
 * - none: [+] → «Actualizar Kilometraje», on the active Vehicle;
 * - `vehicleId`: that Vehicle (Inicio's «Actualizar»).
 */
export default function UpdateMileageSheet() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  return <MileageForm vehicleId={vehicleId} />;
}
