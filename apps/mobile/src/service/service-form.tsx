import { useNavigation, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { errorMessage, InputError } from '@/data/errors';
import type { ServiceRecord, ServiceType, VehicleView } from '@/data/garage/types';
import { useGarage } from '@/data/garage/use-garage';
import { useActiveVehicle } from '@/data/preferences/store';
import { useProfile } from '@/data/profile/queries';
import {
  customItem,
  initialDraft,
  isDirty,
  itemField,
  itemsTotal,
  serviceInputFromDraft,
  taskItem,
  type ItemDraft,
  type ServiceDraft,
} from '@/data/service/form';
import { useSaveService, useWithdrawService } from '@/data/service/mutations';
import { orderedTaskCodes, taskMap, type MaintenanceTask } from '@/data/task/catalog';
import { formatDistance, formatUsd, todayIso, vehicleName } from '@/lib/format';
import { knowledgeProfile, taskLabel, type KnowledgeProfile } from '@/lib/knowledge';
import { Button, IconButton } from '@/ui/button';
import { Card, IconTile } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { DateField, SelectField } from '@/ui/controls';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { Field, MileageField, NumberField, Segmented, TextAreaField, TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { taskIcon } from '@/ui/task-icon';
import { Text } from '@/ui/text';
import { confirm, notify } from '@/ui/toast';

/** How many task chips show before «Ver todas las tareas» (the PWA's 8). */
const FIRST_TASKS = 8;

export interface ServiceFormProps {
  /** The Vehicle to record on (S6's Vehicle detail); else the active Vehicle. */
  vehicleId?: string;
  /** A Service to edit; its Vehicle comes with it. */
  serviceId?: string;
  /** Maintenance tasks to start with, one line each (a Reminder's «Ya lo hice»). */
  taskCodes?: string[];
}

/**
 * Record or edit a Service (S7), the content of the `record-service` form
 * sheet. Ported from the PWA's ServiceForm without the invoice photo (S12):
 * the Vehicle, the Type, what was done (Maintenance tasks as chips, plus
 * lines of the person's own), the date and the Mileage of that day, the
 * cost (one total or per line), the Shop and notes. Editing also offers to
 * withdraw the Service. Closing with unsaved changes asks first.
 */
export function ServiceForm({ vehicleId, serviceId, taskCodes }: ServiceFormProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const garage = useGarage();
  const profile = useProfile();
  const { active } = useActiveVehicle(garage.vehicles);

  if (garage.isLoading || profile.isPending) {
    return (
      <SheetMessage testID="service-form-loading">
        <SkeletonGroup>
          <TextSkeleton step="title3" width="55%" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
        </SkeletonGroup>
      </SheetMessage>
    );
  }
  if (garage.isError) {
    return (
      <SheetMessage testID="service-form-error">
        <ErrorState onRetry={garage.refetch} />
      </SheetMessage>
    );
  }

  const found = serviceId ? findService(garage.vehicles, serviceId) : null;
  if (serviceId && !found) {
    return (
      <SheetMessage testID="service-form-missing" onClose={() => router.back()}>
        <EmptyState icon="service" title={t('serviceForm.missing.title')} body={t('serviceForm.missing.body')} />
      </SheetMessage>
    );
  }
  const vehicle = found?.vehicle ?? garage.vehicles.find((v) => v.id === vehicleId) ?? active;
  if (!vehicle) {
    return (
      <SheetMessage testID="service-form-no-vehicles" onClose={() => router.back()}>
        <EmptyState icon="vehicle" title={t('serviceForm.noVehicles.title')} body={t('serviceForm.noVehicles.body')} />
      </SheetMessage>
    );
  }
  return (
    <ServiceFormBody
      vehicles={garage.vehicles}
      vehicle={vehicle}
      service={found?.service}
      taskCodes={taskCodes}
      tasks={garage.tasks}
      k={knowledgeProfile(profile.data?.knowledgeLevel)}
    />
  );
}

function findService(vehicles: readonly VehicleView[], id: string) {
  for (const vehicle of vehicles) {
    const service = vehicle.services.find((s) => s.id === id);
    if (service) return { vehicle, service };
  }
  return null;
}

/** Which part of the form an error's field sits in, to scroll it into view. */
function sectionOf(field: string) {
  if (field === 'items' || field.startsWith('item.')) return 'items';
  if (field === 'reading' || field === 'performedOn') return 'when';
  if (field === 'totalCost') return 'cost';
  return 'form';
}

type FormError = { field: string; message: string };

function ServiceFormBody({
  vehicles,
  vehicle: startVehicle,
  service,
  taskCodes,
  tasks,
  k,
}: {
  vehicles: VehicleView[];
  vehicle: VehicleView;
  service?: ServiceRecord;
  taskCodes?: string[];
  tasks: MaintenanceTask[];
  k: KnowledgeProfile;
}) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const navigation = useNavigation();
  const save = useSaveService();
  const withdraw = useWithdrawService();
  const byCode = useMemo(() => taskMap(tasks), [tasks]);

  const editing = service ?? null;
  const [initial] = useState(() =>
    initialDraft({ vehicle: startVehicle, service, taskCodes, tasks: byCode, detailed: k.detailed, today: todayIso() }),
  );
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const [error, setError] = useState<FormError | null>(null);
  const [helpFor, setHelpFor] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState(false);
  /** Set once saved or withdrawn: the sheet closes without asking. */
  const [leaving, setLeaving] = useState(false);

  const scroll = useRef<ScrollViewInstance>(null);
  const sections = useRef<Record<string, number>>({});

  const vehicle = vehicles.find((v) => v.id === draft.vehicleId) ?? startVehicle;
  const measure = vehicle.measure;
  const patch = (next: Partial<ServiceDraft>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...next }));
  };
  const patchItem = (key: string, next: Partial<ItemDraft>) => {
    setError(null);
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.key === key ? { ...i, ...next } : i)) }));
  };

  // Unsaved changes are never lost to a swipe, Back or «Cerrar» without asking.
  usePreventRemove(isDirty(draft, initial) && !leaving, ({ data }) => {
    void confirm({
      title: t('serviceForm.discard.title'),
      message: t('serviceForm.discard.body'),
      confirmLabel: t('serviceForm.discard.confirm'),
      cancelLabel: t('serviceForm.discard.cancel'),
      destructive: true,
    }).then((discard) => {
      if (discard) navigation.dispatch(data.action);
    });
  });
  useEffect(() => {
    if (leaving) router.back();
  }, [leaving, router]);

  // Tasks to suggest: what this Vehicle needs first, then the common ones, then the catalog.
  const dueStatus = new Map(vehicle.reminders.filter((r) => r.status === 'overdue' || r.status === 'soon').map((r) => [r.taskCode, r.status]));
  const suggested = orderedTaskCodes([...dueStatus.keys()], tasks);
  const shown = allTasks ? suggested : suggested.slice(0, FIRST_TASKS);
  const selected = new Set(draft.items.map((i) => i.taskCode).filter(Boolean));

  const toggleTask = (code: string) =>
    patch({
      items: selected.has(code) ? draft.items.filter((i) => i.taskCode !== code) : [...draft.items, taskItem(code, byCode)],
    });

  const pickVehicle = (id: string) => {
    const next = vehicles.find((v) => v.id === id);
    if (!next) return;
    // The reading follows the Vehicle until the person types one of their own.
    patch({ vehicleId: id, reading: draft.reading === vehicle.odometer ? next.odometer : draft.reading });
  };

  const show = (e: unknown) => {
    const field = e instanceof InputError ? e.field : 'form';
    setError({ field, message: errorMessage(e, t) });
    const y = sections.current[sectionOf(field)];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - theme.space[4]), animated: true });
  };

  const submit = async () => {
    setError(null);
    try {
      const input = serviceInputFromDraft(draft, { serviceId: editing?.id, readingId: editing?.readingId, today: todayIso() });
      await save.mutateAsync(input);
      notify.success(t(editing ? 'serviceForm.updated' : 'serviceForm.saved'));
      setLeaving(true);
    } catch (e) {
      show(e);
    }
  };

  const withdrawService = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: t('serviceForm.withdraw.title'),
      message: t('serviceForm.withdraw.body'),
      confirmLabel: t('serviceForm.withdraw.confirm'),
      cancelLabel: t('serviceForm.withdraw.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await withdraw.mutateAsync(editing.id);
      notify.success(t('serviceForm.withdraw.done'));
      setLeaving(true);
    } catch (e) {
      show(e);
    }
  };

  const fieldError = (field: string) => (error?.field === field ? error.message : null);
  const sum = itemsTotal(draft.items);
  const busy = save.isPending || withdraw.isPending;

  return (
    <FormLayout
      testID="service-form"
      scrollRef={scroll}
      footer={
        <>
          {error?.field === 'form' ? (
            <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text testID="service-form-error" step="subhead" weight={500} tone="overdue">
                {error.message}
              </Text>
            </View>
          ) : null}
          <Button
            testID="service-save"
            block
            size="lg"
            label={t(editing ? 'serviceForm.saveEdit' : 'serviceForm.saveNew')}
            loading={save.isPending}
            disabled={withdraw.isPending}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <Text testID="service-form-title" step="title3" family="display" heading>
            {t(editing ? 'serviceForm.titleEdit' : 'serviceForm.titleNew')}
          </Text>
          {editing ? null : (
            <Text step="subhead" tone="muted">
              {t('serviceForm.description')}
            </Text>
          )}
        </View>
        <IconButton testID="service-close" icon="close" label={t('serviceForm.close')} onPress={() => router.back()} />
      </View>

      {vehicles.length > 1 && !editing ? (
        <SelectField
          testID="service-vehicle"
          label={t('serviceForm.vehicle')}
          value={draft.vehicleId}
          onChange={pickVehicle}
          options={vehicles.map((v) => ({ value: v.id, label: `${vehicleName(v)} ${v.year}` }))}
        />
      ) : null}

      <Segmented<ServiceType>
        testID="service-type"
        label={t('serviceForm.type.label')}
        value={draft.type}
        onChange={(type) => patch({ type })}
        options={[
          { value: 'maintenance', label: t('serviceForm.type.maintenance') },
          { value: 'repair', label: t('serviceForm.type.repair') },
        ]}
      />

      <View onLayout={(event: LayoutChangeEvent) => (sections.current.items = event.nativeEvent.layout.y)} style={styles.section}>
        <Field label={t('serviceForm.whatWasDone')} error={fieldError('items')} hint={k.explain ? t('serviceForm.whatWasDoneHint') : undefined}>
          <View style={styles.chips}>
            {shown.map((code) => {
              const label = taskLabel(byCode.get(code), code, k);
              const due = dueStatus.get(code);
              const on = selected.has(code);
              return (
                <Chip
                  key={code}
                  testID={`service-task-${code}`}
                  label={label}
                  icon={taskIcon(code)}
                  selected={on}
                  dot={due === 'overdue' || due === 'soon' ? due : undefined}
                  accessibilityLabel={due && !on ? t('serviceForm.taskPending', { task: label }) : label}
                  onPress={() => toggleTask(code)}
                />
              );
            })}
          </View>
          {suggested.length > FIRST_TASKS ? (
            <Button
              testID="service-all-tasks"
              variant="ghost"
              size="sm"
              label={t(allTasks ? 'serviceForm.showFewerTasks' : 'serviceForm.showAllTasks')}
              trailingIcon={allTasks ? undefined : 'expand'}
              onPress={() => setAllTasks((v) => !v)}
            />
          ) : null}
        </Field>

        {draft.items.length > 0 ? (
          <View style={styles.items}>
            <View style={styles.itemsHeader}>
              <Text step="footnote" weight={600} tone="muted" style={styles.itemsCount}>
                {t('serviceForm.items', { count: draft.items.length })}
              </Text>
              <Button
                testID="service-per-item-cost"
                variant="ghost"
                size="sm"
                label={t(draft.perItemCost ? 'serviceForm.totalOnly' : 'serviceForm.perItemCost')}
                onPress={() => patch({ perItemCost: !draft.perItemCost })}
              />
            </View>
            {draft.items.map((item, index) => (
              <ItemCard
                key={item.key}
                index={index}
                item={item}
                task={item.taskCode ? byCode.get(item.taskCode) : undefined}
                k={k}
                perItemCost={draft.perItemCost}
                helpOpen={helpFor === item.key}
                costError={fieldError(itemField(item.key, 'cost'))}
                onHelp={() => setHelpFor((open) => (open === item.key ? null : item.key))}
                onChange={(next) => patchItem(item.key, next)}
                onRemove={() => patch({ items: draft.items.filter((i) => i.key !== item.key) })}
              />
            ))}
          </View>
        ) : null}

        <Button
          testID="service-add-item"
          variant="secondary"
          icon="add"
          block
          label={t('serviceForm.addItem')}
          onPress={() => patch({ items: [...draft.items, customItem()] })}
        />
      </View>

      <View onLayout={(event: LayoutChangeEvent) => (sections.current.when = event.nativeEvent.layout.y)} style={styles.section}>
        <DateField
          testID="service-date"
          label={t('serviceForm.date')}
          value={dayToDate(draft.performedOn)}
          maximumDate={new Date()}
          error={fieldError('performedOn')}
          onChange={(date) => patch({ performedOn: todayIso(date) })}
        />
        <MileageField
          testID="service-mileage"
          label={t('serviceForm.mileage')}
          measure={measure}
          value={draft.reading}
          error={fieldError('reading')}
          hint={
            vehicle.odometer != null
              ? t('serviceForm.mileageHintToday', { current: formatDistance(vehicle.odometer, measure) })
              : t('serviceForm.mileageHint')
          }
          onChange={(reading) => patch({ reading })}
        />
      </View>

      <View onLayout={(event: LayoutChangeEvent) => (sections.current.cost = event.nativeEvent.layout.y)} style={styles.section}>
        {!draft.perItemCost ? (
          <NumberField
            testID="service-total-cost"
            kind="decimal"
            label={t('serviceForm.totalCost')}
            optional
            suffix={t('serviceForm.totalCostSuffix')}
            value={draft.totalCost}
            error={fieldError('totalCost')}
            onChangeText={(totalCost) => patch({ totalCost })}
          />
        ) : sum > 0 ? (
          <Text testID="service-items-total" step="body" family="mono" style={styles.total}>
            {t('serviceForm.itemsTotal', { total: formatUsd(sum, true) })}
          </Text>
        ) : null}
        <TextField
          testID="service-shop"
          label={t('serviceForm.shop')}
          optional
          placeholder={t('serviceForm.shopPlaceholder')}
          value={draft.shop}
          onChangeText={(shop) => patch({ shop })}
        />
        <TextAreaField
          testID="service-notes"
          label={t('serviceForm.notes')}
          optional
          placeholder={t('serviceForm.notesPlaceholder')}
          value={draft.notes}
          onChangeText={(notes) => patch({ notes })}
        />
      </View>

      {editing ? (
        <Button
          testID="service-withdraw"
          variant="ghost"
          icon="archive"
          label={t('serviceForm.withdraw.action')}
          loading={withdraw.isPending}
          disabled={busy && !withdraw.isPending}
          onPress={() => void withdrawService()}
        />
      ) : null}
    </FormLayout>
  );
}

function ItemCard({
  index,
  item,
  task,
  k,
  perItemCost,
  helpOpen,
  costError,
  onHelp,
  onChange,
  onRemove,
}: {
  index: number;
  item: ItemDraft;
  task: MaintenanceTask | undefined;
  k: KnowledgeProfile;
  perItemCost: boolean;
  helpOpen: boolean;
  costError: string | null;
  onHelp: () => void;
  onChange: (next: Partial<ItemDraft>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const id = `service-item-${index}`;
  const title = item.taskCode ? taskLabel(task, item.taskCode, k) : t('serviceForm.item.custom');
  const spokenName = item.taskCode ? title : item.name.trim() || title;
  return (
    <Card testID={id} style={styles.item}>
      <View style={styles.itemHead}>
        <IconTile icon={taskIcon(item.taskCode)} size="sm" />
        <Text step="body" weight={600} style={styles.itemTitle}>
          {title}
        </Text>
        {k.explain && task ? (
          <IconButton testID={`${id}-help`} icon="help" label={t('serviceForm.item.help', { name: task.plainName })} onPress={onHelp} />
        ) : null}
        <IconButton testID={`${id}-remove`} icon="delete" label={t('serviceForm.item.remove', { name: spokenName })} onPress={onRemove} />
      </View>
      {helpOpen && task ? (
        <Text step="footnote" tone="muted" style={styles.help}>
          {task.description}
        </Text>
      ) : null}
      {item.taskCode ? null : (
        <TextField
          testID={`${id}-name`}
          label={t('serviceForm.item.name')}
          placeholder={t('serviceForm.item.namePlaceholder')}
          value={item.name}
          onChangeText={(name) => onChange({ name })}
        />
      )}
      {perItemCost ? (
        <NumberField
          testID={`${id}-cost`}
          kind="decimal"
          label={t('serviceForm.item.cost')}
          suffix={t('serviceForm.item.costSuffix')}
          optional
          value={item.cost}
          error={costError}
          onChangeText={(cost) => onChange({ cost })}
        />
      ) : null}
      {k.detailed ? (
        <>
          <TextField
            testID={`${id}-brand`}
            label={t('serviceForm.item.partBrand')}
            optional
            value={item.partBrand}
            onChangeText={(partBrand) => onChange({ partBrand })}
          />
          <TextField
            testID={`${id}-number`}
            label={t('serviceForm.item.partNumber')}
            optional
            autoCapitalize="characters"
            value={item.partNumber}
            onChangeText={(partNumber) => onChange({ partNumber })}
          />
        </>
      ) : null}
    </Card>
  );
}

/** A loading, missing or error state in the sheet, with a way to close it. */
function SheetMessage({ children, onClose, testID }: { children: ReactNode; onClose?: () => void; testID: string }) {
  const { t } = useTranslation();
  return (
    <View testID={testID} style={styles.message}>
      {children}
      {onClose ? <Button testID={`${testID}-close`} variant="secondary" block label={t('serviceForm.close')} onPress={onClose} /> : null}
    </View>
  );
}

function dayToDate(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
    paddingTop: theme.space[4],
  },
  title: {
    flex: 1,
    gap: theme.space[1],
  },
  section: {
    gap: theme.space[4],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
  items: {
    gap: theme.space[2.5],
  },
  itemsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: theme.space[2],
  },
  itemsCount: {
    paddingHorizontal: theme.space[1],
  },
  item: {
    gap: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.xl,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2.5],
  },
  itemTitle: {
    flex: 1,
  },
  help: {
    padding: theme.space[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface2,
  },
  total: {
    paddingHorizontal: theme.space[1],
  },
  formError: {
    padding: theme.space[3],
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.overdueSoft,
  },
  message: {
    gap: theme.space[4],
    padding: theme.space[5],
    paddingTop: theme.space[8],
  },
}));
