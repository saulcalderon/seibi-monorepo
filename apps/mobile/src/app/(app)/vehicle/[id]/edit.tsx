import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useGarage } from '@/data/garage/use-garage';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';
import { VehicleForm } from '@/vehicle/vehicle-form';

/**
 * «Editar Vehículo»: the Vehicle form with the Vehicle's values, and
 * «Retirar de mi flota». Opened with the id alone (Mi flota's menu, and the
 * Vehicle detail in S6); saving or withdrawing closes it.
 */
export default function EditVehicleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const garage = useGarage();
  const found = garage.vehicles.find((v) => v.id === id) ?? null;
  // Withdrawing refetches the garage before the form closes: keep showing the Vehicle as it
  // was until then, instead of «No encontramos este Vehículo».
  const [last, setLast] = useState(found);
  if (found && found !== last) setLast(found);
  const vehicle = found ?? (garage.withdrawn.some((v) => v.id === id) ? last : null);

  if (vehicle) return <VehicleForm vehicle={vehicle} onSaved={() => router.back()} onWithdrawn={() => router.back()} />;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.screen} contentContainerStyle={styles.content}>
      {garage.isLoading ? (
        <SkeletonGroup>
          <ListRowSkeleton tile={false} />
          <ListRowSkeleton tile={false} />
        </SkeletonGroup>
      ) : garage.isError ? (
        <ErrorState onRetry={garage.refetch} />
      ) : (
        <EmptyState testID="vehicle-form-missing" icon="vehicle" title={t('vehicleDetail.missing.title')} body={t('vehicleDetail.missing.body')} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.space[5],
  },
}));
