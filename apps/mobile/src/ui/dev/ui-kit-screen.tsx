import { router } from 'expo-router';
import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { ScopedTheme, StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatDate } from '@/lib/date';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/theme/preference';
import { typeScale, type TypeStep } from '@/theme/tokens';
import { Button, IconButton } from '@/ui/button';
import { Card, IconTile, ListRow, RowDivider, SectionHeader, type TileTone } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { DateField, MenuButton, SelectField, Toggle } from '@/ui/controls';
import { EmptyState, ErrorState, ListRowSkeleton, ProgressBar, SkeletonGroup, StatusBadge } from '@/ui/feedback';
import { MileageField, NumberField, Segmented, TextAreaField, TextField } from '@/ui/fields';
import { KEYBOARD_DISMISS } from '@/ui/form';
import { Icon, icons, type IconName } from '@/ui/icon';
import { Logo } from '@/ui/logo';
import { BODY_TYPES, Silhouette } from '@/ui/silhouette';
import { Text, TextFitContext, type TextTone } from '@/ui/text';
import { createTextFitStore, type TextFitStore } from '@/ui/text-fit';
import { confirm, notify } from '@/ui/toast';

const STEPS = Object.keys(typeScale) as TypeStep[];
const TONES: TextTone[] = ['ink', 'muted', 'subtle', 'radiant', 'ok', 'soon', 'overdue', 'unknown'];
const TILE_TONES: TileTone[] = ['neutral', 'radiant', 'ok', 'soon', 'overdue', 'unknown'];
const ICON_NAMES = Object.keys(icons) as IconName[];
const STATUSES = [
  { status: 'ok', value: 0.3 },
  { status: 'soon', value: 0.86 },
  { status: 'overdue', value: 1 },
  { status: 'unknown', value: 0.1 },
] as const;

/**
 * The UI kit's sample screen: every component, in the active theme. Seibi Dev
 * only: `src/app/ui-kit/index.tsx` requires this module in the development
 * variant alone, so no other bundle contains it.
 */
export function UIKitScreen() {
  const { t } = useTranslation();
  // Every Text on the screen reports whether its lines fit its box; `Checks` shows the result.
  const fit = useMemo(() => createTextFitStore(), []);
  return (
    <TextFitContext.Provider value={fit}>
      <ScrollView
        testID="kit-screen"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={KEYBOARD_DISMISS}
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Checks fit={fit} />
        <Text step="subhead" tone="muted">
          {t('uiKit.intro')}
        </Text>
        <TypeSection />
        <ButtonsSection />
        <ChipsSection />
        <CardsSection />
        <FieldsSection />
        <NativeSection />
        <StatesSection />
        <LoadingSection />
        <AlertsSection />
        <BrandSection />
        {/* Last: the icon grid is the longest section, so flows reach the others sooner. */}
        <IconsSection />
        {/* The fit check again, so a flow that ends down here reads it without the long way up. */}
        <FitCheck fit={fit} testID="kit-fit-check-end" />
      </ScrollView>
    </TextFitContext.Provider>
  );
}

/**
 * What the screen is drawn with, as text a flow can read: theme, Reduce
 * Motion, text size, and every Text whose drawn lines don't fit its box
 * (a cut label: Maestro reads a label's words, not its pixels).
 */
function Checks({ fit }: { fit: TextFitStore }) {
  const { t } = useTranslation();
  const { rt } = useUnistyles();
  const reduced = useReducedMotion();
  const preference = useThemePreference();
  return (
    <View style={styles.checks}>
      <Text testID="kit-theme-check" step="caption" family="mono" tone="muted">
        {t('uiKit.checks.theme', { theme: rt.themeName === 'dark' ? 'night' : 'light', source: preference === 'system' ? 'system' : 'preference' })}
      </Text>
      <Text testID="kit-motion-check" step="caption" family="mono" tone="muted">
        {t('uiKit.checks.motion', { motion: reduced ? 'reduced' : 'full' })}
      </Text>
      <Text testID="kit-text-check" step="caption" family="mono" tone="muted">
        {t('uiKit.checks.text', { scale: rt.fontScale.toFixed(2) })}
      </Text>
      <FitCheck fit={fit} testID="kit-fit-check" />
    </View>
  );
}

/** `fit: ok`, or how many Texts don't fit their box and the words they drew. */
function FitCheck({ fit, testID }: { fit: TextFitStore; testID: string }) {
  const { t } = useTranslation();
  const cut = useSyncExternalStore(fit.subscribe, fit.misfits);
  return (
    <Text testID={testID} step="caption" family="mono" tone="muted">
      {t('uiKit.checks.fit', {
        result: cut.length === 0 ? t('uiKit.checks.fitOk') : t('uiKit.checks.fitCut', { count: cut.length, texts: cut.join(' | ') }),
      })}
    </Text>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {/* The heading carries the testID: it is short, so a flow can scroll it fully into view. */}
      <Text testID={`kit-section-${id}`} step="title3" family="display" heading>
        {title}
      </Text>
      {children}
    </View>
  );
}

function TypeSection() {
  const { t } = useTranslation();
  return (
    <Section id="type" title={t('uiKit.sections.type')}>
      {STEPS.map((step) => (
        <Text key={step} step={step}>
          {t('uiKit.type.step', { step })}
        </Text>
      ))}
      <Text step="title1" family="display" heading>
        {t('uiKit.type.display')}
      </Text>
      <Text step="callout" family="mono">
        {t('uiKit.type.mono')}
      </Text>
      <View style={styles.wrap}>
        {TONES.map((tone) => (
          <Text key={tone} step="subhead" weight={600} tone={tone}>
            {t('uiKit.type.tone', { tone })}
          </Text>
        ))}
      </View>
    </Section>
  );
}

function IconsSection() {
  const { t } = useTranslation();
  return (
    <Section id="icons" title={t('uiKit.sections.icons')}>
      <Text step="footnote" tone="muted">
        {t('uiKit.icons.count', { count: ICON_NAMES.length })}
      </Text>
      <View style={styles.iconGrid}>
        {ICON_NAMES.map((name) => (
          <View key={name} style={styles.iconCell}>
            <Icon name={name} size="lg" />
            <Text step="caption" family="mono" tone="muted" align="center" numberOfLines={1} adjustsFontSizeToFit>
              {name}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function ButtonsSection() {
  const { t } = useTranslation();
  const [presses, setPresses] = useState(0);
  const press = () => setPresses((count) => count + 1);
  return (
    <Section id="buttons" title={t('uiKit.sections.buttons')}>
      <View style={styles.wrap}>
        <Button testID="kit-button-primary" label={t('uiKit.buttons.primary')} onPress={press} />
        <Button variant="secondary" label={t('uiKit.buttons.secondary')} onPress={press} />
        <Button variant="ghost" label={t('uiKit.buttons.ghost')} onPress={press} />
        <Button variant="danger" label={t('uiKit.buttons.danger')} onPress={press} />
        <Button variant="inverse" label={t('uiKit.buttons.inverse')} onPress={press} />
      </View>
      <View style={styles.wrap}>
        <Button size="sm" variant="secondary" label={t('uiKit.buttons.small')} onPress={press} />
        <Button size="md" variant="secondary" label={t('uiKit.buttons.medium')} onPress={press} />
        <Button size="lg" variant="secondary" label={t('uiKit.buttons.large')} onPress={press} />
      </View>
      <View style={styles.wrap}>
        <Button icon="add" label={t('uiKit.buttons.withIcon')} onPress={press} />
        <Button variant="secondary" trailingIcon="next" label={t('uiKit.buttons.trailing')} onPress={press} />
        <Button loading label={t('uiKit.buttons.loading')} onPress={press} />
        <Button disabled variant="secondary" label={t('uiKit.buttons.disabled')} onPress={press} />
      </View>
      <Button block size="lg" icon="service" label={t('uiKit.buttons.block')} onPress={press} />
      <View style={styles.wrap}>
        <IconButton icon="close" label={t('uiKit.buttons.close')} onPress={press} />
        <IconButton icon="edit" variant="secondary" label={t('uiKit.buttons.edit')} onPress={press} />
        <IconButton icon="add" variant="inverse" label={t('uiKit.buttons.add')} onPress={press} />
      </View>
      <Text testID="kit-button-presses" step="footnote" family="mono" tone="muted">
        {t('uiKit.buttons.presses', { count: presses })}
      </Text>
    </Section>
  );
}

function ChipsSection() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'soon' | 'overdue' | 'ok'>('all');
  const chips = [
    { value: 'all', count: 8 },
    { value: 'soon', count: 3 },
    { value: 'overdue', count: 1 },
    { value: 'ok', count: 4 },
  ] as const;
  return (
    <Section id="chips" title={t('uiKit.sections.chips')}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('uiKit.chips.label')} style={styles.wrap}>
        {chips.map((chip) => (
          <Chip
            key={chip.value}
            testID={`kit-chip-${chip.value}`}
            radio
            label={t(`uiKit.chips.${chip.value}`)}
            count={chip.count}
            selected={filter === chip.value}
            onPress={() => setFilter(chip.value)}
          />
        ))}
      </View>
      <View style={styles.wrap}>
        <Chip icon="vehicle" label={t('uiKit.sections.chips')} />
      </View>
      <Text testID="kit-chip-check" step="footnote" family="mono" tone="muted">
        {t('uiKit.chips.selected', { filter })}
      </Text>
    </Section>
  );
}

function CardsSection() {
  const { t } = useTranslation();
  const [row, setRow] = useState('');
  return (
    <Section id="cards" title={t('uiKit.sections.cards')}>
      <SectionHeader title={t('uiKit.cards.upcoming')} action={t('uiKit.cards.seeAll')} onAction={() => setRow(t('uiKit.cards.seeAll'))} />
      <Card>
        <ListRow
          testID="kit-row-oil"
          title={t('uiKit.cards.oil')}
          subtitle={t('uiKit.cards.oilDue')}
          leading={<IconTile icon="engineOil" tone="soon" />}
          trailing={<StatusBadge status="soon" />}
          onPress={() => setRow(t('uiKit.cards.oil'))}
        />
        <RowDivider />
        <ListRow
          title={t('uiKit.cards.brakes')}
          subtitle={t('uiKit.cards.brakesDue')}
          leading={<IconTile icon="brakePads" tone="overdue" />}
          trailing={<StatusBadge status="overdue" />}
          onPress={() => setRow(t('uiKit.cards.brakes'))}
        />
        <RowDivider />
        <ListRow
          title={t('uiKit.cards.battery')}
          subtitle={t('uiKit.cards.batteryDue')}
          leading={<IconTile icon="battery" tone="ok" />}
          trailing={<StatusBadge status="ok" />}
          onPress={() => setRow(t('uiKit.cards.battery'))}
        />
        <RowDivider />
        <ListRow
          title={t('uiKit.cards.alignment')}
          subtitle={t('uiKit.cards.alignmentDue')}
          leading={<IconTile icon="alignment" tone="unknown" />}
          trailing={<StatusBadge status="unknown" />}
          onPress={() => setRow(t('uiKit.cards.alignment'))}
        />
        <RowDivider />
        <ListRow
          title={t('uiKit.cards.odometer')}
          leading={<IconTile icon="mileage" tone="radiant" />}
          trailing={
            <Text step="body" family="mono">
              {t('uiKit.cards.odometerValue')}
            </Text>
          }
        />
      </Card>
      <Text testID="kit-row-check" step="footnote" family="mono" tone="muted">
        {t('uiKit.cards.rowPressed', { row: row || t('uiKit.cards.rowNone') })}
      </Text>
      <Text step="footnote" weight={600} tone="muted">
        {t('uiKit.cards.tiles')}
      </Text>
      <View style={styles.wrap}>
        {TILE_TONES.map((tone) => (
          <IconTile key={tone} icon="service" tone={tone} />
        ))}
        {TILE_TONES.map((tone) => (
          <IconTile key={`${tone}-sm`} icon="service" tone={tone} size="sm" />
        ))}
      </View>
    </Section>
  );
}

function FieldsSection() {
  const { t } = useTranslation();
  const [plate, setPlate] = useState('');
  const [cost, setCost] = useState('');
  const [mileage, setMileage] = useState<number | null>(45000);
  const [notes, setNotes] = useState('');
  return (
    <Section id="fields" title={t('uiKit.sections.fields')}>
      <TextField
        testID="kit-field-plate"
        label={t('uiKit.fields.plate')}
        placeholder={t('uiKit.fields.platePlaceholder')}
        hint={t('uiKit.fields.plateHint')}
        autoCapitalize="characters"
        value={plate}
        onChangeText={setPlate}
      />
      <TextField label={t('uiKit.fields.shop')} error={t('uiKit.fields.shopError')} value="" />
      <NumberField
        label={t('uiKit.fields.cost')}
        kind="decimal"
        placeholder={t('uiKit.fields.costPlaceholder')}
        suffix={t('uiKit.fields.costSuffix')}
        optional
        value={cost}
        onChangeText={setCost}
      />
      <MileageField
        testID="kit-field-mileage"
        label={t('uiKit.fields.mileage')}
        placeholder={t('uiKit.fields.mileagePlaceholder')}
        hint={t('uiKit.fields.mileageHint')}
        measure="km"
        value={mileage}
        onChange={setMileage}
      />
      <TextAreaField label={t('uiKit.fields.notes')} placeholder={t('uiKit.fields.notesPlaceholder')} optional value={notes} onChangeText={setNotes} />
      <Button testID="kit-open-form" variant="secondary" icon="edit" label={t('uiKit.fields.openForm')} onPress={() => router.push('/ui-kit/form')} />
    </Section>
  );
}

function NativeSection() {
  const { t } = useTranslation();
  const preference = useThemePreference();
  const [type, setType] = useState<'maintenance' | 'repair'>('maintenance');
  const [notifications, setNotifications] = useState(true);
  const [date, setDate] = useState(() => new Date(2026, 10, 12));
  const [action, setAction] = useState<string | null>(null);
  const actions = [
    { id: 'edit', title: t('uiKit.native.menuEdit'), icon: 'edit' as const },
    { id: 'archive', title: t('uiKit.native.menuArchive'), icon: 'archive' as const },
    { id: 'delete', title: t('uiKit.native.menuDelete'), icon: 'delete' as const, destructive: true },
  ];
  const typeLabel = t(`uiKit.native.${type}`);
  return (
    <Section id="native" title={t('uiKit.sections.native')}>
      <SelectField
        testID="kit-select"
        label={t('uiKit.native.type')}
        value={type}
        onChange={setType}
        options={[
          { value: 'maintenance', label: t('uiKit.native.maintenance') },
          { value: 'repair', label: t('uiKit.native.repair') },
        ]}
      />
      <Card>
        <Toggle
          testID="kit-toggle"
          label={t('uiKit.native.notifications')}
          description={t('uiKit.native.notificationsHint')}
          value={notifications}
          onChange={setNotifications}
        />
      </Card>
      <DateField testID="kit-date" label={t('uiKit.native.date')} value={date} onChange={setDate} />
      <View style={styles.menuRow}>
        <MenuButton testID="kit-menu" label={t('uiKit.native.menu')} actions={actions} onAction={(id) => setAction(actions.find((item) => item.id === id)?.title ?? id)} />
        <Text testID="kit-menu-check" step="footnote" family="mono" tone="muted" style={styles.flex}>
          {action ? t('uiKit.native.menuChosen', { action }) : t('uiKit.native.menuNone')}
        </Text>
      </View>
      <Segmented<ThemePreference>
        testID="kit-theme"
        label={t('theme.label')}
        value={preference}
        onChange={setThemePreference}
        options={[
          { value: 'system', label: t('theme.system') },
          { value: 'light', label: t('theme.light') },
          { value: 'night', label: t('theme.night') },
        ]}
      />
      <Text testID="kit-native-check" step="footnote" family="mono" tone="muted">
        {t('uiKit.native.values', { type: typeLabel, toggle: notifications ? t('uiKit.native.on') : t('uiKit.native.off'), date: formatDate(date) })}
      </Text>
    </Section>
  );
}

function StatesSection() {
  const { t } = useTranslation();
  const [retries, setRetries] = useState(0);
  return (
    <Section id="states" title={t('uiKit.sections.states')}>
      {STATUSES.map(({ status, value }) => (
        <View key={status} style={styles.statusRow}>
          <StatusBadge status={status} testID={`kit-badge-${status}`} />
          <View style={styles.flex}>
            <ProgressBar value={value} status={status} />
          </View>
        </View>
      ))}
      <Card>
        <EmptyState
          testID="kit-empty"
          icon="vehicle"
          title={t('uiKit.states.emptyTitle')}
          body={t('uiKit.states.emptyBody')}
          action={<Button icon="add" label={t('uiKit.states.emptyAction')} onPress={() => notify.success(t('uiKit.states.emptyPressed'))} />}
        />
      </Card>
      <Card>
        <ErrorState testID="kit-error" onRetry={() => setRetries((count) => count + 1)} />
      </Card>
      <Text testID="kit-retry-check" step="footnote" family="mono" tone="muted">
        {t('uiKit.states.retries', { count: retries })}
      </Text>
    </Section>
  );
}

/** The same card loaded and loading, measured: the skeleton takes the content's space. */
function LoadingSection() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [heights, setHeights] = useState<{ content?: number; loading?: number }>({});
  const measured = (value?: number) => (value === undefined ? t('uiKit.loading.unmeasured') : t('uiKit.loading.points', { value: Math.round(value) }));
  return (
    <Section id="loading" title={t('uiKit.sections.loading')}>
      <Button
        testID="kit-loading-toggle"
        variant="secondary"
        icon={loading ? 'check' : 'refresh'}
        label={loading ? t('uiKit.loading.toggleOff') : t('uiKit.loading.toggleOn')}
        onPress={() => setLoading((value) => !value)}
      />
      {/* Each state measures itself when it mounts (the keys make React remount the view), so the check compares the two heights. */}
      <Card>
        {loading ? (
          <View key="skeleton" testID="kit-skeleton" onLayout={(event) => setHeights((current) => ({ ...current, loading: event.nativeEvent.layout.height }))}>
            <SkeletonGroup>
              <ListRowSkeleton />
              <RowDivider />
              <ListRowSkeleton />
            </SkeletonGroup>
          </View>
        ) : (
          <View key="loaded" testID="kit-loaded" onLayout={(event) => setHeights((current) => ({ ...current, content: event.nativeEvent.layout.height }))}>
            <ListRow title={t('uiKit.cards.oil')} subtitle={t('uiKit.cards.oilDue')} leading={<IconTile icon="engineOil" tone="soon" />} />
            <RowDivider />
            <ListRow title={t('uiKit.cards.battery')} subtitle={t('uiKit.cards.batteryDue')} leading={<IconTile icon="battery" tone="ok" />} />
          </View>
        )}
      </Card>
      <Text testID="kit-loading-check" step="footnote" family="mono" tone="muted">
        {t('uiKit.loading.heights', { content: measured(heights.content), loading: measured(heights.loading) })}
      </Text>
    </Section>
  );
}

function AlertsSection() {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState<boolean | null>(null);
  return (
    <Section id="alerts" title={t('uiKit.sections.alerts')}>
      <View style={styles.wrap}>
        <Button testID="kit-toast-success" variant="secondary" icon="success" label={t('uiKit.alerts.success')} onPress={() => notify.success(t('uiKit.alerts.successToast'))} />
        <Button testID="kit-toast-error" variant="secondary" icon="alert" label={t('uiKit.alerts.error')} onPress={() => notify.error(t('uiKit.alerts.errorToast'))} />
      </View>
      <Button
        testID="kit-confirm"
        variant="danger"
        icon="delete"
        label={t('uiKit.alerts.confirm')}
        onPress={async () =>
          setAnswer(
            await confirm({
              title: t('uiKit.alerts.confirmTitle'),
              message: t('uiKit.alerts.confirmMessage'),
              confirmLabel: t('uiKit.alerts.confirmAction'),
              cancelLabel: t('uiKit.alerts.cancel'),
              destructive: true,
            }),
          )
        }
      />
      <Text testID="kit-confirm-check" step="footnote" family="mono" tone="muted">
        {answer === null ? t('uiKit.alerts.none') : answer ? t('uiKit.alerts.confirmed') : t('uiKit.alerts.cancelled')}
      </Text>
    </Section>
  );
}

function BrandSection() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  return (
    <Section id="brand" title={t('uiKit.sections.brand')}>
      <View style={styles.logos}>
        <Logo size="sm" testID="kit-logo" />
        <Logo size="md" />
        <Logo size="lg" />
      </View>
      <View style={styles.wrap}>
        <ScopedTheme name="light">
          <View style={styles.logoSurface}>
            <Logo size="md" surface="light" />
            <Text step="caption">{t('uiKit.brand.onLight')}</Text>
          </View>
        </ScopedTheme>
        <ScopedTheme name="dark">
          <View style={styles.logoSurface}>
            <Logo size="md" surface="dark" />
            <Text step="caption">{t('uiKit.brand.onDark')}</Text>
          </View>
        </ScopedTheme>
      </View>
      <View style={styles.wrap}>
        {BODY_TYPES.map((bodyType) => (
          <View key={bodyType} style={styles.silhouette}>
            <Silhouette bodyType={bodyType} width={theme.size.silhouette.sm} testID={`kit-silhouette-${bodyType}`} />
            <Text step="caption" tone="muted" align="center">
              {t(`vehicle.bodyTypes.${bodyType}`)}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    gap: theme.space[8],
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[4],
    paddingBottom: theme.space[16],
  },
  checks: {
    gap: theme.space[0.5],
  },
  section: {
    gap: theme.space[3],
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space[3],
  },
  flex: {
    flex: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: theme.space[2],
  },
  iconCell: {
    width: '25%',
    alignItems: 'center',
    gap: theme.space[1],
    paddingVertical: theme.space[2],
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space[3],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
  },
  logos: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.space[6],
  },
  logoSurface: {
    alignItems: 'center',
    gap: theme.space[2],
    padding: theme.space[4],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.card,
  },
  silhouette: {
    alignItems: 'center',
    gap: theme.space[1],
  },
}));
