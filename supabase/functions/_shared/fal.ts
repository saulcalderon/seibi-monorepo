// fal queue API for Model renders: one studio image (the poster) per
// brand, model, year, and paint. There is no 3D step (SEI-48).

import { hmac, normalizeKey } from './keys.ts'
import { HttpError } from './http.ts'

export const FAL_IMAGE_MODEL = Deno.env.get('FAL_IMAGE_MODEL') ?? 'fal-ai/flux-pro/v1.1-ultra'
export const RENDER_BUCKET = 'vehicle-renders'
export const MAX_RENDER_ATTEMPTS = 3

/** Paint codes the app offers; stored on vehicles.color. */
export const PAINT_WORDS: Record<string, string> = {
  white: 'white',
  black: 'black',
  silver: 'metallic silver',
  gray: 'gray',
  red: 'red',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  orange: 'orange',
  brown: 'brown',
  beige: 'beige',
  gold: 'gold',
  burgundy: 'burgundy',
}

export function paintCode(color: string | null): string {
  const code = (color ?? '').toLowerCase()
  return code in PAINT_WORDS ? code : 'silver'
}

export function renderKey(brand: string, model: string, year: number, color: string): string {
  return [normalizeKey(brand), normalizeKey(model), year, color].join('_')
}

function webhookSecret() {
  return Deno.env.get('RENDER_WEBHOOK_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
}

/**
 * Signs the webhook URL for a render. The message keeps the `:poster` suffix
 * of the old two-step pipeline, so a poster job submitted before SEI-48
 * still verifies; a leftover 3D job's token (`:glb`) does not.
 */
export async function webhookToken(renderId: string) {
  return await hmac(webhookSecret(), `${renderId}:poster`)
}

async function webhookUrl(renderId: string) {
  const base = Deno.env.get('PUBLIC_FUNCTIONS_URL') ??
    `${Deno.env.get('SUPABASE_URL')}/functions/v1`
  const token = await webhookToken(renderId)
  return `${base}/vehicle-render-webhook?render=${renderId}&token=${token}`
}

async function submit(model: string, input: Record<string, unknown>, webhook: string) {
  const key = Deno.env.get('FAL_KEY')
  if (!key) {
    throw new HttpError(503, 'render_unavailable', 'Las imágenes de los modelos no están disponibles todavía.')
  }
  const res = await fetch(
    `https://queue.fal.run/${model}?fal_webhook=${encodeURIComponent(webhook)}`,
    {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  if (!res.ok) throw new Error(`fal submit ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as { request_id: string }
  return body.request_id
}

export function posterPrompt(r: { brand: string; model: string; year: number; color: string }) {
  const paint = PAINT_WORDS[r.color] ?? 'metallic silver'
  return [
    `Studio product photograph of a ${r.year} ${r.brand} ${r.model} with ${paint} paint,`,
    'the exact body style and generation of that model year,',
    'three-quarter front view from the front-left, the whole car visible and centered,',
    'plain seamless light gray background, soft even studio lighting, soft ground shadow,',
    'photorealistic, no people, no text, no watermark.',
  ].join(' ')
}

export async function submitPoster(
  renderId: string,
  r: { brand: string; model: string; year: number; color: string },
) {
  return await submit(
    FAL_IMAGE_MODEL,
    {
      prompt: posterPrompt(r),
      aspect_ratio: '4:3',
      output_format: 'png',
      num_images: 1,
      safety_tolerance: '2',
    },
    await webhookUrl(renderId),
  )
}

type FalFile = { url?: string; content_type?: string }

export function posterUrlFrom(payload: Record<string, unknown>): string | null {
  const images = payload.images as FalFile[] | undefined
  return images?.[0]?.url ?? null
}
