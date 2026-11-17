import { describe, expect, it } from 'vitest';

import { errorCode, parseResponse } from '../errors';
import makesCar from '../fixtures/vpic.makes-car.json';
import modelsFiat from '../fixtures/vpic.models-fiat-2015.json';
import modelsToyota from '../fixtures/vpic.models-toyota-2015.json';
import modelsUnknown from '../fixtures/vpic.models-unknown-make.json';

import { makeNames, makesResponse, modelNames, modelsResponse, POPULAR_BRANDS } from './schemas';

// Fixtures: real answers from vpic.nhtsa.dot.gov, recorded 2026-11-12
// (src/data/fixtures/vpic.*.json; `request` holds each URL).

describe('NHTSA vPIC makes', () => {
  const cars = parseResponse('vpic', makesResponse, makesCar.body);

  it('accepts the recorded answer', () => {
    expect(cars.Results).toHaveLength(195);
  });

  it('lists the popular brands first among vPIC’s, title-cased and in Spanish order', () => {
    const names = makeNames([cars]);
    for (const brand of POPULAR_BRANDS) expect(names).toContain(brand);
    expect(names).toContain('Aston Martin');
    expect(names).toContain('Rolls-Royce');
    // Names of three letters or fewer stay in capitals.
    expect(names).toContain('BMW');
    expect(names).not.toContain('ASTON MARTIN');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps one spelling per brand, ignoring case: the popular «Kia», not vPIC’s «KIA»', () => {
    const names = makeNames([cars, { Results: [{ MakeName: 'kia' }, { MakeName: 'TOYOTA' }] }]);
    expect(names.filter((name) => name.toLowerCase() === 'kia')).toEqual(['Kia']);
    expect(names.filter((name) => name.toLowerCase() === 'toyota')).toEqual(['Toyota']);
  });

  it('refuses an answer without results', () => {
    let caught: unknown;
    try {
      parseResponse('vpic', makesResponse, { Message: 'Service unavailable' });
    } catch (error) {
      caught = error;
    }
    expect(errorCode(caught)).toBe('invalid_response');
  });
});

describe('NHTSA vPIC models', () => {
  it('lists a year’s models once each, in Spanish order', () => {
    expect(modelNames(parseResponse('vpic', modelsResponse, modelsFiat.body))).toEqual(['500', '500L', 'Freemont']);
  });

  it('accepts the recorded Toyota answer', () => {
    const names = modelNames(parseResponse('vpic', modelsResponse, modelsToyota.body));
    expect(names).toContain('Corolla');
    expect(names).toContain('Scion tC');
    expect(names).toHaveLength(new Set(names).size);
  });

  it('lists a model once however vPIC capitalises it', () => {
    expect(modelNames({ Results: [{ Model_Name: 'Yaris' }, { Model_Name: 'YARIS' }, { Model_Name: ' Corolla ' }] })).toEqual(['Corolla', 'Yaris']);
  });

  it('is empty for a brand vPIC doesn’t know (typed by hand: Hilux, NP300)', () => {
    expect(modelNames(parseResponse('vpic', modelsResponse, modelsUnknown.body))).toEqual([]);
  });
});
