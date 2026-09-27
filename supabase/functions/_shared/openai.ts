// OpenAI Responses API with web search and structured output (ADR-0006).

import { HttpError } from './http.ts'

export type Source = { title: string; url: string }

type JsonSchema = Record<string, unknown>

export type RespondOptions = {
  instructions: string
  input: string | Array<{ role: 'user' | 'assistant'; content: string }>
  schemaName: string
  schema: JsonSchema
  webSearch?: boolean
  location?: { country: 'SV' | 'US'; city?: string | null }
  timeoutMs?: number
}

export type RespondResult<T> = { data: T; citations: Source[] }

export const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-6-astra'

type OutputContent = {
  type: string
  text?: string
  annotations?: Array<{ type: string; url?: string; title?: string }>
}
type OutputItem = { type: string; content?: OutputContent[] }

export async function respond<T>(options: RespondOptions): Promise<RespondResult<T>> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new HttpError(503, 'ai_unavailable', 'La búsqueda con IA no está disponible todavía.')
  }

  const tools = options.webSearch === false
    ? []
    : [
      {
        type: 'web_search',
        ...(options.location
          ? {
            user_location: {
              type: 'approximate',
              country: options.location.country,
              ...(options.location.city ? { city: options.location.city } : {}),
            },
          }
          : {}),
      },
    ]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000)
  let response: Response
  try {
    response = await fetch(`${Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'}/responses`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: options.instructions,
        input: options.input,
        tools,
        text: {
          format: {
            type: 'json_schema',
            name: options.schemaName,
            schema: options.schema,
            strict: true,
          },
        },
      }),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(504, 'ai_timeout', 'La búsqueda tardó demasiado. Intenta de nuevo.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    console.error('openai error', response.status, await response.text())
    throw new HttpError(502, 'ai_failed', 'No pudimos completar la búsqueda. Intenta de nuevo.')
  }

  const body = (await response.json()) as { output?: OutputItem[] }
  let text = ''
  const citations = new Map<string, Source>()
  for (const item of body.output ?? []) {
    if (item.type !== 'message') continue
    for (const part of item.content ?? []) {
      if (part.type !== 'output_text') continue
      text += part.text ?? ''
      for (const a of part.annotations ?? []) {
        if (a.type === 'url_citation' && a.url) {
          citations.set(a.url, { url: a.url, title: a.title ?? a.url })
        }
      }
    }
  }

  try {
    return { data: JSON.parse(text) as T, citations: [...citations.values()] }
  } catch {
    console.error('openai returned non-JSON', text.slice(0, 500))
    throw new HttpError(502, 'ai_failed', 'No pudimos completar la búsqueda. Intenta de nuevo.')
  }
}

/** Keeps only http(s) sources, de-duplicated by URL. */
export function cleanSources(...lists: Source[][]): Source[] {
  const seen = new Map<string, Source>()
  for (const list of lists) {
    for (const s of list) {
      if (!s?.url || !/^https?:\/\//.test(s.url)) continue
      if (!seen.has(s.url)) seen.set(s.url, { url: s.url, title: s.title || s.url })
    }
  }
  return [...seen.values()]
}

export const SOURCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'url'],
  properties: { title: { type: 'string' }, url: { type: 'string' } },
}

/**
 * Plain text for the UI: drops the Markdown links and bare URLs the model
 * adds inline. Sources are shown separately from the `sources` list.
 */
export function plainText(text: string): string {
  return text
    .replace(/\s*\(\[[^\]]*\]\(https?:[^)]*\)\)/g, '')
    .replace(/\[([^\]]+)\]\(https?:[^)]*\)/g, '$1')
    .replace(/\s*\(?https?:\/\/[^\s)]*[^\s).,;]\)?/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;])/g, '$1')
    .trim()
}
