import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import deleteAccountNoSession from './fixtures/delete-account.no-session.json';
import lookupNotFound from './fixtures/vehicle-lookup.not-found.json';
import { ERROR_CODES, errorCode, errorMessage, functionError, InputError, parseResponse, RequestError } from './errors';
import { t } from './test-i18n';

describe('errorMessage', () => {
  it('has a Spanish message in es.json for every error code', () => {
    for (const code of ERROR_CODES) {
      const message = errorMessage(new RequestError(code), t);
      expect(message, code).not.toBe(`errors.${code}`);
      expect(message.length, code).toBeGreaterThan(0);
    }
  });

  it("shows an Edge Function's error by its code, in the app's own words", () => {
    // Recorded from seibi-dev: delete-account without a session.
    const error = functionError(deleteAccountNoSession.status, deleteAccountNoSession.body);
    expect(errorCode(error)).toBe('unauthorized');
    expect(errorMessage(error, t)).toBe('Inicia sesión para continuar.');
  });

  it('reads the code of a recorded not-found answer', () => {
    const error = functionError(lookupNotFound.status, lookupNotFound.body);
    expect(errorMessage(error, t)).toBe('No encontramos ese Vehículo.');
  });

  it('shows the daily AI limit without the server-side number', () => {
    const error = functionError(429, { error: 'ai_limit', message: 'Llegaste al límite de 20 consultas de hoy. Vuelve mañana.' });
    expect(errorMessage(error, t)).toBe('Llegaste al límite de consultas de hoy. Vuelve mañana.');
  });

  it('falls back to the generic message for a code the app does not know', () => {
    const error = functionError(418, { error: 'teapot', message: 'Soy una tetera.' });
    expect(errorCode(error)).toBe('unknown');
    expect(errorMessage(error, t)).toBe('Algo salió mal. Intenta de nuevo.');
  });

  it('asks to sign in again for a 401 without a Seibi error body', () => {
    expect(errorCode(functionError(401, { code: 401, message: 'Invalid JWT' }))).toBe('unauthorized');
    expect(errorCode(functionError(500, 'Internal Server Error'))).toBe('unknown');
  });

  it('says the connection failed when fetch never reached the server', () => {
    // React Native's fetch rejects with this when the phone is offline.
    expect(errorMessage(new TypeError('Network request failed'), t)).toBe(
      'No pudimos conectar con Seibi. Revisa tu conexión e intenta de nuevo.',
    );
    // supabase-js wraps the same failure in a PostgrestError-like object.
    expect(errorCode({ message: 'TypeError: Network request failed', details: '', hint: '', code: '' })).toBe('network');
  });

  it('names the field and fills in the details of a form error', () => {
    const error = new InputError('reading', 'reading_not_above_current', { current: '30,000 km' });
    expect(error.field).toBe('reading');
    expect(errorMessage(error, t)).toBe('Debe ser mayor que el último registro (30,000 km).');
  });

  it('shows the generic message for anything else', () => {
    expect(errorMessage(new Error('boom'), t)).toBe('Algo salió mal. Intenta de nuevo.');
    expect(errorMessage(undefined, t)).toBe('Algo salió mal. Intenta de nuevo.');
  });
});

describe('parseResponse', () => {
  const schema = z.object({ deleted: z.literal(true) });

  it('returns the data when it has the expected shape', () => {
    expect(parseResponse('delete-account', schema, { deleted: true })).toEqual({ deleted: true });
  });

  it('turns an unexpected shape into an invalid_response error', () => {
    let caught: unknown;
    try {
      parseResponse('delete-account', schema, { deleted: false });
    } catch (error) {
      caught = error;
    }
    expect(errorCode(caught)).toBe('invalid_response');
    expect(errorMessage(caught, t)).toBe('Algo salió mal. Intenta de nuevo.');
  });
});
