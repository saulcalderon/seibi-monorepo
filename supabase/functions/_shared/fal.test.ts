// Run: cd supabase/functions && deno test --allow-env

import { deepStrictEqual, equal, notEqual } from 'node:assert/strict'
import { FAL_IMAGE_MODEL, submitPoster, webhookToken } from './fal.ts'
import { hmac } from './keys.ts'

const SECRET = 'test-webhook-secret'

function withEnv(vars: Record<string, string>, run: () => Promise<void>) {
  const before = Object.fromEntries(Object.keys(vars).map((k) => [k, Deno.env.get(k)]))
  for (const [k, v] of Object.entries(vars)) Deno.env.set(k, v)
  return run().finally(() => {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) Deno.env.delete(k)
      else Deno.env.set(k, v)
    }
  })
}

Deno.test('a render submits one image job to fal, with a webhook that names no 3D step', async () => {
  await withEnv(
    { FAL_KEY: 'test-key', RENDER_WEBHOOK_SECRET: SECRET, SUPABASE_URL: 'https://dev.example.co' },
    async () => {
      Deno.env.delete('PUBLIC_FUNCTIONS_URL')
      const calls: string[] = []
      const real = globalThis.fetch
      globalThis.fetch = ((input: string | URL | Request) => {
        calls.push(String(input))
        return Promise.resolve(Response.json({ request_id: 'req-1' }))
      }) as typeof fetch
      try {
        const requestId = await submitPoster('render-1', {
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          color: 'red',
        })
        equal(requestId, 'req-1')
      } finally {
        globalThis.fetch = real
      }

      equal(calls.length, 1)
      const submitted = new URL(calls[0])
      equal(`${submitted.origin}${submitted.pathname}`, `https://queue.fal.run/${FAL_IMAGE_MODEL}`)
      const webhook = new URL(submitted.searchParams.get('fal_webhook')!)
      equal(`${webhook.origin}${webhook.pathname}`, 'https://dev.example.co/functions/v1/vehicle-render-webhook')
      deepStrictEqual([...webhook.searchParams.keys()], ['render', 'token'])
      equal(webhook.searchParams.get('render'), 'render-1')
      equal(webhook.searchParams.get('token'), await webhookToken('render-1'))
    },
  )
})

Deno.test('webhook tokens: a poster job from before SEI-48 verifies, a leftover 3D job does not', async () => {
  await withEnv({ RENDER_WEBHOOK_SECRET: SECRET }, async () => {
    const token = await webhookToken('render-1')
    equal(token, await hmac(SECRET, 'render-1:poster'))
    notEqual(token, await hmac(SECRET, 'render-1:glb'))
  })
})
