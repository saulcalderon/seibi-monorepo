import type { Reminder } from '@seibi/maintenance-engine/reminders';
import { describe, expect, it } from 'vitest';

import type { EstimateResult } from '@/data/estimate/schemas';
import storedEstimate from '@/data/fixtures/estimates.result.not-found.json';
import { estimateResult } from '@/data/estimate/schemas';

import type { Estimate } from '@/data/estimate/queries';
import { t } from '@/data/test-i18n';

import { canAsk, confidenceBars, estimatePlace, estimateRequest, estimateTitle, INITIAL_MODE, modeOptions, pastQueries, pastQuerySubtitle, priceRows, suggestedTasks, totals, waitingStep } from './estimates-logic';

const reminder = (taskCode: string, status: Reminder['status']) => ({ taskCode, status });

const CATALOG = ['engine_oil', 'oil_filter', 'brake_pads_front', 'battery', 'tires', 'wheel_alignment', 'ac_service', 'coolant', 'spark_plugs', 'timing_belt', 'cabin_filter'];

describe('suggestedTasks', () => {
  it('puts the overdue and «Por vencer» tasks first with their status, then the popular ones, eight at most', () => {
    const result = suggestedTasks([reminder('timing_belt', 'overdue'), reminder('battery', 'soon'), reminder('cabin_filter', 'ok')], CATALOG);
    expect(result).toEqual([
      { code: 'timing_belt', due: 'overdue' },
      { code: 'battery', due: 'soon' },
      { code: 'engine_oil', due: null },
      { code: 'brake_pads_front', due: null },
      { code: 'tires', due: null },
      { code: 'wheel_alignment', due: null },
      { code: 'ac_service', due: null },
      { code: 'coolant', due: null },
    ]);
  });

  it('leaves out codes the catalog does not have', () => {
    expect(suggestedTasks([reminder('mystery', 'overdue')], ['engine_oil', 'battery'])).toEqual([
      { code: 'engine_oil', due: null },
      { code: 'battery', due: null },
    ]);
  });
});

describe('canAsk', () => {
  it('needs three characters once the spaces at the ends are gone, as the Edge Function', () => {
    expect(canAsk('alternador')).toBe(true);
    expect(canAsk('abc')).toBe(true);
    expect(canAsk('  ab  ')).toBe(false);
    expect(canAsk('')).toBe(false);
  });
});

describe('estimateRequest', () => {
  it('sends a task by its code alone', () => {
    expect(estimateRequest('v1', { taskCode: 'battery' })).toEqual({ vehicleId: 'v1', taskCode: 'battery' });
  });

  it('sends what was typed without the spaces at its ends', () => {
    expect(estimateRequest('v1', { query: '  cambio de alternador ' })).toEqual({ vehicleId: 'v1', query: 'cambio de alternador' });
  });
});

const found: EstimateResult = {
  ...estimateResult.parse(storedEstimate.row.result),
  found: true,
  parts_economy: { min: 8, max: 14.6 },
  parts_oem: null,
  labor: { min: 10, max: 10.2 },
  total_independent: { min: 25, max: 1250 },
  total_dealership: null,
  confidence: 'medium',
};

describe('priceRows', () => {
  it('lists economy parts, original parts and labour in that order, only those with a range, in dollars', () => {
    expect(priceRows(found)).toEqual([
      { key: 'partsEconomy', value: '$8 – $15' },
      { key: 'labor', value: '$10' },
    ]);
  });

  it('lists nothing for an Estimate with no price found', () => {
    expect(priceRows(estimateResult.parse(storedEstimate.row.result))).toEqual([]);
  });
});

describe('totals', () => {
  it('gives the independent shop and the dealership, null where there is no range', () => {
    expect(totals(found)).toEqual({ independent: '$25 – $1,250', dealership: null });
  });
});

describe('confidenceBars', () => {
  it('fills three bars for high, two for medium and one for low', () => {
    expect([confidenceBars('high'), confidenceBars('medium'), confidenceBars('low')]).toEqual([3, 2, 1]);
  });
});

const past = (id: string, vehicleId: string | null, patch: Partial<Estimate> = {}): Estimate => ({
  id,
  query: 'Filtro de aceite',
  taskCode: 'oil_filter',
  city: 'San Salvador',
  country: 'SV',
  createdAt: '2026-11-03T15:00:00Z',
  vehicleId,
  result: found,
  ...patch,
});

describe('pastQueries', () => {
  it('keeps the chosen Vehicle\'s, newest first as they come, six at most', () => {
    const history = [past('a', 'v1'), past('b', 'v2'), ...['c', 'd', 'e', 'f', 'g', 'h'].map((id) => past(id, 'v1'))];
    expect(pastQueries(history, 'v1').map((e) => e.id)).toEqual(['a', 'c', 'd', 'e', 'f', 'g']);
  });
});

describe('estimateTitle', () => {
  it('uses the title the research gave, else what was asked', () => {
    expect(estimateTitle(past('a', 'v1'))).toBe('Filtro de aceite');
    expect(estimateTitle(past('a', 'v1', { query: 'alternador', result: { ...found, title: '' } }))).toBe('alternador');
  });
});

describe('pastQuerySubtitle', () => {
  it('gives the independent shop total and the day it was asked', () => {
    expect(pastQuerySubtitle(past('a', 'v1', { createdAt: '2024-11-03T15:00:00Z' }), t)).toBe('$25 – $1,250 · 3 nov 2024');
  });

  it('says «Sin rango» when no price was found', () => {
    const none = past('a', 'v1', { createdAt: '2024-11-03T15:00:00Z', result: { ...found, total_independent: null } });
    expect(pastQuerySubtitle(none, t)).toBe('Sin rango · 3 nov 2024');
  });
});

describe('estimatePlace', () => {
  it('names the city and the country', () => {
    expect(estimatePlace('San Salvador', 'SV', t)).toBe('San Salvador, El Salvador');
    expect(estimatePlace('', 'US', t)).toBe('Estados Unidos');
  });
});

describe('waitingStep', () => {
  it('moves to the next of the three lines every 4.5 s and stays on the last', () => {
    expect([0, 4499, 4500, 9000, 60000].map(waitingStep)).toEqual([0, 0, 1, 2, 2]);
  });
});

describe('the switch', () => {
  it('offers «Estimar precio» then «Chat de Seibi», and Estimados opens on the first', () => {
    expect(modeOptions(t)).toEqual([
      { value: 'estimate', label: 'Estimar precio' },
      { value: 'chat', label: 'Chat de Seibi' },
    ]);
    expect(INITIAL_MODE).toBe('estimate');
  });
});
