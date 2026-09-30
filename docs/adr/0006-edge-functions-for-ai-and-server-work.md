# Server work runs in Supabase Edge Functions; AI goes through OpenAI and fal

## Status

accepted

## Decision

Anything that needs a secret, a third-party call, or a schedule runs in a
**Supabase Edge Function** (Deno), not in the SPA:

- `vehicle-lookup` — Maintenance schedule and body type for a brand, model,
  year, and engine (OpenAI with web search).
- `vehicle-render` / `vehicle-render-webhook` — Model render generation on
  fal (queue + webhook).
- `estimates` — Estimate lookup (OpenAI with web search).
- `chat` — follow-up questions scoped to the user's Vehicles.
- `reminders-daily` — computes due Reminders and sends Web Push; run by
  `pg_cron`.
- `delete-account` — deletes the user and everything they own.

The language model is **OpenAI** (Responses API with the `web_search`
tool), model set by `OPENAI_MODEL`. 3D is **fal** only. Keys live in
Supabase secrets (`OPENAI_API_KEY`, `FAL_KEY`, VAPID keys) and never in a
`VITE_` variable.

## Context / why

ADR-0001 kept Seibi a pure SPA with no server of our own. That still holds
for rendering: the SPA stays client-rendered and Capacitor-friendly. But
schedule lookups, Estimates, 3D generation, and push need secrets and
cron, and Supabase already hosts Edge Functions next to the database and
its RLS. No new host, no new deploy target.

## Considered options

- **Call OpenAI / fal from the browser** — rejected: leaks keys, no rate
  limit, no shared cache.
- **A separate Node API (Dokploy)** — rejected: a second deploy target for
  work Edge Functions already do.
- **Anthropic instead of OpenAI** — not chosen: the team uses OpenAI.

## Consequences

- Every AI result is cached in Postgres or Storage and shared across users
  where it is not personal (schedules, renders, Estimates by city).
- Per-user daily limits guard cost (20 AI lookups per user per day).
- Edge Functions deploy from CI on merge to `main`, next to migrations.
