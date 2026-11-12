import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useGarage } from '@/data/garage/use-garage';
import { useActiveVehicle } from '@/data/preferences/store';
import { greeting, vehicleName } from '@/lib/format';
import { TabScroll } from '@/shell/tab-scroll';
import { Card, ListRow, SectionHeader } from '@/ui/card';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';
import { Text } from '@/ui/text';

/**
 * Inicio, as a placeholder (SEI-55): the greeting and the active Vehicle,
 * which opens inside this tab. The Garage (S4) replaces it.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const { active } = useActiveVehicle(garage.vehicles);
  return (
    <TabScroll testID="home-screen">
      <Text step="title3" family="display" heading testID="home-greeting">
        {greeting(t)}
      </Text>
      {garage.isLoading ? (
        <SkeletonGroup>
          <Card>
            <ListRowSkeleton />
          </Card>
        </SkeletonGroup>
      ) : garage.isError ? (
        <ErrorState onRetry={garage.refetch} />
      ) : active ? (
        <>
          <SectionHeader title={t('home.activeVehicle')} />
          <Card>
            <ListRow
              testID="home-vehicle"
              title={vehicleName(active)}
              subtitle={String(active.year)}
              onPress={() => router.push(`/vehicle/${active.id}`)}
            />
          </Card>
        </>
      ) : (
        <EmptyState testID="home-empty" icon="vehicle" title={t('fleet.empty.title')} body={t('fleet.empty.body')} />
      )}
    </TabScroll>
  );
}
