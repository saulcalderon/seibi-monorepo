// Inicio drawn from sample Vehicles, in Seibi Dev only (the route requires
// this module behind EXPO_PUBLIC_APP_VARIANT, like the data check). It shows
// what the shared seibi-dev test account can't: no Vehicles at all, two
// Vehicles to page through, a Vehicle without a poster (its silhouette) and
// the «Estado» cards. The samples are derived by the same engine as the real
// garage, and the carousel saves the active Vehicle the same way; nothing is
// written to seibi-dev.
import { useLocalSearchParams } from 'expo-router';

import { addDays } from '@seibi/maintenance-engine/days';

import { publicRenderUrl } from '@/data/garage/fetch';
import { deriveVehicle } from '@/data/garage/derive';
import type { VehicleRecord, VehicleView } from '@/data/garage/types';
import { useActiveVehicle } from '@/data/preferences/store';
import { useTasks } from '@/data/task/queries';
import { todayIso } from '@/lib/format';
import type { PaintCode } from '@/lib/paint';

import { Garage } from '../garage';

const daysBefore = (today: string, days: number) => addDays(today, -days);

export type FixtureCase = 'garage' | 'empty';

/** A Vehicle with nothing on it yet, in a paint preset (`vehicles.color`). */
function vehicle(id: string, paint: PaintCode, fields: Partial<VehicleRecord>): VehicleRecord {
  return {
    id,
    brand: '',
    model: '',
    year: 2020,
    plate: null,
    engine: null,
    trimLevel: null,
    color: paint,
    bodyType: null,
    measure: 'km',
    withdrawnAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    readings: [],
    services: [],
    routines: [],
    states: [],
    manualReminders: [],
    appointments: [],
    schedule: null,
    render: null,
    ...fields,
  };
}

/** A maintenance Service with one Service item per task, on a day `daysAgo` before today at `reading`. */
function service(id: string, daysAgo: number, reading: number, taskCodes: string[], today: string) {
  return {
    id,
    type: 'maintenance' as const,
    performedOn: daysBefore(today, daysAgo),
    shop: null,
    notes: null,
    totalCost: null,
    invoicePath: null,
    readingId: `${id}-reading`,
    reading,
    items: taskCodes.map((taskCode, i) => ({ id: `${id}-${i}`, taskCode, name: taskCode, cost: null, partBrand: null, partNumber: null })),
  };
}

/**
 * Two Vehicles: a Toyota Yaris with the poster seibi-dev already has (public
 * bucket), recent readings and Services, so «Estado» has cards; and a red
 * Mazda 3 with no poster yet and an old reading, so it shows its silhouette
 * and the Mileage hint.
 */
function fixtureRecords(today: string): VehicleRecord[] {
  return [
    vehicle('fixture-yaris', 'black', {
      brand: 'Toyota',
      model: 'Yaris',
      year: 2015,
      bodyType: 'hatchback',
      render: { status: 'ready', posterUrl: publicRenderUrl('toyota_yaris_2015_black/poster.png'), generating: false },
      readings: [
        { id: 'r1', reading: 48200, recordedOn: daysBefore(today, 120) },
        { id: 'r2', reading: 50100, recordedOn: daysBefore(today, 60) },
        { id: 'r3', reading: 52340, recordedOn: daysBefore(today, 3) },
      ],
      services: [
        service('s1', 200, 46900, ['engine_oil', 'oil_filter'], today),
        service('s2', 60, 50100, ['tire_rotation', 'air_filter'], today),
      ],
    }),
    vehicle('fixture-mazda', 'red', {
      brand: 'Mazda',
      model: '3',
      year: 2019,
      bodyType: 'sedan',
      render: { status: 'pending', posterUrl: null, generating: true },
      readings: [{ id: 'r4', reading: 31000, recordedOn: daysBefore(today, 40) }],
    }),
  ];
}

export function GarageFixtureScreen() {
  const { case: which } = useLocalSearchParams<{ case?: FixtureCase }>();
  const tasks = useTasks();
  const today = todayIso();
  const vehicles: VehicleView[] =
    which === 'empty' || !tasks.data ? [] : fixtureRecords(today).map((v) => deriveVehicle(v, tasks.data, today));
  const { active, select } = useActiveVehicle(vehicles);
  return (
    <Garage
      testID="home-fixture"
      state={tasks.isPending ? 'loading' : tasks.isError ? 'error' : 'ready'}
      vehicles={vehicles}
      active={active}
      tasks={tasks.data ?? []}
      knowledgeLevel={null}
      onSelect={select}
      onOpenVehicle={() => undefined}
      onUpdateMileage={() => undefined}
      onAddVehicle={() => undefined}
      onRetry={() => void tasks.refetch()}
    />
  );
}
