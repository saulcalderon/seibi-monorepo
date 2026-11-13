// The Service form's draft: what the person has typed, as text, before it
// becomes a ServiceInput. Ported from the PWA's ServiceForm
// (apps/app/src/forms/ServiceForm.tsx): the same defaults, the same rules
// (`validateService`), the same cleaning (lines with no name are dropped,
// per-line costs add up to the total). Zod checks the draft at the form's
// boundary; every failure is an InputError with the field it belongs to.
import { z } from 'zod';

import { parseNumber } from '@/lib/number';

import { InputError, type InputCode } from '../errors';
import type { ServiceRecord, ServiceType, VehicleView } from '../garage/types';
import type { MaintenanceTask } from '../task/catalog';

import { validateService, type ServiceInput } from './rules';

/** One «¿Qué se hizo?» line: a Maintenance task, or a named part or job of the person's own. */
export type ItemDraft = {
  /** Stable while the form is open, for React keys and field errors. */
  key: string;
  taskCode: string | null;
  name: string;
  cost: string;
  partBrand: string;
  partNumber: string;
};

export type ServiceDraft = {
  vehicleId: string;
  type: ServiceType;
  performedOn: string;
  /** The Service's Mileage reading, as MileageField keeps it. */
  reading: number | null;
  items: ItemDraft[];
  /** Costs per line (their sum is the total) or one total for the Service. */
  perItemCost: boolean;
  totalCost: string;
  shop: string;
  notes: string;
};

/** The field a per-line error belongs to. */
export function itemField(key: string, part: 'cost' | 'name') {
  return `item.${key}.${part}`;
}

let seq = 0;
const nextKey = () => `i${++seq}`;

export function taskItem(code: string, tasks: ReadonlyMap<string, MaintenanceTask>): ItemDraft {
  return { key: nextKey(), taskCode: code, name: tasks.get(code)?.name ?? code, cost: '', partBrand: '', partNumber: '' };
}

export function customItem(): ItemDraft {
  return { key: nextKey(), taskCode: null, name: '', cost: '', partBrand: '', partNumber: '' };
}

/**
 * The draft a form opens with. Editing: the Service as saved. Recording:
 * today, maintenance, the Vehicle's current odometer, and a line for each
 * task the form was opened for. Costs go per line when the Service already
 * has them, or when the Knowledge level asks for detail.
 */
export function initialDraft({
  vehicle,
  service,
  taskCodes = [],
  tasks,
  detailed,
  today,
}: {
  vehicle: VehicleView;
  service?: ServiceRecord;
  taskCodes?: readonly string[];
  tasks: ReadonlyMap<string, MaintenanceTask>;
  detailed: boolean;
  today: string;
}): ServiceDraft {
  if (service) {
    return {
      vehicleId: vehicle.id,
      type: service.type,
      performedOn: service.performedOn,
      reading: service.reading,
      items: service.items.map((i) => ({
        key: nextKey(),
        taskCode: i.taskCode,
        name: i.name,
        cost: i.cost != null ? String(i.cost) : '',
        partBrand: i.partBrand ?? '',
        partNumber: i.partNumber ?? '',
      })),
      perItemCost: service.items.some((i) => i.cost != null) || detailed,
      totalCost: service.totalCost != null ? String(service.totalCost) : '',
      shop: service.shop ?? '',
      notes: service.notes ?? '',
    };
  }
  return {
    vehicleId: vehicle.id,
    type: 'maintenance',
    performedOn: today,
    reading: vehicle.odometer,
    items: taskCodes.filter((code) => tasks.has(code)).map((code) => taskItem(code, tasks)),
    perItemCost: detailed,
    totalCost: '',
    shop: '',
    notes: '',
  };
}

/** What the draft would save, without the keys: two drafts that save the same thing are equal. */
function comparable(draft: ServiceDraft) {
  return JSON.stringify({ ...draft, items: draft.items.map(({ key: _key, ...rest }) => rest) });
}

/** Whether the person changed anything since the form opened (closing it then asks first). */
export function isDirty(draft: ServiceDraft, initial: ServiceDraft) {
  return comparable(draft) !== comparable(initial);
}

/** The sum of the per-line costs that read as numbers. */
export function itemsTotal(items: readonly ItemDraft[]) {
  return items.reduce((sum, i) => sum + (parseNumber(i.cost) ?? 0), 0);
}

/** Empty, or a number of zero or more. */
const costText = (text: string) => {
  if (!text.trim()) return true;
  const n = parseNumber(text);
  return n !== null && n >= 0;
};

const fail = (ctx: z.RefinementCtx, field: string, code: InputCode) =>
  ctx.addIssue({ code: 'custom', path: field.split('.'), message: code });

const draftSchema = z
  .object({
    vehicleId: z.string().min(1),
    type: z.enum(['maintenance', 'repair']),
    performedOn: z.string(),
    reading: z.number().nullable(),
    items: z.array(
      z.object({
        key: z.string(),
        taskCode: z.string().nullable(),
        name: z.string(),
        cost: z.string(),
        partBrand: z.string(),
        partNumber: z.string(),
      }),
    ),
    perItemCost: z.boolean(),
    totalCost: z.string(),
    shop: z.string(),
    notes: z.string(),
  })
  .superRefine((draft, ctx) => {
    // In the PWA's order: the reading first, then the costs.
    if (draft.reading === null) fail(ctx, 'reading', 'service_reading_required');
    if (draft.perItemCost) {
      for (const item of draft.items) {
        if (!costText(item.cost)) fail(ctx, itemField(item.key, 'cost'), 'cost_invalid');
      }
    } else if (!costText(draft.totalCost)) {
      fail(ctx, 'totalCost', 'cost_invalid');
    }
  });

/**
 * Turns a draft into what `useSaveService` writes, or throws the first
 * InputError: the field and the es.json code (`errors.<code>`). Lines with
 * no name are left out. With costs per line, the total is their sum (none
 * when it is zero); otherwise each line has no cost.
 */
export function serviceInputFromDraft(
  draft: ServiceDraft,
  { serviceId, readingId, appointmentId, today }: { serviceId?: string; readingId?: string; appointmentId?: string | null; today: string },
): ServiceInput {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new InputError(issue.path.join('.'), issue.message as InputCode);
  }
  const d = parsed.data;
  const items = d.items
    .filter((i) => i.name.trim().length > 0)
    .map((i) => ({
      taskCode: i.taskCode,
      name: i.name,
      cost: d.perItemCost ? parseNumber(i.cost) : null,
      partBrand: i.partBrand,
      partNumber: i.partNumber,
    }));
  const sum = itemsTotal(d.items.filter((i) => i.name.trim().length > 0));
  const input: ServiceInput = {
    vehicleId: d.vehicleId,
    serviceId,
    readingId,
    type: d.type,
    performedOn: d.performedOn,
    reading: d.reading ?? 0,
    shop: d.shop,
    notes: d.notes,
    totalCost: d.perItemCost ? (sum > 0 ? sum : null) : parseNumber(d.totalCost),
    items,
    appointmentId: appointmentId ?? null,
  };
  validateService(input, today);
  return input;
}
