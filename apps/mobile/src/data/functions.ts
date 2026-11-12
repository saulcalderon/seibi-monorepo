import { FunctionsHttpError } from '@supabase/supabase-js';
import type { ZodType } from 'zod';

import { supabase } from '@/lib/supabase';

import { functionError, parseResponse, RequestError } from './errors';

/** Seibi's Edge Functions that the app calls with the person's session. */
export type FunctionName = 'vehicle-lookup' | 'vehicle-render' | 'estimates' | 'delete-account';

/**
 * Calls an Edge Function and checks its answer against `schema` (Zod). Throws
 * a `RequestError`: the function's own code (`ai_limit`, `profile_location`…),
 * `network` when it never answered, `invalid_response` for a shape the app
 * doesn't expect.
 */
export async function invokeFunction<T>(name: FunctionName, body: Record<string, unknown>, schema: ZodType<T>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const response = error.context as Response;
      const payload: unknown = await response.json().catch(() => null);
      throw functionError(response.status, payload);
    }
    throw new RequestError('network');
  }
  return parseResponse(name, schema, data);
}
