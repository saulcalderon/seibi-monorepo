import { Stack, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { useGarage } from '@/data/garage/use-garage';
import { formatNumber, vehicleName } from '@/lib/format';
import { TabScroll } from '@/shell/tab-scroll';
import { paintHex } from '@/theme/garage';
import { Button, IconButton } from '@/ui/button';
import { Card, RowDivider } from '@/ui/card';
import { EmptyState, ErrorState, ListRowSkeleton, SkeletonGroup } from '@/ui/feedback';
import { Segmented } from '@/ui/fields';
import { Icon, type IconName } from '@/ui/icon';
import { PressScale, usePressed } from '@/ui/press';
import { Text } from '@/ui/text';
import { VehicleArt } from '@/vehicle/vehicle-art';

import { DataTab } from './data-tab';
import { HistoryTab } from './history-tab';
import { MaintenanceTab } from './maintenance-tab';
import { UsageTab } from './usage-tab';

export type DetailTab = 'mantenimiento' | 'historial' | 'uso' | 'datos';
const TABS: DetailTab[] = ['mantenimiento', 'historial', 'uso', 'datos'];
const VALID = new Set<string>(TABS);

export function detailTab(raw: string | undefined): DetailTab {
  return raw && VALID.has(raw) ? (raw as DetailTab) : 'mantenimiento';
}

const HERO_HEIGHT = 224;
/** Approximate page width for the hero's silhouette cap (the floor's own ratio). */
const HERO_WIDTH = 390;

/**
 * Detalle del Vehículo (S6, SEI-61), ported from the PWA's VehicleDetail.tsx:
 * the hero, the three tiles and the Mantenimiento · Historial · Uso · Datos
 * tabs. The tab is the `tab` route param so `vehicle/<id>?tab=historial`
 * opens it directly. Reminder rows and «Citas y recordatorios» are read-only
 * until S9/S13; «Factura» waits for S12.
 */
export function VehicleDetail({ vehicleId, tab }: { vehicleId: string; tab: DetailTab }) {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const vehicle = garage.vehicles.find((v) => v.id === vehicleId);

  const setTab = (next: DetailTab) => router.setParams({ tab: next });

  return (
    <>
      <Stack.Screen
        options={{
          title: vehicle ? vehicleName(vehicle) : '',
          // The header is transparent on iOS and its two-line title sits over the scrolling hero and tabs: a hard edge
          // keeps the content from showing through the title (iOS 26+; earlier versions ignore it).
          scrollEdgeEffects: { top: 'hard' },
          headerTitle: vehicle
            ? () => (
                <View style={styles.headerTitle} accessible accessibilityRole="header">
                  <Text step="headline" weight={600} testID="vehicle-name">
                    {vehicleName(vehicle)}
                  </Text>
                  <Text step="caption" tone="muted" testID="vehicle-subtitle">
                    {[vehicle.year, vehicle.trimLevel, vehicle.plate].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )
            : undefined,
          headerRight: vehicle
            ? () => (
                <IconButton
                  testID="vehicle-edit"
                  icon="edit"
                  label={t('vehicleDetail.edit')}
                  onPress={() => router.push(`/vehicle/${vehicle.id}/edit`)}
                />
              )
            : undefined,
        }}
      />
      <TabScroll testID="vehicle-screen" flush>
        {garage.isLoading ? (
          <View style={styles.section}>
            <SkeletonGroup>
              <Card>
                <ListRowSkeleton tile={false} />
                <RowDivider />
                <ListRowSkeleton tile={false} />
              </Card>
            </SkeletonGroup>
          </View>
        ) : garage.isError ? (
          <View style={styles.section}>
            <ErrorState onRetry={garage.refetch} />
          </View>
        ) : vehicle ? (
          <View style={styles.body}>
            <View style={styles.hero} testID="vehicle-hero">
              <VehicleArt vehicle={vehicle} paint={paintHex(vehicle.color)} silhouetteWidth={HERO_WIDTH * 0.9} testID="vehicle-hero-art" />
            </View>
            <View style={styles.tiles}>
              <PressableTile
                testID="tile-odometer"
                icon="mileage"
                value={vehicle.odometer != null ? formatNumber(vehicle.odometer) : '—'}
                caption={t('vehicleDetail.tiles.update', { measure: vehicle.measure })}
                onPress={() => router.push({ pathname: '/update-mileage', params: { vehicleId: vehicle.id } })}
              />
              <StaticTile
                testID="tile-health"
                icon="privacy"
                value={t(`status.${vehicle.health}`)}
                caption={vehicle.pending > 0 ? t('vehicleDetail.tiles.pending', { count: vehicle.pending }) : t('vehicleDetail.tiles.health')}
              />
              <PressableTile
                testID="tile-usage"
                icon="route"
                value={vehicle.usage ? formatNumber(vehicle.usage.perDay * 7) : '—'}
                caption={t('vehicleDetail.tiles.perWeek', { measure: vehicle.measure })}
                onPress={() => setTab('uso')}
              />
            </View>
            <Segmented
              testID="detail-tabs"
              label={t('vehicleDetail.tabs.label')}
              value={tab}
              onChange={setTab}
              options={TABS.map((id) => ({ value: id, label: t(`vehicleDetail.tabs.${id}`) }))}
            />
            {tab === 'mantenimiento' ? <MaintenanceTab vehicle={vehicle} /> : null}
            {tab === 'historial' ? <HistoryTab vehicle={vehicle} /> : null}
            {tab === 'uso' ? <UsageTab vehicle={vehicle} /> : null}
            {tab === 'datos' ? <DataTab vehicle={vehicle} /> : null}
          </View>
        ) : (
          <View style={styles.section}>
            <EmptyState
              testID="vehicle-missing"
              icon="vehicle"
              title={t('vehicleDetail.missing.title')}
              body={t('vehicleDetail.missing.body')}
              action={<Button variant="secondary" label={t('vehicleDetail.missing.goFleet')} onPress={() => router.replace('/fleet')} />}
            />
          </View>
        )}
      </TabScroll>
    </>
  );
}

function TileBody({ icon, value, caption }: { icon: IconName; value: string; caption: string }) {
  return (
    <>
      <Icon name={icon} size="sm" tone="ink" />
      <Text step="subhead" weight={700} family="mono" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text step="caption" tone="muted" numberOfLines={1}>
        {caption}
      </Text>
    </>
  );
}

/** The three stat cards under the hero (the PWA's tiles): two tap, the health one is read-only. */
function PressableTile({ icon, value, caption, onPress, testID }: { icon: IconName; value: string; caption: string; onPress: () => void; testID: string }) {
  const { pressed, pressHandlers } = usePressed();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${value} ${caption}`} onPress={onPress} style={styles.tile} {...pressHandlers}>
      <PressScale pressed={pressed}>
        <View style={styles.tileInner}>
          <TileBody icon={icon} value={value} caption={caption} />
        </View>
      </PressScale>
    </Pressable>
  );
}

function StaticTile({ icon, value, caption, testID }: { icon: IconName; value: string; caption: string; testID: string }) {
  return (
    <View style={[styles.tile, styles.tileInner]} testID={testID} accessibilityLabel={`${value} ${caption}`}>
      <TileBody icon={icon} value={value} caption={caption} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: {
    paddingHorizontal: theme.space[4],
  },
  body: {
    gap: theme.space[5],
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[6],
  },
  headerTitle: {
    alignItems: 'center',
  },
  hero: {
    height: HERO_HEIGHT,
    marginTop: -theme.space[2],
    overflow: 'hidden',
  },
  tiles: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  tile: {
    flex: 1,
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
  },
  tileInner: {
    gap: theme.space[1.5],
    padding: theme.space[3],
  },
}));
