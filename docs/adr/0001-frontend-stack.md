# Frontend stack: client-rendered TanStack SPA + Supabase, packaged as a PWA

## Status

accepted

## Decision

Seibi is built as a **client-rendered SPA** using **TanStack Router + Vite** (not Next.js
and not TanStack Start), with **Supabase** as the backend (Postgres + Apple/Google auth),
**TanStack Query** for data fetching, **Tailwind + Radix** for UI, and **Paraglide JS**
for i18n (Spanish-only today, i18n-ready). It ships as an **installable PWA** now, with
**Capacitor** kept as an escape hatch to package the same bundle for the App/Play stores
later. The repo is a **single app today but monorepo-ready** via pnpm workspaces.

## Context / why

- The app is **login-gated**, so it has no SEO surface — SSR (Next.js / TanStack Start)
  adds server infrastructure with little payoff here.
- Capacitor ships a **static client bundle into a native webview** (no Node server runs
  inside the app), so a pure client SPA is the natural target. TanStack Router + Vite is
  that by default; Start's server functions would be largely wasted.
- Supabase provides **Apple/Google OAuth out of the box** (already mocked in the
  prototype) plus Postgres for relational maintenance data, keeping the frontend a clean
  SPA and removing any need for Start's server layer.
- Offline is **read-only for launch**: TanStack Query with a persisted IndexedDB cache
  lets users view vehicles/history/reminders offline. Full offline editing (local-first
  sync via e.g. PowerSync) is deferred; it slots into Supabase later if needed.

## Considered options

- **Next.js** — rejected: SSR/SEO wasted on a login-gated app; heavier for a
  Capacitor/PWA target.
- **TanStack Start** — rejected: its server functions/SSR don't run in a Capacitor
  webview and overlap with Supabase; SPA output would use little of what Start adds.
- **Full local-first sync (PowerSync/RxDB) from day one** — deferred: conflict resolution
  and complexity outweigh the launch value of offline *editing*.
- **Full component library (MUI/Chakra/Mantine)** — rejected: fights Seibi's bespoke
  mobile design and inflates the bundle.

## Consequences

- Marketing page (`index.html`) stays a static file for now; promote to a real
  `apps/marketing` when it needs a framework.
- Shared code will live in `packages/*` once a second app appears; use direct/deep imports
  (no barrel files) to protect bundle size.
- Upgrading offline reads → offline writes means adopting a local-first sync layer later,
  a non-trivial but contained change.
