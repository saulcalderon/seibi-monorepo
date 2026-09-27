# Seibi

Mobile-first app for tracking vehicle maintenance: log work done on a vehicle, get reminders when the next service is due, and estimate costs. Domain glossary is English — see [`CONTEXT.md`](./CONTEXT.md). Linear and UI use Spanish names from [ADR-0002](./docs/adr/0002-english-tech-spanish-people.md).

## Prerequisites

- **Node.js** `24.x` (see `.nvmrc`)
- **pnpm** `11.3.0` (pinned via `packageManager` in `package.json`)

Enable pnpm with Corepack:

```bash
corepack enable
corepack prepare pnpm@11.3.0 --activate
```

## Setup

```bash
pnpm install
```

### Environment

Copy the example env file and fill in your Supabase project keys (Settings → API):

```bash
cp apps/app/.env.example apps/app/.env.local
```

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_VAPID_PUBLIC_KEY` | Web Push public key (optional; notifications stay off without it) |
| `VITE_SENTRY_DSN` | Sentry DSN (optional; Sentry stays off without it) |

Without the Supabase pair, the app starts but auth/data calls fail. Server
secrets (OpenAI, fal, VAPID private key) live in Supabase, not here — see
[`supabase/functions/README.md`](./supabase/functions/README.md).

### Local Supabase

Docker must be running.

```bash
npx supabase start                 # database, auth, storage, functions runtime
npx supabase test db               # pgTAP: schema + RLS
pnpm --filter @seibi/app dev --mode e2e   # app against local Supabase
```

`--mode e2e` reads `apps/app/.env.e2e` (the public local demo keys). In
development the login screen also offers an email login, so you do not need
Google OAuth locally.

## Scripts

Run from the repo root:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server (`@seibi/app`) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Unit tests (maintenance engine) |
| `pnpm --filter @seibi/app test:e2e` | Playwright smoke test (needs local Supabase) |

## Structure

```
apps/app/                     # TanStack Router + Vite SPA (PWA)
packages/maintenance-engine/  # Reminder math shared by the app and Edge Functions
supabase/migrations/          # Schema + RLS
supabase/functions/           # Edge Functions (OpenAI, fal, push, account deletion)
docs/adr/          # Architecture decision records
CONTEXT.md         # Domain language
```

Stack overview: client-rendered SPA, Supabase backend, TanStack Query, Tailwind, Paraglide i18n. Details in [`docs/adr/0001-frontend-stack.md`](./docs/adr/0001-frontend-stack.md).

## Docker (optional)

Build from the repo root (Vite env vars are baked in at build time):

```bash
docker build -f apps/app/Dockerfile -t seibi-app \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_ANON_KEY=... \
  .
```
