import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { withdrawnDaysLeft } from '@/data/garage/derive';
import type { VehicleView } from '@/data/garage/types';
import { formatDistance, vehicleName } from '@/lib/format';
import { paintColor } from '@/lib/paint';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { MenuButton } from '@/ui/controls';
import { StatusBadge } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { PressScale, usePressed } from '@/ui/press';
import { Silhouette } from '@/ui/silhouette';
import { Text } from '@/ui/text';

import { useRestoreWithToast, useWithdrawWithConfirm } from './use-withdraw';

/** A Vehicle's picture: its Model render when it is ready, else its body-type silhouette in its paint. */
export function VehicleThumb({ vehicle, dimmed = false }: { vehicle: VehicleView; dimmed?: boolean }) {
  const { theme } = useUnistyles();
  styles.useVariants({ dimmed });
  const poster = vehicle.render?.status === 'ready' ? vehicle.render.posterUrl : null;
  return (
    <View style={styles.thumb} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {poster ? (
        <Image source={poster} contentFit="cover" style={styles.poster} accessible={false} />
      ) : (
        <Silhouette bodyType={vehicle.bodyType} paint={paintColor(vehicle.color, theme.art.paint)} width={theme.size.thumb.width - theme.space[3]} />
      )}
    </View>
  );
}

/**
 * One Vehicle in Mi flota (the PWA's FleetCard): its picture, name and
 * year, Plate and current odometer, and its health. A tap opens its detail
 * inside the tab; the «…» menu edits or withdraws it.
 */
export function FleetCard({ vehicle, home, testID }: { vehicle: VehicleView; home: boolean; testID: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const withdraw = useWithdrawWithConfirm();
  const { pressed, pressHandlers } = usePressed();
  const name = vehicleName(vehicle);
  const odometer = vehicle.odometer != null ? formatDistance(vehicle.odometer, vehicle.measure) : t('fleet.card.noOdometer');
  const details = vehicle.plate ? t('fleet.card.plateAndOdometer', { plate: vehicle.plate, odometer }) : odometer;
  const status = vehicle.health === 'unknown' ? t('fleet.card.noData') : t(`status.${vehicle.health}`);
  return (
    <PressScale pressed={pressed}>
      <Card style={styles.card}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={t(home ? 'fleet.card.spokenHome' : 'fleet.card.spoken', { name, year: vehicle.year, details, status })}
          onPress={() => router.push(`/vehicle/${vehicle.id}`)}
          style={styles.main}
          {...pressHandlers}
        >
          <VehicleThumb vehicle={vehicle} />
          <View style={styles.text}>
            <View style={styles.title}>
              {home ? <Icon name="home" size="xs" /> : null}
              <Text step="callout" weight={700} style={styles.name}>
                {name}{' '}
                <Text step="footnote" weight={600} tone="muted">
                  {vehicle.year}
                </Text>
              </Text>
            </View>
            <Text step="footnote" tone="muted">
              {details}
            </Text>
            <StatusBadge status={vehicle.health} label={status} />
          </View>
        </Pressable>
        <MenuButton
          testID={`${testID}-menu`}
          label={t('fleet.card.more', { name })}
          actions={[
            { id: 'edit', title: t('fleet.card.edit'), icon: 'edit' },
            { id: 'withdraw', title: t('fleet.card.withdraw'), icon: 'archive', destructive: true },
          ]}
          onAction={(action) => {
            if (action === 'edit') router.push(`/vehicle/${vehicle.id}/edit`);
            if (action === 'withdraw') void withdraw.run(vehicle);
          }}
        />
      </Card>
    </PressScale>
  );
}

/**
 * Vehicles withdrawn in the last 30 days, under the list (the PWA's
 * «Ver Vehículos retirados»): each says when it goes for good and can be
 * restored.
 */
export function WithdrawnVehicles({ vehicles, open, onToggle }: { vehicles: VehicleView[]; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const restore = useRestoreWithToast();
  if (vehicles.length === 0) return null;
  const count = vehicles.length;
  // The one withdrawn last first: it is the one a person most likely wants back.
  const latestFirst = [...vehicles].sort((a, b) => (b.withdrawnAt ?? '').localeCompare(a.withdrawnAt ?? ''));
  return (
    <View style={styles.withdrawn}>
      <Button
        testID="fleet-withdrawn-toggle"
        variant="ghost"
        size="sm"
        icon={open ? 'expand' : 'forward'}
        label={open ? t('fleet.withdrawn.hide', { count }) : t('fleet.withdrawn.show', { count })}
        onPress={onToggle}
      />
      {open
        ? latestFirst.map((vehicle, i) => {
            const days = vehicle.withdrawnAt ? withdrawnDaysLeft(vehicle.withdrawnAt) : 30;
            const name = vehicleName(vehicle);
            return (
              <Card key={vehicle.id} style={styles.withdrawnRow} testID={`fleet-withdrawn-${i}`}>
                <VehicleThumb vehicle={vehicle} dimmed />
                <View style={styles.text}>
                  <Text step="subhead" weight={600}>
                    {name}
                  </Text>
                  <Text step="caption" tone="muted">
                    {days === 1 ? t('fleet.withdrawn.rowOne', { year: vehicle.year }) : t('fleet.withdrawn.rowMany', { year: vehicle.year, days })}
                  </Text>
                </View>
                <Button
                  testID={`fleet-restore-${i}`}
                  variant="secondary"
                  size="sm"
                  icon="restore"
                  label={t('fleet.withdrawn.restore')}
                  accessibilityLabel={t('fleet.withdrawn.restoreSpoken', { name, year: vehicle.year })}
                  loading={restore.pendingId === vehicle.id}
                  onPress={() => void restore.run(vehicle.id)}
                />
              </Card>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: theme.space[2],
  },
  main: {
    flex: 1,
    // At accessibility text sizes the picture goes above the words, so the name never squeezes.
    flexDirection: rt.fontScale >= theme.largeTextScale ? 'column' : 'row',
    alignItems: rt.fontScale >= theme.largeTextScale ? 'flex-start' : 'center',
    gap: theme.space[3],
    padding: theme.space[3.5],
  },
  thumb: {
    width: theme.size.thumb.width,
    height: theme.size.thumb.height,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface2,
    borderWidth: theme.size.border.thin,
    borderColor: theme.colors.line,
    variants: {
      dimmed: { true: { opacity: theme.opacity.disabled }, false: {} },
    },
  },
  poster: {
    width: theme.size.thumb.width,
    height: theme.size.thumb.height,
  },
  text: {
    flex: 1,
    alignItems: 'flex-start',
    gap: theme.space[1],
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
  },
  name: {
    flexShrink: 1,
  },
  withdrawn: {
    gap: theme.space[2],
    paddingTop: theme.space[2],
  },
  withdrawnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius['2xl'],
  },
}));
