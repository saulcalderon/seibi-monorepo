import { describe, expect, it } from 'vitest';

import { errorMessage, InputError } from '../errors';
import type { ServiceRecord, VehicleView } from '../garage/types';
import { taskMap, type MaintenanceTask } from '../task/catalog';
import { t } from '../test-i18n';

import { customItem, initialDraft, isDirty, itemField, serviceInputFromDraft, taskItem, type ServiceDraft } from './form';

// The Service form's rules, ported from the PWA's ServiceForm submit() and
// validateService (apps/app/src/forms/ServiceForm.tsx, lib/mutations.ts).

const TODAY = '2026-11-12';

const task = (code: string, name: string): MaintenanceTask => ({
  code,
  name,
  plainName: name,
  description: '',
  sortOrder: 0,
  generalDistanceKm: null,
  generalMonths: null,
});
const tasks = taskMap([task('engine_oil', 'Cambio de aceite'), task('oil_filter', 'Filtro de aceite')]);

const yaris = { id: 'v1', odometer: 52000, measure: 'km' } as VehicleView;

const saved: ServiceRecord = {
  id: 's1',
  type: 'repair',
  performedOn: '2026-10-01',
  shop: 'Taller Central',
  notes: null,
  totalCost: 85.5,
  invoicePath: null,
  readingId: 'r1',
  reading: 50100,
  items: [
    { id: 'a', taskCode: 'engine_oil', name: 'Cambio de aceite', cost: 60, partBrand: 'Mobil', partNumber: null },
    { id: 'b', taskCode: null, name: 'Bombillo', cost: 25.5, partBrand: null, partNumber: 'H4' },
  ],
};

function refusal(run: () => unknown): InputError {
  try {
    run();
  } catch (error) {
    if (error instanceof InputError) return error;
    throw error;
  }
  throw new Error('expected the draft to be refused');
}

function draft(patch: Partial<ServiceDraft> = {}): ServiceDraft {
  return { ...initialDraft({ vehicle: yaris, tasks, detailed: false, today: TODAY }), items: [taskItem('engine_oil', tasks)], ...patch };
}

describe('the draft a form opens with', () => {
  it('records today, maintenance and the current odometer, with a line per task it was opened for', () => {
    const d = initialDraft({ vehicle: yaris, taskCodes: ['engine_oil', 'not_a_task'], tasks, detailed: false, today: TODAY });
    expect(d).toMatchObject({ vehicleId: 'v1', type: 'maintenance', performedOn: TODAY, reading: 52000, perItemCost: false, totalCost: '' });
    expect(d.items.map((i) => [i.taskCode, i.name])).toEqual([['engine_oil', 'Cambio de aceite']]);
  });

  it('asks for costs per line when the Knowledge level is detailed', () => {
    expect(initialDraft({ vehicle: yaris, tasks, detailed: true, today: TODAY }).perItemCost).toBe(true);
  });

  it('edits the Service as saved, costs per line when it has them', () => {
    const d = initialDraft({ vehicle: yaris, service: saved, tasks, detailed: false, today: TODAY });
    expect(d).toMatchObject({ type: 'repair', performedOn: '2026-10-01', reading: 50100, perItemCost: true, totalCost: '85.5', shop: 'Taller Central', notes: '' });
    expect(d.items.map((i) => [i.name, i.cost, i.partBrand, i.partNumber])).toEqual([
      ['Cambio de aceite', '60', 'Mobil', ''],
      ['Bombillo', '25.5', '', 'H4'],
    ]);
  });
});

describe('unsaved changes', () => {
  it('are none when the draft is as it opened, whatever the line keys', () => {
    const a = initialDraft({ vehicle: yaris, service: saved, tasks, detailed: false, today: TODAY });
    const b = initialDraft({ vehicle: yaris, service: saved, tasks, detailed: false, today: TODAY });
    expect(isDirty(a, b)).toBe(false);
  });

  it('are there after any edit', () => {
    const a = draft();
    expect(isDirty({ ...a, shop: 'x' }, a)).toBe(true);
    expect(isDirty({ ...a, items: [...a.items, customItem()] }, a)).toBe(true);
  });
});

describe('saving a draft', () => {
  it('asks for the Mileage of that day first', () => {
    const error = refusal(() => serviceInputFromDraft(draft({ reading: null, items: [] }), { today: TODAY }));
    expect([error.field, error.code]).toEqual(['reading', 'service_reading_required']);
    expect(errorMessage(error, t)).toBe('Escribe el kilometraje de ese día.');
  });

  it('accepts any reading with a Service, below the current odometer too (backfill)', () => {
    expect(serviceInputFromDraft(draft({ reading: 1000 }), { today: TODAY }).reading).toBe(1000);
  });

  it('needs at least one line with a name; a nameless line is left out', () => {
    const error = refusal(() => serviceInputFromDraft(draft({ items: [customItem()] }), { today: TODAY }));
    expect([error.field, error.code]).toEqual(['items', 'service_items_required']);
    const input = serviceInputFromDraft(draft({ items: [taskItem('engine_oil', tasks), customItem()] }), { today: TODAY });
    expect(input.items).toHaveLength(1);
  });

  it('refuses a future date: that is an Appointment', () => {
    const error = refusal(() => serviceInputFromDraft(draft({ performedOn: '2026-11-13' }), { today: TODAY }));
    expect([error.field, error.code]).toEqual(['performedOn', 'service_date_future']);
  });

  it('adds up costs per line into the total', () => {
    const oil = { ...taskItem('engine_oil', tasks), cost: '45.50', partBrand: 'Mobil', partNumber: '1R-0739' };
    const bulb = { ...customItem(), name: 'Bombillo', cost: '1,200' };
    const input = serviceInputFromDraft(draft({ perItemCost: true, items: [oil, bulb], totalCost: '9' }), { today: TODAY });
    expect(input.totalCost).toBe(1245.5);
    expect(input.items.map((i) => [i.name, i.cost, i.partBrand, i.partNumber])).toEqual([
      ['Cambio de aceite', 45.5, 'Mobil', '1R-0739'],
      ['Bombillo', 1200, '', ''],
    ]);
  });

  it('saves no total when no line has a cost, and no line costs with one total', () => {
    expect(serviceInputFromDraft(draft({ perItemCost: true }), { today: TODAY }).totalCost).toBeNull();
    const oil = { ...taskItem('engine_oil', tasks), cost: '45' };
    const input = serviceInputFromDraft(draft({ items: [oil], totalCost: '80' }), { today: TODAY });
    expect(input.totalCost).toBe(80);
    expect(input.items[0].cost).toBeNull();
  });

  it('points at the line whose cost is not a number', () => {
    const oil = { ...taskItem('engine_oil', tasks), cost: '4.5.0' };
    const error = refusal(() => serviceInputFromDraft(draft({ perItemCost: true, items: [oil] }), { today: TODAY }));
    expect([error.field, error.code]).toEqual([itemField(oil.key, 'cost'), 'cost_invalid']);
  });

  it('refuses a total that is not a number', () => {
    const error = refusal(() => serviceInputFromDraft(draft({ totalCost: '1..2' }), { today: TODAY }));
    expect([error.field, error.code]).toEqual(['totalCost', 'cost_invalid']);
  });

  it('keeps the ids it edits', () => {
    const input = serviceInputFromDraft(draft(), { serviceId: 's1', readingId: 'r1', today: TODAY });
    expect(input).toMatchObject({ serviceId: 's1', readingId: 'r1', appointmentId: null, vehicleId: 'v1' });
  });
});
