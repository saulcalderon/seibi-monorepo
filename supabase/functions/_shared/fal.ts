// fal queue API and the Model render pipeline (ADR-0008).

import { hmac, normalizeKey } from './keys.ts'
import { HttpError } from './http.ts'

export const FAL_IMAGE_MODEL = Deno.env.get('FAL_IMAGE_MODEL') ?? 'fal-ai/flux-pro/v1.1-ultra'
export const FAL_3D_MODEL = Deno.env.get('FAL_3D_MODEL') ?? 'fal-ai/trellis'
export const RENDER_BUCKET = 'vehicle-renders'
export const MAX_RENDER_ATTEMPTS = 3
/** GLBs above this are too heavy for a phone; we keep the poster only. */
export const MAX_GLB_BYTES = 40 * 1024 * 1024

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

export type RenderStep = 'poster' | 'glb'

export async function webhookToken(renderId: string, step: RenderStep) {
  return await hmac(webhookSecret(), `${renderId}:${step}`)
}

async function webhookUrl(renderId: string, step: RenderStep) {
  const base = Deno.env.get('PUBLIC_FUNCTIONS_URL') ??
    `${Deno.env.get('SUPABASE_URL')}/functions/v1`
  const token = await webhookToken(renderId, step)
  return `${base}/vehicle-render-webhook?render=${renderId}&step=${step}&token=${token}`
}

async function submit(model: string, input: Record<string, unknown>, webhook: string) {
  const key = Deno.env.get('FAL_KEY')
  if (!key) throw new HttpError(503, 'render_unavailable', 'Los modelos 3D no están disponibles todavía.')
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
    await webhookUrl(renderId, 'poster'),
  )
}

export async function submitGlb(renderId: string, imageUrl: string) {
  const input: Record<string, unknown> = FAL_3D_MODEL.includes('hunyuan')
    ? { input_image_url: imageUrl }
    : { image_url: imageUrl, texture_size: 1024, mesh_simplify: 0.95 }
  return await submit(FAL_3D_MODEL, input, await webhookUrl(renderId, 'glb'))
}

type FalFile = { url?: string; content_type?: string }

export function posterUrlFrom(payload: Record<string, unknown>): string | null {
  const images = payload.images as FalFile[] | undefined
  return images?.[0]?.url ?? null
}

export function glbUrlFrom(payload: Record<string, unknown>): string | null {
  const file = (payload.model_glb ?? payload.model_mesh ?? payload.glb) as FalFile | undefined
  return file?.url ?? null
}
