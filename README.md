# Seibi

Mobile-first app for tracking vehicle maintenance: log work done on a vehicle, get reminders when the next service is due, and estimate costs. Domain glossary is English — see [`CONTEXT.md`](./CONTEXT.md), whose mapping table gives the Spanish names used in Linear and the Spanish UI. How the system works now: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

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

> Being retired: the hosted **seibi-dev** project is the dev environment and
> agents must not run Supabase locally (see [`ARCHITECTURE.md`](./ARCHITECTURE.md),
> SEI-50 / SEI-52). The commands below remain until E2E moves to seibi-dev.

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

Run from the repo root. Every command except `pnpm preview` runs through
Turborepo (`turbo.json`): a second run with no changes comes from the
local cache in `.turbo/`.

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server (`@seibi/app`) |
| `pnpm build` | Production build of every package that has one |
| `pnpm preview` | Preview the production build |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Unit tests (maintenance engine) |
| `pnpm check` | The native app's gate, as in CI: its typecheck, lint and check scripts (`apps/mobile/scripts/`) |
| `pnpm --filter @seibi/app test:e2e` | Playwright smoke test (needs local Supabase) |
| `pnpm --filter @seibi/mobile ios` | Build Seibi Dev, install it on the iOS Simulator, start Metro (needs Xcode) |
| `pnpm --filter @seibi/mobile android` | The same on a running Android emulator (needs the Android SDK and Java 17) |
| `pnpm --filter @seibi/mobile start` | Metro only, for a Seibi Dev build that is already installed |

The native app uses development builds, not Expo Go. Its variants, EAS
profiles and update flow are in [`ARCHITECTURE.md`](./ARCHITECTURE.md) →
"Native app standards"; proving a change in it uses the `verify` skill in
`apps/mobile/.claude/skills/verify/`.

## Structure

```
apps/app/                     # TanStack Router + Vite SPA (PWA, frozen)
apps/mobile/                  # Expo + React Native app (native, being built)
packages/maintenance-engine/  # Reminder math shared by the app and Edge Functions
supabase/migrations/          # Schema + RLS
supabase/functions/           # Edge Functions (OpenAI, fal, push, account deletion)
CONTEXT.md                    # Domain language + Spanish names
ARCHITECTURE.md               # How Seibi works now
```

Stack overview: the live PWA is a client-rendered SPA (TanStack Router, TanStack Query, Tailwind, Paraglide) on Supabase; it is frozen while the native Expo app (`apps/mobile`) is built. Details in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Docker (optional)

Build from the repo root (Vite env vars are baked in at build time):

```bash
docker build -f apps/app/Dockerfile -t seibi-app \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_ANON_KEY=... \
  .
```
