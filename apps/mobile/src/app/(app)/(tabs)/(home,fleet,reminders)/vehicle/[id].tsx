import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useGarage } from '@/data/garage/use-garage';
import { formatDistance, vehicleName } from '@/lib/format';
import { TabScroll } from '@/shell/tab-scroll';
import { Card, ListRow, RowDivider } from '@/ui/card';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';

/**
 * A Vehicle's detail, as a placeholder (SEI-55): its name in the header and
 * a few facts. It opens inside whichever tab it was opened from, and a link
 * (`seibi-dev://vehicle/<id>`) opens it in Mi flota with the list under it.
 * The Vehicle detail (S5) replaces it.
 */
export default function VehicleScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const garage = useGarage();
  const vehicle = garage.vehicles.find((v) => v.id === id) ?? null;
  return (
    <>
      <Stack.Screen options={{ title: vehicle ? vehicleName(vehicle) : '' }} />
      <TabScroll testID="vehicle-screen">
        {garage.isLoading ? (
          <SkeletonGroup>
            <Card>
              <ListRowSkeleton tile={false} />
              <RowDivider />
              <ListRowSkeleton tile={false} />
            </Card>
          </SkeletonGroup>
        ) : garage.isError ? (
          <ErrorState onRetry={garage.refetch} />
        ) : vehicle ? (
          <Card>
            <ListRow testID="vehicle-name" title={vehicleName(vehicle)} subtitle={String(vehicle.year)} />
            <RowDivider />
            <ListRow title={t('vehicleDetail.plate')} subtitle={vehicle.plate ?? t('vehicleDetail.noPlate')} />
            <RowDivider />
            <ListRow
              testID="vehicle-odometer"
              title={t('vehicleDetail.odometer')}
              subtitle={vehicle.odometer != null ? formatDistance(vehicle.odometer, vehicle.measure) : t('vehicleDetail.noOdometer')}
            />
          </Card>
        ) : (
          <EmptyState testID="vehicle-missing" icon="vehicle" title={t('vehicleDetail.missing.title')} body={t('vehicleDetail.missing.body')} />
        )}
      </TabScroll>
    </>
  );
}
