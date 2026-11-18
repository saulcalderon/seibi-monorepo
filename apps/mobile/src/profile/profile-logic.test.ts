import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import { headerName, locationDraft, locationSummary, nameDraft, unsaved } from './profile-logic';

const ANA = { fullName: 'Ana López', email: 'ana@example.com' };

describe('headerName', () => {
  it('is the name Seibi calls you by, else the account name, else the email', () => {
    expect(headerName({ displayName: 'Anita' }, ANA, t)).toBe('Anita');
    expect(headerName({ displayName: null }, ANA, t)).toBe('Ana López');
    expect(headerName(undefined, { fullName: null, email: 'ana@example.com' }, t)).toBe('ana@example.com');
  });

  it('says «Tu cuenta» when Seibi knows nothing yet', () => {
    expect(headerName(undefined, { fullName: null, email: null }, t)).toBe('Tu cuenta');
  });
});

describe('locationSummary', () => {
  it('is «city, country», or the country alone without a city', () => {
    expect(locationSummary({ country: 'SV', city: 'Santa Ana' }, t)).toBe('Santa Ana, El Salvador');
    expect(locationSummary({ country: 'US', city: null }, t)).toBe('Estados Unidos');
  });

  it('says «Sin definir» without a country, even with a city', () => {
    expect(locationSummary({ country: null, city: 'Houston' }, t)).toBe('Sin definir');
    expect(locationSummary(undefined, t)).toBe('Sin definir');
  });
});

describe('nameDraft', () => {
  it('starts from the saved name, or empty', () => {
    expect(nameDraft({ displayName: 'Anita' })).toBe('Anita');
    expect(nameDraft({ displayName: null })).toBe('');
    expect(nameDraft(undefined)).toBe('');
  });
});

describe('locationDraft', () => {
  it('starts from the saved country and city, El Salvador when none is saved', () => {
    expect(locationDraft({ country: 'US', city: 'Houston' })).toEqual({ country: 'US', city: 'Houston' });
    expect(locationDraft({ country: null, city: null })).toEqual({ country: 'SV', city: '' });
    expect(locationDraft(undefined)).toEqual({ country: 'SV', city: '' });
  });
});

describe('unsaved', () => {
  it('is true once a typed value differs from where the sheet started', () => {
    expect(unsaved({ name: 'Anita' }, { name: 'Ana' })).toBe(true);
    expect(unsaved({ country: 'SV', city: '' }, { country: 'US', city: '' })).toBe(true);
    expect(unsaved({ country: 'SV', city: '' }, { country: 'SV', city: 'Santa Ana' })).toBe(true);
  });

  it('ignores spaces at the ends, which the save drops anyway', () => {
    expect(unsaved({ name: 'Anita' }, { name: ' Anita ' })).toBe(false);
    expect(unsaved({ country: 'SV', city: '' }, { country: 'SV', city: '   ' })).toBe(false);
  });
});
