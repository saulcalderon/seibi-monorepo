# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## This repo does not use `docs/adr/`

This repo does not use ADRs or `docs/adr/`. When a skill (e.g.
`domain-modeling`, `grill-with-docs`, `improve-codebase-architecture`) says
to read, write, or offer an ADR, instead:

- Update **`ARCHITECTURE.md`** in place to describe the new current state,
  in the same PR that changes the behaviour. No history, no "superseded".
- Record the reasons — options considered, trade-offs — in the Linear
  document **«Historial de decisiones»** in project **«App móvil Seibi»**
  (Spanish, newest entry on top).
- **`CONTEXT.md` stays a glossary only.** Update it when a term is added
  or sharpened, never with implementation decisions.

This override wins over the defaults in `.agents/skills/**` (vendored; do
not edit them).

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary and the English ↔ schema ↔ Spanish mapping table.
- **`ARCHITECTURE.md`** at the repo root — stack, backend, domain rules that live in code, native app standards, working rules, and open items.

If a `CONTEXT-MAP.md` ever appears at the root, it points at one `CONTEXT.md` per context; read each one relevant to the topic.

## File structure

```
/
├── AGENTS.md
├── CONTEXT.md
├── ARCHITECTURE.md
├── apps/
├── packages/
└── supabase/
```

## Use the glossary's vocabulary

`CONTEXT.md` is English. People-facing writing (Linear, Spanish UI, product
copy) uses the Spanish column of the mapping table in `CONTEXT.md`
(Vehículo, not Vehicle); the English UI uses the English terms. Technology
(tables, columns, enums, commits, tests) uses the English identifier
(`maintenance`, not `mantenimiento`). Free text is stored as entered.
Don't drift to glossary synonyms.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`, which updates `CONTEXT.md` here, not an ADR).

## Flag conflicts with ARCHITECTURE.md

If your output contradicts `ARCHITECTURE.md` or `CONTEXT.md`, surface it explicitly rather than silently overriding:

> _Contradicts ARCHITECTURE.md (Model renders are an image only) — but worth reopening because…_

If the change is agreed, update `ARCHITECTURE.md` in the same PR and add the why to «Historial de decisiones» in Linear (newest entry on top).
