// Shared HTTP helpers for Edge Functions.

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ??
  'https://seibiapp.com,https://www.seibiapp.com,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

/** An error the client can show. `code` is stable; `message` is Spanish UI copy. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
    try {
      return await fn(req)
    } catch (error) {
      if (error instanceof HttpError) {
        return json(req, { error: error.code, message: error.message }, error.status)
      }
      console.error(error)
      return json(
        req,
        { error: 'internal', message: 'Algo salió mal. Intenta de nuevo en un momento.' },
        500,
      )
    }
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'bad_request', 'La solicitud no es válida.')
  }
}
