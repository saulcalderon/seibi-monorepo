import { daysBetween } from '@seibi/maintenance-engine/days';
import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { useRouter } from 'expo-router';
import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useActiveVehicle } from '@/data/preferences/store';
import { useProfile } from '@/data/profile/queries';
import { taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { formatDay, formatDistance, isoDate, relativeDays, vehicleChoiceLabel, vehicleName } from '@/lib/format';
import { knowledgeProfile, type KnowledgeLevel } from '@/lib/knowledge';
import { TabScroll } from '@/shell/tab-scroll';
import { Button } from '@/ui/button';
import { Card, IconTile, RowDivider } from '@/ui/card';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { usePressed } from '@/ui/press';
import { Text } from '@/ui/text';
import { VehicleThumb } from '@/vehicle/fleet-card';

import { groupReminders, nothingPending, otherVehicles, vehicleBadge } from './avisos-logic';
import { HistoryCard } from './history-card';
import { ManualReminderRow } from './manual-reminder-row';
import { PushCard } from './push-card';
import { ReminderRow } from './reminder-row';

/**
 * Avisos (S9, SEI-64), the PWA's screens/Avisos.tsx as of 6e3b818: the
 * Reminders of the Vehicle Inicio shows (`useActiveVehicle`), with a line
 * over them to switch to another Vehicle; the push card; then that
 * Vehicle's overdue Reminders, Appointments and hand-written Reminders in
 * one card, and «Por vencer», «Al día» and «Pospuestos» folded under it. A
 * Reminder opens its detail (`/reminder`); «N tareas sin fecha» unfolds
 * «Completa tu historial». «Nuevo» writes a hand-written Reminder.
 */
export function AvisosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const profile = useProfile();
  const { active, select } = useActiveVehicle(garage.vehicles);

  if (garage.isLoading) {
    return (
      <TabScroll testID="reminders-screen">
        <SkeletonGroup testID="avisos-loading">
          <Card>
            <ListRowSkeleton />
            <RowDivider />
            <ListRowSkeleton />
            <RowDivider />
            <ListRowSkeleton />
          </Card>
        </SkeletonGroup>
      </TabScroll>
    );
  }
  if (garage.isError) {
    return (
      <TabScroll testID="reminders-screen">
        <ErrorState testID="avisos-error" onRetry={garage.refetch} />
      </TabScroll>
    );
  }
  if (!active) {
    return (
      <TabScroll testID="reminders-screen">
        <Card>
          <EmptyState
            testID="avisos-empty"
            icon="vehicle"
            title={t('reminders.empty.title')}
            body={t('reminders.empty.body')}
            action={<Button testID="avisos-add-vehicle" icon="add" label={t('reminders.empty.action')} onPress={() => router.push('/vehicle/new')} />}
          />
        </Card>
      </TabScroll>
    );
  }

  return (
    <TabScroll testID="reminders-screen">
      <View style={styles.topRow}>
        <Button
          testID="avisos-add"
          variant="secondary"
          size="sm"
          icon="addReminder"
          label={t('reminders.addShort')}
          accessibilityLabel={t('reminders.add')}
          onPress={() => router.push({ pathname: '/new-reminder', params: { vehicleId: active.id } })}
        />
      </View>
      <OtherVehicles key={`others-${active.id}`} active={active} vehicles={garage.vehicles} onSelect={select} />
      <PushCard />
      <VehicleAvisos key={active.id} vehicle={active} tasks={taskMap(garage.tasks)} level={profile.data?.knowledgeLevel} />
    </TabScroll>
  );
}

/** Plate if any, then the odometer: tells twins of the same model and year apart. */
function identity(v: VehicleView, none: string) {
  const distance = v.odometer != null ? formatDistance(v.odometer, v.measure) : null;
  return [v.plate, distance].filter(Boolean).join(' · ') || none;
}

/**
 * The line over the Vehicle for the others: the most urgent one with
 * something pending, «· y N más»; unfolded, every other Vehicle to switch
 * to. Hidden when no other Vehicle has anything pending, as the PWA's.
 */
function OtherVehicles({ active, vehicles, onSelect }: { active: VehicleView; vehicles: VehicleView[]; onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed });
  const { others, lead, alsoPending } = otherVehicles(active, vehicles);
  if (!lead) return null;
  const name = vehicleChoiceLabel(lead, vehicles, t);
  const summary =
    alsoPending > 0 ? t('reminders.others.leadMore', { name, count: lead.pending, more: alsoPending }) : t('reminders.others.lead', { name, count: lead.pending });
  return (
    <Card testID="avisos-others">
      <Pressable
        testID="avisos-others-toggle"
        accessibilityRole="button"
        accessibilityLabel={summary}
        accessibilityHint={open ? t('reminders.others.hide') : t('reminders.others.show')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.othersToggle}
        {...pressHandlers}
      >
        <View style={styles.dot} />
        <Text step="footnote" tone="muted" numberOfLines={1} style={styles.grow}>
          {summary}
        </Text>
        <Icon name={open ? 'expand' : 'forward'} size="sm" tone="subtle" />
      </Pressable>
      {open
        ? others.map((v, i) => {
            const label = vehicleChoiceLabel(v, vehicles, t);
            const detail = `${v.year} · ${identity(v, t('reminders.noMileage'))}`;
            const status = v.pending > 0 ? t('reminders.badge.pending', { count: v.pending }) : t('reminders.badge.ok');
            return (
              <Fragment key={v.id}>
                <RowDivider />
                <OtherVehicleRow testID={`avisos-other-${i}`} vehicle={v} label={label} detail={detail} status={status} onPress={() => onSelect(v.id)} />
              </Fragment>
            );
          })
        : null}
    </Card>
  );
}

function OtherVehicleRow({ vehicle, label, detail, status, onPress, testID }: { vehicle: VehicleView; label: string; detail: string; status: string; onPress: () => void; testID: string }) {
  const { t } = useTranslation();
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('reminders.others.row', { name: label, detail, status })}
      accessibilityHint={t('reminders.others.switchHint')}
      onPress={onPress}
      style={styles.otherRow}
      {...pressHandlers}
    >
      <VehicleThumb vehicle={vehicle} />
      <View style={styles.grow}>
        <Text step="subhead" weight={600} numberOfLines={1}>
          {label}
        </Text>
        <Text step="caption" tone="muted" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text step="caption" weight={600}>
        {status}
      </Text>
    </Pressable>
  );
}

/** One Vehicle's Avisos: its header, the card of what needs doing, and the folded groups. */
function VehicleAvisos({ vehicle, tasks, level }: { vehicle: VehicleView; tasks: Map<string, MaintenanceTask>; level: KnowledgeLevel | null | undefined }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [showUnknown, setShowUnknown] = useState(false);
  const k = knowledgeProfile(level);
  const today = isoDate();
  const groups = groupReminders(vehicle.reminders);
  const appointments = [...vehicle.upcomingAppointments].sort((a, b) => (a.scheduledOn < b.scheduledOn ? -1 : 1));
  const manual = vehicle.openManualReminders;
  const badge = vehicleBadge({ overdue: groups.overdue.length, health: vehicle.health });
  const badgeText = badge.kind === 'pending' ? t('reminders.badge.pending', { count: badge.count }) : t(`reminders.badge.${badge.kind}`);

  const row = (group: string, reminder: Reminder, i: number) => (
    <ReminderRow
      key={reminder.taskCode}
      compact
      testID={`avisos-${group}-${i}`}
      reminder={reminder}
      task={tasks.get(reminder.taskCode)}
      measure={vehicle.measure}
      k={k}
      onPress={() => router.push({ pathname: '/reminder', params: { vehicleId: vehicle.id, task: reminder.taskCode } })}
    />
  );

  // The first card's rows, in the PWA's order; a divider goes between any two.
  const main: ReactNode[] = [];
  if (nothingPending(groups, appointments.length + manual.length)) {
    main.push(
      <View key="nothing" style={styles.line} testID="avisos-nothing">
        <IconTile icon="celebrate" size="sm" />
        <Text step="subhead" tone="muted" style={styles.grow}>
          {t('reminders.nothingPending')}
        </Text>
      </View>,
    );
  }
  groups.overdue.forEach((reminder, i) => main.push(row('overdue', reminder, i)));
  appointments.forEach((a, i) =>
    main.push(
      <View key={`a-${a.id}`} style={styles.line} testID={`avisos-appointment-${i}`}>
        <IconTile icon="appointment" size="sm" />
        <View style={styles.grow}>
          <Text step="subhead" weight={600} numberOfLines={1}>
            {a.shop ? t('reminders.appointmentShop', { shop: a.shop }) : t('reminders.appointment')}
          </Text>
          <Text step="footnote" tone="muted" numberOfLines={1}>
            {formatDay(a.scheduledOn, 'long')} · {relativeDays(daysBetween(today, a.scheduledOn), t)}
          </Text>
        </View>
      </View>,
    ),
  );
  manual.forEach((m, i) => main.push(<ManualReminderRow key={`m-${m.id}`} reminder={m} testID={`avisos-manual-${i}`} />));
  if (groups.unknown.length > 0) {
    main.push(
      <Disclosure
        key="unknown"
        testID="avisos-unknown-toggle"
        open={showUnknown}
        onToggle={() => setShowUnknown((s) => !s)}
        label={`${t('reminders.unknownRow.title', { count: groups.unknown.length })}, ${t('reminders.unknownRow.body')}`}
      >
        <IconTile icon="history" size="sm" />
        <View style={styles.grow}>
          <Text step="subhead" weight={600} numberOfLines={1}>
            {t('reminders.unknownRow.title', { count: groups.unknown.length })}
          </Text>
          <Text step="footnote" tone="muted" numberOfLines={1}>
            {t('reminders.unknownRow.body')}
          </Text>
        </View>
      </Disclosure>,
    );
  }

  return (
    <View style={styles.vehicle}>
      <View style={styles.vehicleHeader}>
        <VehicleThumb vehicle={vehicle} />
        <View style={styles.grow}>
          <Text testID="avisos-vehicle-name" step="callout" family="display" heading numberOfLines={1}>
            {vehicleName(vehicle)}
          </Text>
          <Text step="footnote" tone="muted" numberOfLines={1}>
            {vehicle.year} · {identity(vehicle, t('reminders.noMileage'))}
          </Text>
        </View>
        <View style={styles.badge} testID="avisos-badge">
          <Text step="caption" weight={600}>
            {badgeText}
          </Text>
        </View>
      </View>

      {/* Empty only when the one thing due is «Por vencer», folded below. */}
      {main.length > 0 ? (
        <Card testID="avisos-main">
          <Rows>{main}</Rows>
        </Card>
      ) : null}

      <Group testID="avisos-group-soon" title={t('reminders.groups.soon')} count={groups.soon.length} always>
        {groups.soon.length > 0 ? (
          <Rows>{groups.soon.map((reminder, i) => row('soon', reminder, i))}</Rows>
        ) : (
          <Text step="subhead" tone="muted" style={styles.groupEmpty}>
            {t('reminders.groups.soonEmpty')}
          </Text>
        )}
      </Group>
      <Group testID="avisos-group-ok" title={t('reminders.groups.ok')} count={groups.ok.length}>
        <Rows>{groups.ok.map((reminder, i) => row('ok', reminder, i))}</Rows>
      </Group>
      <Group testID="avisos-group-snoozed" title={t('reminders.groups.snoozed')} count={groups.snoozed.length}>
        <Rows>{groups.snoozed.map((reminder, i) => row('snoozed', reminder, i))}</Rows>
      </Group>

      {showUnknown ? <HistoryCard testID="avisos-history" vehicleId={vehicle.id} reminders={groups.unknown} tasks={tasks} level={level} initial={4} /> : null}
    </View>
  );
}

/** Rows of a card with a divider between any two. Each row carries its own key. */
function Rows({ children }: { children: ReactNode[] }) {
  return children.map((node, i) => (
    <Fragment key={(node as { key?: string | null } | null)?.key ?? i}>
      {i > 0 ? <RowDivider /> : null}
      {node}
    </Fragment>
  ));
}

/**
 * A folded group of Reminders: its name and count; a tap shows the rows.
 * Hidden when empty unless `always` («Por vencer» says it has none).
 */
function Group({ title, count, always = false, children, testID }: { title: string; count: number; always?: boolean; children: ReactNode; testID: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (count === 0 && !always) return null;
  return (
    <Card testID={testID}>
      <Disclosure testID={`${testID}-toggle`} open={open} onToggle={() => setOpen((o) => !o)} label={t('reminders.groups.spoken', { title, count })}>
        <Text step="callout" weight={600} style={styles.grow}>
          {title}
        </Text>
        <Text step="subhead" weight={600} tone="muted">
          {count}
        </Text>
      </Disclosure>
      {open ? (
        <>
          <RowDivider />
          {children}
        </>
      ) : null}
    </Card>
  );
}

/** A row that folds and unfolds what follows it, with a chevron that says which. */
function Disclosure({
  open,
  onToggle,
  label,
  children,
  testID,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: ReactNode;
  testID: string;
}) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={styles.disclosure}
      {...pressHandlers}
    >
      {children}
      <Icon name={open ? 'expand' : 'forward'} size="sm" tone="subtle" />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  grow: {
    flex: 1,
    minWidth: 0,
    gap: theme.space[0.5],
  },
  othersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2.5],
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[3.5],
    paddingVertical: theme.space[2.5],
    borderRadius: theme.radius['3xl'],
    borderCurve: 'continuous',
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  dot: {
    width: theme.size.dot,
    height: theme.size.dot,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.subtle,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2.5],
    paddingHorizontal: theme.space[3.5],
    paddingVertical: theme.space[2.5],
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  vehicle: {
    gap: theme.space[3],
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[1],
  },
  badge: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: theme.space[2.5],
    paddingVertical: theme.space[1],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.row,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  groupEmpty: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
}));
