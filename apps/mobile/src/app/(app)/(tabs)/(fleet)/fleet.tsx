import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';
import { StyleSheet } from 'react-native-unistyles';

import { byUrgency } from '@/data/garage/derive';
import type { VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useActiveVehicle } from '@/data/preferences/store';
import { TabScroll } from '@/shell/tab-scroll';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/ui/feedback';
import { Text } from '@/ui/text';
import { FleetCard, WithdrawnVehicles } from '@/vehicle/fleet-card';
import { matchesVehicle } from '@/vehicle/search';

type Filter = 'all' | 'attention' | 'ok';

const needsAttention = (v: VehicleView) => v.health === 'overdue' || v.health === 'soon';

/**
 * Mi flota (the PWA's Fleet): every Vehicle, the one Inicio shows first and
 * then the most urgent, searchable by make, model, year or Plate in the
 * header's search bar and filtered by health. A Vehicle opens its detail in
 * this tab; «Agregar» opens the Vehicle form. Withdrawn Vehicles wait under
 * the list for 30 days, ready to be restored.
 */
export default function FleetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const garage = useGarage();
  const { active } = useActiveVehicle(garage.vehicles);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const search = useRef<SearchBarCommands>(null);
  const add = () => router.push('/vehicle/new');

  const total = garage.vehicles.length;
  // Search and filters exist only with two or more Vehicles. When the fleet drops to one (a
  // Vehicle withdrawn), the search bar goes away: so does what was typed in it.
  if (total <= 1 && (query !== '' || filter !== 'all')) {
    setQuery('');
    setFilter('all');
  }
  const sorted = [...garage.vehicles].sort((a, b) => (a.id === active?.id ? -1 : b.id === active?.id ? 1 : byUrgency(a, b)));
  const attention = sorted.filter(needsAttention).length;
  const ok = sorted.filter((v) => v.health === 'ok').length;
  const visible = sorted
    .filter((v) => (filter === 'attention' ? needsAttention(v) : filter === 'ok' ? v.health === 'ok' : true))
    .filter((v) => matchesVehicle(v, query));

  const withdrawn = (
    <WithdrawnVehicles vehicles={garage.withdrawn} open={showWithdrawn} onToggle={() => setShowWithdrawn((open) => !open)} />
  );

  if (garage.isLoading || garage.isError || total === 0) {
    return (
      <TabScroll testID="fleet-screen">
        {garage.isLoading ? (
          <SkeletonGroup>
            <Skeleton width="100%" height={styles.skeleton.height} round="3xl" />
            <Skeleton width="100%" height={styles.skeleton.height} round="3xl" />
          </SkeletonGroup>
        ) : garage.isError ? (
          <ErrorState onRetry={garage.refetch} />
        ) : (
          <>
            <Card style={styles.emptyCard}>
              <EmptyState
                testID="fleet-empty"
                icon="vehicle"
                title={t('fleet.empty.title')}
                body={t('fleet.empty.body')}
                action={<Button testID="fleet-add-first" icon="add" label={t('fleet.add')} onPress={add} />}
              />
            </Card>
            {withdrawn}
          </>
        )}
      </TabScroll>
    );
  }

  const count = total === 1 ? t('fleet.countOne') : t('fleet.countMany', { count: total });
  const summary =
    attention === 0
      ? count
      : t('fleet.summary', { vehicles: count, attention: attention === 1 ? t('fleet.attentionOne') : t('fleet.attentionMany', { count: attention }) });

  const header = (
    <View style={styles.header}>
      <View style={styles.summaryRow}>
        <Text testID="fleet-summary" step="subhead" tone="muted" style={styles.summary}>
          {summary}
        </Text>
        <Button testID="fleet-add" variant="secondary" size="sm" icon="add" label={t('fleet.addShort')} accessibilityLabel={t('fleet.add')} onPress={add} />
      </View>
      {total > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('fleet.filters.label')}>
          <Chip testID="fleet-filter-all" radio label={t('fleet.filters.all')} count={total} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip testID="fleet-filter-attention" radio label={t('fleet.filters.attention')} count={attention} selected={filter === 'attention'} onPress={() => setFilter('attention')} />
          <Chip testID="fleet-filter-ok" radio label={t('fleet.filters.ok')} count={ok} selected={filter === 'ok'} onPress={() => setFilter('ok')} />
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <>
      <FlashList
        testID="fleet-screen"
        data={visible}
        keyExtractor={(vehicle) => vehicle.id}
        renderItem={({ item, index }) => <FleetCard vehicle={item} home={total > 1 && item.id === active?.id} testID={`fleet-vehicle-${index}`} />}
        // FlashList keeps a row that only moved; redraw them all when the list is narrowed, so each
        // card's position (its testID, `fleet-vehicle-<n>`) and the Inicio mark stay true.
        extraData={`${query}|${filter}|${active?.id ?? ''}`}
        ItemSeparatorComponent={Gap}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            testID="fleet-no-results"
            icon="noResults"
            title={t('fleet.noResults.title')}
            body={query.trim() ? t('fleet.noResults.query', { query: query.trim() }) : t('fleet.noResults.filter')}
            action={
              <Button
                testID="fleet-show-all"
                variant="secondary"
                label={t('fleet.noResults.showAll')}
                onPress={() => {
                  search.current?.clearText();
                  search.current?.cancelSearch();
                  setQuery('');
                  setFilter('all');
                }}
              />
            }
          />
        }
        ListFooterComponent={withdrawn}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.content}
      />
      {total > 1 ? (
        <Stack.SearchBar
          ref={search}
          placeholder={t('fleet.search')}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
          onCancelButtonPress={() => setQuery('')}
          onClose={() => setQuery('')}
          hideWhenScrolling={false}
          autoCapitalize="none"
          cancelButtonText={t('picker.cancel')}
        />
      ) : null}
    </>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[2],
    // As TabScroll: the last card scrolls clear of the floating [+].
    paddingBottom: theme.size.fab + theme.space[3] * 2,
  },
  header: {
    gap: theme.space[3],
    paddingBottom: theme.space[3],
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[2],
    paddingLeft: theme.space[1],
  },
  summary: {
    flexShrink: 1,
  },
  chips: {
    gap: theme.space[2],
    paddingVertical: theme.space[0.5],
  },
  gap: {
    height: theme.space[3],
  },
  emptyCard: {
    paddingVertical: theme.space[2],
  },
  skeleton: {
    height: theme.size.thumb.height + theme.space[3.5] * 2,
  },
}));
