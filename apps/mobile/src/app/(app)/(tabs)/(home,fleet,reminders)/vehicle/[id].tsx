import { useLocalSearchParams } from 'expo-router';

import { detailTab, VehicleDetail } from '@/vehicle-detail/vehicle-detail';

/**
 * Detalle del Vehículo (S6, SEI-61). It opens inside whichever tab it was
 * opened from, and a link opens it in Mi flota — `seibi-dev://vehicle/<id>`
 * — with `?tab=` for Mantenimiento (default), historial, uso or datos.
 */
export default function VehicleScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  return <VehicleDetail vehicleId={id} tab={detailTab(tab)} />;
}
