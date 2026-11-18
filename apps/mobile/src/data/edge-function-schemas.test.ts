import { describe, expect, it } from 'vitest';

import { deleteAccountResponse } from './account/schemas';
import { estimateResponse, estimateResult } from './estimate/schemas';
import { errorCode, errorMessage, functionError, parseResponse } from './errors';
import estimatesNoLocation from './fixtures/estimates.no-location.json';
import storedEstimate from './fixtures/estimates.result.not-found.json';
import lookupOk from './fixtures/vehicle-lookup.ok.json';
import renderOk from './fixtures/vehicle-render.ok.json';
import { t } from './test-i18n';
import { vehicleLookupResponse, vehicleRenderResponse } from './vehicle/schemas';

// Fixtures: answers recorded from seibi-dev as the test account on
// 2026-11-12, for its Toyota Yaris 2015 (src/data/fixtures/; `request` holds
// what was sent).

function invalid(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return errorCode(error);
  }
  return 'parsed';
}

describe('vehicle-lookup', () => {
  it('accepts the recorded answer for a Vehicle whose Maintenance schedule exists', () => {
    expect(lookupOk.status).toBe(202);
    expect(parseResponse('vehicle-lookup', vehicleLookupResponse, lookupOk.body)).toEqual({
      scheduleId: '312572c6-22f9-4c41-b5f6-49d31d3e0667',
      status: 'general',
    });
  });

  it('accepts the answer it gives when the AI key is not set', () => {
    expect(parseResponse('vehicle-lookup', vehicleLookupResponse, { scheduleId: null, status: 'unavailable' })).toEqual({
      scheduleId: null,
      status: 'unavailable',
    });
  });

  it('refuses a status the app does not know', () => {
    expect(invalid(() => parseResponse('vehicle-lookup', vehicleLookupResponse, { scheduleId: null, status: 'queued' }))).toBe(
      'invalid_response',
    );
  });
});

describe('vehicle-render', () => {
  it('accepts the recorded answer for a Vehicle whose Model render exists', () => {
    expect(renderOk.status).toBe(202);
    expect(parseResponse('vehicle-render', vehicleRenderResponse, renderOk.body)).toEqual({
      renderId: 'a610b89b-c041-4315-abaa-f2f8c375dd07',
    });
  });

  it('refuses an answer without a render id', () => {
    expect(invalid(() => parseResponse('vehicle-render', vehicleRenderResponse, { ok: true }))).toBe('invalid_response');
  });
});

describe('estimates', () => {
  it('reads a stored Estimate the Edge Function wrote, with no price found', () => {
    const result = parseResponse('estimates', estimateResult, storedEstimate.row.result);
    expect(result.found).toBe(false);
    expect(result.total_independent).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.sources).toHaveLength(1);
  });

  it('refuses a stored Estimate whose price range is not numbers', () => {
    const broken = { ...storedEstimate.row.result, labor: { min: '20', max: '40' } };
    expect(invalid(() => parseResponse('estimates', estimateResult, broken))).toBe('invalid_response');
  });

  it('accepts the answer for one Estimate: what was asked, where, and the stored result', () => {
    const answer = {
      id: storedEstimate.row.id,
      query: 'Filtro de aceite',
      taskCode: 'oil_filter',
      city: 'San Salvador',
      country: 'SV',
      createdAt: '2026-09-30T02:01:12.396Z',
      result: storedEstimate.row.result,
    };
    const parsed = parseResponse('estimates', estimateResponse, answer);
    expect(parsed.taskCode).toBe('oil_filter');
    expect(parsed.result.found).toBe(false);
  });

  it('refuses an answer for a country Seibi does not price in', () => {
    const answer = { id: 'x', query: 'Batería', taskCode: null, city: 'Lima', country: 'PE', createdAt: '2026-11-17T00:00:00Z', result: storedEstimate.row.result };
    expect(invalid(() => parseResponse('estimates', estimateResponse, answer))).toBe('invalid_response');
  });

  it('says the daily AI limit is reached in the app\'s words, not the server\'s (429 ai_limit)', () => {
    const error = functionError(429, { error: 'ai_limit', message: 'Llegaste al límite de 20 consultas de hoy. Vuelve mañana.' });
    expect(errorCode(error)).toBe('ai_limit');
    expect(errorMessage(error, t)).toBe('Llegaste al límite de consultas de hoy. Vuelve mañana.');
  });

  it('asks for the country and city when the profile has none (recorded 409)', () => {
    const error = functionError(estimatesNoLocation.status, estimatesNoLocation.body);
    expect(errorCode(error)).toBe('profile_location');
    expect(errorMessage(error, t)).toBe('Dinos tu país y ciudad en Perfil para calcular precios de tu zona.');
  });
});

describe('delete-account', () => {
  // Not recorded: a successful call deletes the shared test account. The
  // shape is the one `supabase/functions/delete-account/index.ts` returns.
  it('accepts { deleted: true } only', () => {
    expect(parseResponse('delete-account', deleteAccountResponse, { deleted: true })).toEqual({ deleted: true });
    expect(invalid(() => parseResponse('delete-account', deleteAccountResponse, { deleted: false }))).toBe('invalid_response');
  });
});
