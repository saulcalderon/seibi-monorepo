import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { contactShadow, paintAccent, paintHex } from '@/theme/garage';
import { IconTile } from '@/ui/card';
import { Icon, type IconName } from '@/ui/icon';
import { Text } from '@/ui/text';

// The Intro's pictures (S2). In the PWA each slide played a live screen
// inside a phone; the port keeps each screen where its animation comes to
// rest, without the phone and without motion, drawn from what Seibi already
// has: the PWA's 370Z (`intro-370z.png`) and the kit's cards. They are
// pictures: VoiceOver and TalkBack skip them (the slide's words say it), and
// their words keep their size when the phone's text grows, as an image's do.

const VEHICLE = require('../../assets/images/intro-vehicle.png') as number;
/** The PNG is 1232 × 397. */
const VEHICLE_RATIO = 1232 / 397;

/** Picture words: a picture's size whatever the phone's text size. */
function ArtText(props: ComponentProps<typeof Text>) {
  return <Text maxFontSizeMultiplier={1} {...props} />;
}

/** «Qué es Seibi»: the 370Z on the floor, where the PWA's Garage parks it. */
export function VehicleArt() {
  return (
    <View style={styles.vehicle}>
      <View style={styles.contact} />
      <Image source={VEHICLE} contentFit="contain" style={styles.vehicleImage} accessible={false} />
    </View>
  );
}

/** «El problema»: the three cards of a Service with nothing settled: the change overdue, the invoice, a price that changes per shop. */
export function ProblemArt() {
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      <ArtRow icon="engineOil" tone="overdue" title={t('intro.art.lastChange')} sub={t('intro.art.lastChangeTask')}>
        <View style={styles.summary}>
          <View style={styles.alertDot} />
          <ArtText step="caption" weight={500} tone="overdue">
            {t('intro.art.lastChangeWhen')}
          </ArtText>
        </View>
      </ArtRow>
      <ArtRow icon="receipt" title={t('intro.art.invoice')} sub={t('intro.art.invoiceDate')}>
        <IconTile icon="document" size="sm" />
      </ArtRow>
      <ArtRow icon="estimates" title={t('intro.art.price')} sub={t('intro.art.priceNote')}>
        <ArtText step="title3" weight={300} style={styles.price}>
          {t('intro.art.priceValue')}
        </ArtText>
      </ArtRow>
    </View>
  );
}

function ArtRow({ icon, tone, title, sub, children }: { icon: IconName; tone?: 'overdue'; title: string; sub: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <IconTile icon={icon} tone={tone ?? 'neutral'} size="sm" />
      <View style={styles.rowText}>
        <ArtText step="subhead" weight={500} numberOfLines={1}>
          {title}
        </ArtText>
        <ArtText step="caption" weight={500} tone="muted" numberOfLines={1}>
          {sub}
        </ArtText>
      </View>
      {children}
    </View>
  );
}

const STATUS_TASKS: { icon: IconName; name: 'oil' | 'brakes' | 'tires' | 'battery'; status: 'overdue' | 'soon' | 'ok'; used: `${number}%` }[] = [
  { icon: 'engineOil', name: 'oil', status: 'overdue', used: '100%' },
  { icon: 'brakePads', name: 'brakes', status: 'soon', used: '82%' },
  { icon: 'tireRotation', name: 'tires', status: 'ok', used: '45%' },
  { icon: 'battery', name: 'battery', status: 'ok', used: '30%' },
];

/** «Cómo te ayuda»: the 370Z's «Estado» on Inicio, four tasks and how much of each interval is used. */
export function StatusArt() {
  const { t } = useTranslation();
  // The 370Z's paint (Blanco perla) gives the bars their accent, as on Inicio.
  const accent = paintAccent(paintHex('white'));
  return (
    <View style={styles.status}>
      <View>
        <ArtText step="footnote" weight={500} tone="muted">
          {t('intro.art.vehicle')}
        </ArtText>
        <View style={styles.statusTitle}>
          <ArtText step="title2" weight={300}>
            {t('intro.art.status')}
          </ArtText>
          <View style={styles.summary}>
            <View style={styles.alertDot} />
            <ArtText step="caption" weight={500} tone="overdue">
              {t('intro.art.attention')}
            </ArtText>
          </View>
        </View>
      </View>
      <View style={styles.grid}>
        {[STATUS_TASKS.slice(0, 2), STATUS_TASKS.slice(2)].map((pair, r) => (
          <View key={r} style={styles.gridRow}>
            {pair.map((task) => {
              const over = task.status === 'overdue';
              return (
                <View key={task.name} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Icon name={task.icon} size="sm" fixed />
                    <ArtText step="caption" weight={500} tone={over ? 'overdue' : 'muted'}>
                      {t(`status.${task.status}`)}
                    </ArtText>
                  </View>
                  <ArtText step="footnote" weight={500} numberOfLines={1}>
                    {t(`intro.art.${task.name}`)}
                  </ArtText>
                  <View style={styles.track}>
                    <View style={[styles.bar, { width: task.used, backgroundColor: over ? undefined : accent }, over && styles.barOverdue]} />
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  vehicle: {
    justifyContent: 'flex-end',
    paddingHorizontal: theme.space[2],
  },
  vehicleImage: {
    width: '100%',
    aspectRatio: VEHICLE_RATIO,
  },
  // The PWA's floor shadow under the wheels.
  contact: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    bottom: 0,
    height: '18%',
    backgroundImage: contactShadow(theme.garage),
  },
  stack: {
    gap: theme.space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2.5],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.card,
  },
  rowText: {
    flex: 1,
    gap: theme.space[0.5],
  },
  price: {
    fontVariant: ['tabular-nums'],
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1.5],
  },
  alertDot: {
    width: theme.size.pagerDot.side,
    height: theme.size.pagerDot.side,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.overdue,
  },
  status: {
    gap: theme.space[3],
  },
  statusTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.space[2],
  },
  grid: {
    gap: theme.space[2],
  },
  gridRow: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  card: {
    flex: 1,
    gap: theme.space[2],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    height: theme.size.bar,
    overflow: 'hidden',
    borderRadius: theme.radius.xs,
    backgroundColor: theme.garage.track,
  },
  bar: {
    height: '100%',
    borderRadius: theme.radius.xs,
  },
  barOverdue: {
    backgroundColor: theme.colors.overdue,
  },
}));
