# Seibi

Seibi is a mobile app for tracking vehicle maintenance: Services done,
Reminders for what is due, and cost Estimates. Supabase backend; the PWA in
`apps/app` is frozen while the native Expo app (`apps/mobile`) is built.

## Read first

1. `AGENTS.md` (this file)
2. [`CONTEXT.md`](./CONTEXT.md) — domain glossary and the English ↔ schema ↔ Spanish names
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how Seibi works now: stack, backend, rules, working rules

## No ADRs

This repo does not use ADRs or `docs/adr/`. When a skill (e.g.
`domain-modeling`, `grill-with-docs`, `improve-codebase-architecture`) says
to write or offer an ADR, instead update `ARCHITECTURE.md` in place to
describe the new current state, and record the reasons in the Linear
document «Historial de decisiones» (project «App móvil Seibi»; Spanish,
newest entry on top). `CONTEXT.md` stays a glossary only. Make the
`ARCHITECTURE.md` change in the same PR that changes the behaviour.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in Linear (team Seibi, project App móvil Seibi) via the Linear MCP. All Linear content is written in Spanish. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `ARCHITECTURE.md` at the repo root (no
`docs/adr/`). Glossary and schema are English; Linear and the Spanish UI use
the Spanish names in the `CONTEXT.md` mapping table. See
`docs/agents/domain.md`.
