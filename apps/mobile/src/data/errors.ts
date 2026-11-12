// Every error the data layer can raise has a stable code, and every code has
// its message in es.json under `errors.<code>`. Screens show
// `errorMessage(error, t)`; they never show a server's text or an exception's
// message. Nothing here imports the router or React Native, so it runs in the
// unit tests.
import type { TFunction } from 'i18next';
import type { ZodType } from 'zod';

/** Codes the Edge Functions send in `{ error, message }` (supabase/functions/_shared). */
const SERVER_CODES = [
  'bad_request',
  'unauthorized',
  'not_found',
  'internal',
  'ai_limit',
  'ai_unavailable',
  'ai_timeout',
  'ai_failed',
  'render_unavailable',
  'profile_location',
] as const;

/** Codes for form fields that fail the data layer's rules (`InputError`). */
const INPUT_CODES = [
  'number_invalid',
  'reading_not_above_current',
  'brand_required',
  'model_required',
  'year_invalid',
  'date_required',
  'service_date_future',
  'service_items_required',
  'cost_invalid',
  'appointment_date_past',
  'routine_name_required',
  'routine_distance_invalid',
  'routine_days_invalid',
  'reminder_title_required',
] as const;

/** Every code, each with a message in es.json (typecheck fails when one is missing). */
export const ERROR_CODES = [
  'network',
  'unknown',
  'invalid_response',
  'session_expired',
  ...SERVER_CODES,
  ...INPUT_CODES,
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type InputCode = (typeof INPUT_CODES)[number];
type ServerCode = (typeof SERVER_CODES)[number];

/** Values a message fills in, such as the current odometer, already formatted. */
export type ErrorParams = Record<string, string | number>;

/** A form field that breaks a rule. The form shows the message next to `field`. */
export class InputError extends Error {
  readonly field: string;
  readonly code: InputCode | 'session_expired';
  readonly params: ErrorParams;

  constructor(field: string, code: InputCode | 'session_expired', params: ErrorParams = {}) {
    super(code);
    this.name = 'InputError';
    this.field = field;
    this.code = code;
    this.params = params;
  }
}

/**
 * A request that failed: an Edge Function's error, no connection, or an
 * answer that doesn't have the shape the app expects (`invalid_response`).
 */
export class RequestError extends Error {
  readonly code: ErrorCode;
  /** HTTP status, when the server answered. */
  readonly status: number | null;

  constructor(code: ErrorCode, status: number | null = null) {
    super(code);
    this.name = 'RequestError';
    this.code = code;
    this.status = status;
  }
}

function isServerCode(value: unknown): value is ServerCode {
  return (SERVER_CODES as readonly unknown[]).includes(value);
}

/**
 * The error for an Edge Function's non-2xx answer. Seibi's functions answer
 * `{ error: <code>, message }`; the message is the server's Spanish and is
 * not shown (es.json has the app's own). Supabase's gateway can answer a 401
 * with another body, which still means signing in again.
 */
export function functionError(status: number, body: unknown): RequestError {
  const code = typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : undefined;
  if (isServerCode(code)) return new RequestError(code, status);
  if (status === 401) return new RequestError('unauthorized', status);
  return new RequestError('unknown', status);
}

/**
 * Checks an answer against its schema (Edge Functions, NHTSA vPIC). An
 * unexpected shape throws `invalid_response` instead of letting a screen
 * read fields that aren't there.
 */
export function parseResponse<T>(source: string, schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.warn(`[${source}] unexpected response`, result.error.issues);
  throw new RequestError('invalid_response');
}

function looksLikeNetworkFailure(error: unknown) {
  const message = typeof error === 'object' && error !== null ? (error as { message?: unknown }).message : undefined;
  return typeof message === 'string' && /network|fetch/i.test(message);
}

/** The code behind any error the data layer throws, `unknown` when it has none. */
export function errorCode(error: unknown): ErrorCode {
  if (error instanceof InputError || error instanceof RequestError) return error.code;
  if (looksLikeNetworkFailure(error)) return 'network';
  return 'unknown';
}

/** What to show the person for an error, from es.json. */
export function errorMessage(error: unknown, t: TFunction): string {
  const params = error instanceof InputError ? error.params : {};
  return t(`errors.${errorCode(error)}`, params);
}
