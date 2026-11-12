// Run: cd supabase/functions && deno test --allow-env
//
// Both ways a render finishes (fal's webhook and vehicle-render's polling)
// go through completePoster, so these tests pin what a finished poster does:
// it is stored, the render becomes `ready`, and nothing else is sent to fal.

import { deepStrictEqual, equal, ok, rejects } from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { FAL_IMAGE_MODEL } from './fal.ts'
import { completePoster, failPoster, pollPoster } from './renderPoster.ts'

type Write = { table: string; values: Record<string, unknown>; filters: Array<[string, unknown]> }
type Upload = { bucket: string; path: string; contentType?: string }

/** Records the writes the code under test makes through the Supabase client. */
function fakeDb({ claimed }: { claimed: boolean }) {
  const writes: Write[] = []
  const uploads: Upload[] = []
  const db = {
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, _bytes: Uint8Array, opts?: { contentType?: string }) => {
          uploads.push({ bucket, path, contentType: opts?.contentType })
          return Promise.resolve({ error: null })
        },
      }),
    },
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => {
        const write: Write = { table, values, filters: [] }
        writes.push(write)
        const builder = {
          eq: (column: string, value: unknown) => {
            write.filters.push([column, value])
            return builder
          },
          select: () => Promise.resolve({ data: claimed ? [{ id: 'render-1' }] : [], error: null }),
          then: (resolve: (v: { error: null }) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve({ error: null }).then(resolve, reject),
        }
        return builder
      },
    }),
  }
  return { db: db as unknown as SupabaseClient, writes, uploads }
}

/** Replaces fetch for one test and records every URL it was asked for. */
async function withFetch(
  respond: (url: string) => Response,
  run: (calls: string[]) => Promise<void>,
) {
  const calls: string[] = []
  const real = globalThis.fetch
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    return Promise.resolve(respond(url))
  }) as typeof fetch
  try {
    await run(calls)
  } finally {
    globalThis.fetch = real
  }
}

const RENDER = { id: 'render-1', render_key: 'toyota_corolla_2020_red' }
const POSTER_URL = 'https://v3.fal.media/files/abc/poster.png'
/** fal's file host answers with the image; its queue would accept any job. */
const fal = (url: string) =>
  new URL(url).hostname === 'queue.fal.run'
    ? Response.json({ request_id: 'unexpected-job' })
    : new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 })
const sentToFalQueue = (calls: string[]) => calls.filter((u) => new URL(u).hostname === 'queue.fal.run')

Deno.test('a finished poster makes the render ready and sends no other job to fal', async () => {
  const { db, writes, uploads } = fakeDb({ claimed: true })
  await withFetch(fal, async (calls) => {
    const finished = await completePoster(db, RENDER, { images: [{ url: POSTER_URL }] })

    equal(finished, true)
    deepStrictEqual(calls, [POSTER_URL])
    deepStrictEqual(sentToFalQueue(calls), [])
  })
  deepStrictEqual(uploads, [
    { bucket: 'vehicle-renders', path: 'toyota_corolla_2020_red/poster.png', contentType: 'image/png' },
  ])
  deepStrictEqual(writes, [
    {
      table: 'model_renders',
      values: { status: 'ready', poster_path: 'toyota_corolla_2020_red/poster.png', error: null },
      filters: [['id', 'render-1'], ['status', 'pending']],
    },
  ])
})

Deno.test('a poster another path already finished changes nothing and sends no job to fal', async () => {
  const { db, writes } = fakeDb({ claimed: false })
  await withFetch(fal, async (calls) => {
    const finished = await completePoster(db, RENDER, { images: [{ url: POSTER_URL }] })

    equal(finished, false)
    deepStrictEqual(sentToFalQueue(calls), [])
  })
  equal(writes.length, 1)
  ok(!('glb_path' in writes[0].values) && !('fal_request_id' in writes[0].values))
})

Deno.test('a poster hosted outside fal is refused before anything is fetched or written', async () => {
  const { db, writes, uploads } = fakeDb({ claimed: true })
  await withFetch(fal, async (calls) => {
    await rejects(
      completePoster(db, RENDER, { images: [{ url: 'https://example.com/poster.png' }] }),
      /unexpected file host/,
    )
    deepStrictEqual(calls, [])
  })
  deepStrictEqual(writes, [])
  deepStrictEqual(uploads, [])
})

Deno.test('a failed poster fails a pending render', async () => {
  const { db, writes } = fakeDb({ claimed: true })
  await failPoster(db, 'render-1', 'fal poster failed')
  deepStrictEqual(writes, [
    {
      table: 'model_renders',
      values: { status: 'failed', error: 'fal poster failed' },
      filters: [['id', 'render-1'], ['status', 'pending']],
    },
  ])
})

Deno.test("polling asks only the image model's queue", async () => {
  const hadKey = Deno.env.get('FAL_KEY')
  Deno.env.set('FAL_KEY', 'test-key')
  const base = `https://queue.fal.run/${FAL_IMAGE_MODEL.split('/').slice(0, 2).join('/')}/requests/req-1`
  try {
    await withFetch(
      (url) =>
        Response.json(url.endsWith('/status') ? { status: 'COMPLETED' } : { images: [{ url: POSTER_URL }] }),
      async (calls) => {
        const poll = await pollPoster('req-1')

        deepStrictEqual(poll, { state: 'done', payload: { images: [{ url: POSTER_URL }] } })
        deepStrictEqual(calls, [`${base}/status`, base])
      },
    )
  } finally {
    if (hadKey === undefined) Deno.env.delete('FAL_KEY')
    else Deno.env.set('FAL_KEY', hadKey)
  }
})
