import { useLocalSearchParams } from 'expo-router';

import { CorrectReadingForm } from '@/vehicle-detail/correct-reading-form';

/**
 * «Corregir lectura» (S6), a form sheet over the tabs. Params: `readingId`
 * and `vehicleId` — both from a reading row in the Vehicle's Historial.
 */
export default function CorrectReadingSheet() {
  const { readingId, vehicleId } = useLocalSearchParams<{ readingId?: string; vehicleId?: string }>();
  return <CorrectReadingForm readingId={readingId} vehicleId={vehicleId} />;
}
