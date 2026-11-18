import { useRouter } from 'expo-router';

import { useGarage } from '@/data/garage/use-garage';
import { useActiveVehicle } from '@/data/preferences/store';
import { useProfile } from '@/data/profile/queries';
import { Garage } from '@/home/garage';

/**
 * Inicio (S4, SEI-59): the Garage. The greeting is the header's large title
 * and the avatar sits beside it (the tab's stack). The Vehicle shown is the
 * one picked last on this phone (`useActiveVehicle`), else the first.
 */
export default function HomeScreen() {
  const router = useRouter();
  const garage = useGarage();
  const profile = useProfile();
  const { active, select } = useActiveVehicle(garage.vehicles);
  return (
    <Garage
      testID="home-screen"
      state={garage.isLoading ? 'loading' : garage.isError ? 'error' : 'ready'}
      vehicles={garage.vehicles}
      active={active}
      tasks={garage.tasks}
      knowledgeLevel={profile.data?.knowledgeLevel}
      onSelect={select}
      onOpenVehicle={(id) => router.push(`/vehicle/${id}`)}
      // The Mileage form (S8) takes this route and reads the Vehicle from it.
      onUpdateMileage={(id) => router.push({ pathname: '/update-mileage', params: { vehicleId: id } })}
      // A Reminder's detail (S9) is a sheet over the tabs.
      onOpenReminder={(vehicleId, task) => router.push({ pathname: '/reminder', params: { vehicleId, task } })}
      // The Vehicle form (S5) opens as a modal over the tabs.
      onAddVehicle={() => router.push('/vehicle/new')}
      onRetry={garage.refetch}
    />
  );
}
