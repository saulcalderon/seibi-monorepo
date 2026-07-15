# Seibi

Mobile-first app for tracking vehicle maintenance: log work done on a vehicle, get reminders when the next service is due, and estimate costs. Domain language is Spanish — see [`CONTEXT.md`](./CONTEXT.md).

## Prerequisites

- **Node.js** `>= 20`
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

Without these, the app starts but Supabase auth/data calls will fail.

## Scripts

Run from the repo root:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server (`@seibi/app`) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | Lint all packages |

## Structure

```
apps/app/          # TanStack Router + Vite SPA (PWA)
packages/          # Shared packages (reserved; empty for now)
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
