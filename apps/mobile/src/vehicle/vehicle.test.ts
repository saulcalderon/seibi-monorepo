import { describe, expect, it } from 'vitest';

import { InputError } from '@/data/errors';
import { withdrawnDaysLeft } from '@/data/garage/derive';
import { t } from '@/data/test-i18n';

import { withdrawMessage } from './withdraw-message';

import { draftChanged, draftFrom, emptyDraft, parseDraft, type VehicleDraft } from './form-schema';
import { exactOption, filterOptions, fold, matchesVehicle } from './search';

const yaris = { brand: 'Toyota', model: 'Yaris', year: 2015, plate: 'P123-456', trimLevel: 'XLE' };

describe('Mi flota search', () => {
  it('ignores accents and capitals', () => {
    expect(fold('PEUGEÓT')).toBe('peugeot');
  });

  it('finds a Vehicle by brand, model, year, Plate or trim', () => {
    for (const query of ['toyota', 'YARIS', '2015', 'p123-456', 'xle', '  yaris 2015 ', '']) {
      expect(matchesVehicle(yaris, query)).toBe(true);
    }
  });

  it('finds a Plate typed without its dash', () => {
    expect(matchesVehicle(yaris, 'P123456')).toBe(true);
  });

  it('needs every typed word to match', () => {
    expect(matchesVehicle(yaris, 'toyota corolla')).toBe(false);
    expect(matchesVehicle({ ...yaris, plate: null, trimLevel: null }, 'P123')).toBe(false);
  });
});

describe('picker options', () => {
  const brands = ['Kia', 'Mazda', 'Škoda', 'Toyota', 'Lamborghini'];

  it('puts the options that start with the query first', () => {
    expect(filterOptions(brands, 'm')).toEqual(['Mazda', 'Lamborghini']);
    expect(filterOptions(brands, 'o')).toEqual(['Škoda', 'Toyota', 'Lamborghini']);
    expect(filterOptions(brands, 'ma')).toEqual(['Mazda']);
    expect(filterOptions(brands, 'skoda')).toEqual(['Škoda']);
    expect(filterOptions(brands, ' ')).toEqual(brands);
  });

  it('knows when the query is already an option', () => {
    expect(exactOption(brands, 'toyota ')).toBe('Toyota');
    expect(exactOption(brands, 'toy')).toBeNull();
    expect(exactOption(brands, '')).toBeNull();
  });
});

describe('the Vehicle form’s rules', () => {
  const now = new Date(2026, 10, 12);
  const filled: VehicleDraft = {
    ...emptyDraft('km'),
    brand: ' Toyota ',
    year: 2015,
    model: 'Yaris',
    plate: 's5-ab 12',
    engine: ' 1.5L ',
    color: 'black',
    odometer: 45000,
  };

  function failure(draft: VehicleDraft) {
    try {
      parseDraft(draft, now);
    } catch (error) {
      if (error instanceof InputError) return { field: error.field, code: error.code };
      throw error;
    }
    return null;
  }

  it('turns a filled form into what the data layer saves', () => {
    expect(parseDraft(filled, now)).toEqual({
      input: { brand: 'Toyota', model: 'Yaris', year: 2015, plate: 'S5-AB12', engine: '1.5L', trimLevel: null, color: 'black', measure: 'km' },
      odometer: 45000,
    });
  });

  it('asks for the brand, then the year, then the model', () => {
    expect(failure(emptyDraft('km'))).toEqual({ field: 'brand', code: 'brand_required' });
    expect(failure({ ...filled, year: null })).toEqual({ field: 'year', code: 'year_invalid' });
    expect(failure({ ...filled, model: '  ' })).toEqual({ field: 'model', code: 'model_required' });
  });

  it('takes model years from 1950 to next year', () => {
    expect(failure({ ...filled, year: 1949 })).toEqual({ field: 'year', code: 'year_invalid' });
    expect(failure({ ...filled, year: 2027 })).toBeNull();
    expect(failure({ ...filled, year: 2028 })).toEqual({ field: 'year', code: 'year_invalid' });
  });

  it('lets the odometer be empty, never negative or a fraction', () => {
    expect(failure({ ...filled, odometer: null })).toBeNull();
    expect(failure({ ...filled, odometer: 0 })).toBeNull();
    expect(failure({ ...filled, odometer: -1 })).toEqual({ field: 'odometer', code: 'number_invalid' });
    expect(failure({ ...filled, odometer: 1.5 })).toEqual({ field: 'odometer', code: 'number_invalid' });
  });

  it('starts an edit from the stored Vehicle and sees a change', () => {
    const stored = { brand: 'Toyota', model: 'Yaris', year: 2015, plate: null, engine: null, trimLevel: 'XLE', color: 'teal', measure: 'mi' as const };
    const draft = draftFrom(stored);
    expect(draft).toEqual({ ...emptyDraft('mi'), brand: 'Toyota', model: 'Yaris', year: 2015, trimLevel: 'XLE' });
    expect(draftChanged(draft, draftFrom(stored))).toBe(false);
    expect(draftChanged(draft, { ...draft, plate: 'S5-1' })).toBe(true);
  });
});

describe('withdrawing a Vehicle', () => {
  it('says how long its record is and how many Services it keeps', () => {
    const vehicle = { createdAt: '2026-11-02T10:00:00Z', services: [] };
    expect(withdrawMessage(vehicle, '2026-11-12', t)).toBe(
      'Lleva un registro de 10 días. Sale de tu flota y de Inicio. Puedes restaurarlo durante 30 días. Después se elimina el Vehículo y su registro.',
    );
    const older = { createdAt: '2026-11-02T10:00:00Z', services: [{ performedOn: '2024-06-01' }, { performedOn: '2025-01-10' }] };
    expect(withdrawMessage(older, '2026-11-12', t)).toMatch(/^Lleva un registro de 2 años, con 2 Servicios\. /);
    expect(withdrawMessage({ createdAt: '2026-11-11T00:00:00Z', services: [{ performedOn: '2026-11-11' }] }, '2026-11-12', t)).toMatch(
      /^Lleva un registro de 1 día, con 1 Servicio\. /,
    );
  });

  it('can be restored for 30 days, counted up', () => {
    const now = Date.parse('2026-11-12T12:00:00Z');
    expect(withdrawnDaysLeft('2026-11-12T12:00:00Z', now)).toBe(30);
    expect(withdrawnDaysLeft('2026-11-11T11:00:00Z', now)).toBe(29);
    expect(withdrawnDaysLeft('2026-10-13T13:00:00Z', now)).toBe(1);
  });
});
