import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** An Edge Function error with a stable code and Spanish UI copy. */
export class FunctionError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FunctionError'
    this.code = code
  }
}

const FALLBACK = 'No pudimos conectar con Seibi. Revisa tu conexión e intenta de nuevo.'

export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as {
        error?: string
        message?: string
      } | null
      throw new FunctionError(payload?.error ?? 'unknown', payload?.message ?? FALLBACK)
    }
    throw new FunctionError('network', FALLBACK)
  }
  return data as T
}

export function errorMessage(error: unknown) {
  if (error instanceof FunctionError) return error.message
  if (error instanceof Error && /network|fetch/i.test(error.message)) return FALLBACK
  return 'Algo salió mal. Intenta de nuevo.'
}
