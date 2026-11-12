import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { useGarage } from '@/data/garage/use-garage';
import { useProfile } from '@/data/profile/queries';
import { reminderDueText } from '@/data/reminder/text';
import { taskMap } from '@/data/task/catalog';
import { vehicleName } from '@/lib/format';
import { knowledgeProfile, taskLabel } from '@/lib/knowledge';
import { TabScroll } from '@/shell/tab-scroll';
import { Card, ListRow, RowDivider, SectionHeader } from '@/ui/card';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup, StatusBadge } from '@/ui/feedback';

/**
 * Avisos, as a placeholder (SEI-55): each Vehicle's Reminders as the engine
 * derives them, with their status. Its title opens the Vehicle inside this
 * tab. The Avisos screen (S6) replaces it.
 */
export default function RemindersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const profile = useProfile();
  const k = knowledgeProfile(profile.data?.knowledgeLevel);
  const tasks = taskMap(garage.tasks);
  return (
    <TabScroll testID="reminders-screen">
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
        <EmptyState icon="reminders" title={t('fleet.empty.title')} body={t('fleet.empty.body')} />
      ) : (
        garage.vehicles.map((vehicle, v) => (
          <Fragment key={vehicle.id}>
            <SectionHeader
              testID={`reminders-vehicle-${v}`}
              title={vehicleName(vehicle)}
              action={t('reminders.openVehicle')}
              onAction={() => router.push(`/vehicle/${vehicle.id}`)}
            />
            <Card>
              {vehicle.reminders.map((reminder, i) => (
                <Fragment key={reminder.taskCode}>
                  {i > 0 ? <RowDivider /> : null}
                  <ListRow
                    testID={`reminder-${v}-${i}`}
                    title={taskLabel(tasks.get(reminder.taskCode), reminder.taskCode, k)}
                    subtitle={reminderDueText(reminder, vehicle.measure, t)}
                    trailing={<StatusBadge status={reminder.status} />}
                  />
                </Fragment>
              ))}
            </Card>
          </Fragment>
        ))
      )}
    </TabScroll>
  );
}
