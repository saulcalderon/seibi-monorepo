import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { useGarage } from '@/data/garage/use-garage';
import { vehicleName } from '@/lib/format';
import { TabScroll } from '@/shell/tab-scroll';
import { Card, ListRow, RowDivider } from '@/ui/card';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';

/**
 * Mi flota, as a placeholder (SEI-55): every Vehicle, each opening its
 * detail inside this tab. The fleet screen (S5) replaces it.
 */
export default function FleetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  return (
    <TabScroll testID="fleet-screen">
      {garage.isLoading ? (
        <SkeletonGroup>
          <Card>
            <ListRowSkeleton />
            <RowDivider />
            <ListRowSkeleton />
          </Card>
        </SkeletonGroup>
      ) : garage.isError ? (
        <ErrorState onRetry={garage.refetch} />
      ) : garage.vehicles.length === 0 ? (
        <EmptyState testID="fleet-empty" icon="vehicle" title={t('fleet.empty.title')} body={t('fleet.empty.body')} />
      ) : (
        <Card>
          {garage.vehicles.map((vehicle, i) => (
            <Fragment key={vehicle.id}>
              {i > 0 ? <RowDivider /> : null}
              <ListRow
                testID={`fleet-vehicle-${i}`}
                title={vehicleName(vehicle)}
                subtitle={vehicle.plate ? t('fleet.yearPlate', { year: vehicle.year, plate: vehicle.plate }) : String(vehicle.year)}
                onPress={() => router.push(`/vehicle/${vehicle.id}`)}
              />
            </Fragment>
          ))}
        </Card>
      )}
    </TabScroll>
  );
}
