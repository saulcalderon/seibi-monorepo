import { openBrowserAsync } from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { EstimateResponse } from '@/data/estimate/schemas';
import type { VehicleView } from '@/data/garage/types';
import { vehicleName } from '@/lib/format';
import { plainText } from '@/lib/text';
import { Button } from '@/ui/button';
import { Card, RowDivider } from '@/ui/card';
import { Icon, type IconName } from '@/ui/icon';
import { Text } from '@/ui/text';

import { confidenceBars, estimatePlace, estimateTitle, priceRows, totals } from './estimates-logic';

/** How many sources the card lists (the PWA's 5). */
const SOURCES_MAX = 5;

/**
 * One Estimate (the PWA's EstimateCard): the Vehicle and place, the job; the
 * independent shop and dealership totals, the breakdown, the summary, «Suele
 * incluir» and «Qué mueve el precio» when a price was found, else only the
 * summary of what is missing; the confidence, the sources (in the in-app
 * browser, as the Vehicle detail's) and the «Estimado, no presupuesto» note.
 * «Preguntar» switches to the chat (SEI-69). The PWA's «Agendar» is left
 * out: the Reminder detail has one.
 */
export function EstimateCard({
  estimate,
  vehicle,
  onAsk,
}: {
  estimate: Pick<EstimateResponse, 'query' | 'city' | 'country' | 'result'>;
  vehicle: VehicleView;
  onAsk: () => void;
}) {
  const { t } = useTranslation();
  const r = estimate.result;
  const total = totals(r);
  const bars = confidenceBars(r.confidence);
  const confidence = t(`estimates.result.confidence.${r.confidence}`);

  return (
    <Card testID="estimates-result">
      <View style={styles.head}>
        <Text step="footnote" weight={600} tone="muted">
          {t('estimates.result.meta', { vehicle: vehicleName(vehicle), year: vehicle.year, place: estimatePlace(estimate.city, estimate.country, t) })}
        </Text>
        <Text testID="estimates-result-title" step="title3" family="display" heading>
          {estimateTitle(estimate)}
        </Text>
      </View>
      <RowDivider />

      <View style={styles.body}>
        {!r.found ? (
          <Text testID="estimates-result-summary" step="subhead" tone="muted">
            {plainText(r.summary)}
          </Text>
        ) : (
          <>
            <View style={styles.tiles}>
              <PriceTile testID="estimates-result-independent" icon="shop" label={t('estimates.result.independent')} value={total.independent} />
              <PriceTile testID="estimates-result-dealership" icon="dealer" label={t('estimates.result.dealership')} value={total.dealership} />
            </View>
            {priceRows(r).map((row) => (
              <View key={row.key} style={styles.line} accessible accessibilityLabel={t('estimates.result.totalSpoken', { label: t(`estimates.result.${row.key}`), value: row.value })}>
                <Text step="subhead" tone="muted" style={styles.grow}>
                  {t(`estimates.result.${row.key}`)}
                </Text>
                <Text step="subhead" weight={600}>
                  {row.value}
                </Text>
              </View>
            ))}
            <Text testID="estimates-result-summary" step="subhead" tone="muted">
              {plainText(r.summary)}
            </Text>
            <Bullets title={t('estimates.result.includes')} items={r.includes} testID="estimates-result-includes" />
            <Bullets title={t('estimates.result.factors')} items={r.factors} testID="estimates-result-factors" />
          </>
        )}

        <View style={styles.confidence} testID="estimates-result-confidence" accessible accessibilityLabel={confidence}>
          <View style={styles.bars}>
            {[1, 2, 3].map((b) => (
              <View key={b} style={[styles.bar, b <= bars ? styles.barOn : styles.barOff]} />
            ))}
          </View>
          <Text step="footnote" weight={600} tone="muted">
            {confidence}
          </Text>
        </View>

        {r.sources.length > 0 ? (
          <View style={styles.list} testID="estimates-result-sources">
            <Text step="footnote" weight={700} tone="muted" heading>
              {t('estimates.result.sources')}
            </Text>
            {r.sources.slice(0, SOURCES_MAX).map((source, i) => (
              <Pressable
                key={source.url}
                testID={`estimates-result-source-${i}`}
                accessibilityRole="link"
                accessibilityLabel={t('estimates.result.openSource', { title: source.title })}
                onPress={() => void openBrowserAsync(source.url)}
                style={styles.link}
              >
                <Text step="footnote" weight={600} numberOfLines={1} style={styles.linkText}>
                  {source.title}
                </Text>
                <Icon name="external" size="xs" tone="ink" />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.note}>
          <Icon name="info" size="sm" tone="muted" />
          <Text step="caption" tone="muted" style={styles.grow}>
            {t('estimates.result.disclaimer')}
          </Text>
        </View>

        <Button testID="estimates-result-ask" variant="secondary" icon="chat" block label={t('estimates.result.ask')} accessibilityHint={t('estimates.result.askHint')} onPress={onAsk} />
      </View>
    </Card>
  );
}

/** A total: its icon, its label and the range, or «Sin datos». */
function PriceTile({ icon, label, value, testID }: { icon: IconName; label: string; value: string | null; testID: string }) {
  const { t } = useTranslation();
  const shown = value ?? t('estimates.result.noData');
  return (
    <View style={styles.tile} testID={testID} accessible accessibilityLabel={t('estimates.result.totalSpoken', { label, value: shown })}>
      <Icon name={icon} size="sm" tone="muted" />
      <Text step="caption" weight={600} tone="muted">
        {label}
      </Text>
      <Text step="callout" weight={700}>
        {shown}
      </Text>
    </View>
  );
}

/** A titled list with a bullet per line («Suele incluir», «Qué mueve el precio»); nothing when empty. */
function Bullets({ title, items, testID }: { title: string; items: string[]; testID: string }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.list} testID={testID}>
      <Text step="footnote" weight={700} tone="muted" heading>
        {title}
      </Text>
      {items.map((item, i) => (
        <View key={`${i}-${item}`} style={styles.bullet}>
          <View style={styles.bulletDot} />
          <Text step="subhead" style={styles.grow}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  head: {
    gap: theme.space[0.5],
    paddingHorizontal: theme.space[5],
    paddingVertical: theme.space[4],
  },
  body: {
    gap: theme.space[4],
    padding: theme.space[5],
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  tiles: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  tile: {
    flex: 1,
    gap: theme.space[1],
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    padding: theme.space[3.5],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.space[3],
  },
  list: {
    gap: theme.space[1],
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[2],
  },
  bulletDot: {
    width: theme.size.dot,
    height: theme.size.dot,
    // Centres the dot on the first line of subhead text.
    marginTop: theme.space[2],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.ink,
  },
  confidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  bars: {
    flexDirection: 'row',
    gap: theme.space[0.5],
  },
  bar: {
    width: theme.size.confidenceBar.width,
    height: theme.size.confidenceBar.height,
    borderRadius: theme.radius.pill,
  },
  barOn: {
    backgroundColor: theme.colors.ink,
  },
  barOff: {
    backgroundColor: theme.colors.surface3,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.size.target,
  },
  linkText: {
    flexShrink: 1,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[2],
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: theme.space[3.5],
    paddingVertical: theme.space[3],
  },
}));
