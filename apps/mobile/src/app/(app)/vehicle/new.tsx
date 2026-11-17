import { useRouter } from 'expo-router';

import { VehicleForm } from '@/vehicle/vehicle-form';

/** «Agregar Vehículo»: the Vehicle form, empty. Saving closes it; the new Vehicle is in Mi flota. */
export default function NewVehicleScreen() {
  const router = useRouter();
  return <VehicleForm vehicle={null} onSaved={() => router.back()} />;
}
