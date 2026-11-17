# Seibi

Seibi is a mobile app for tracking vehicle maintenance: Services done,
Reminders for what is due, and cost Estimates. Supabase backend; the PWA in
`apps/app` is frozen while the native Expo app (`apps/mobile`) is built.

## Read first

1. `AGENTS.md` (this file)
2. [`CONTEXT.md`](./CONTEXT.md) — domain glossary and the English ↔ schema ↔ Spanish names
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how Seibi works now: stack, backend, rules, working rules
4. [`docs/PLAN.md`](./docs/PLAN.md) — the PWA → native migration: scope, tickets, order, launch, gotchas

Read [`docs/DESIGN.md`](./docs/DESIGN.md) before any UI work: tokens, components, accessibility rules.

## Ticket loop

Every change starts from a Linear ticket and lands as one PR. Devin orchestrates the loop and merges.

1. **Pick** the next ticket in `docs/PLAN.md` order. At most 3 tickets are In Progress; a new one starts only after one merges. Move it to In Progress and branch from its Linear branch name.
2. **Plan.** Read the ticket's in/out and the PWA screen it ports, post a short plan as a Linear comment (what is ported, which files, the proof tier) and keep going. Ask Saul first only when the scope is unclear, the PWA behaviour looks wrong, the change needs a new native module (a new binary, not an OTA update) or a migration, or it contradicts `ARCHITECTURE.md`.
3. **Build.** `tdd` for logic (form rules, Mileage rules, data transforms). Run `pnpm check` and the affected tests. Open a draft PR early; CI runs on every push.
4. **Review** with `code-review`, once, on the full diff: Standards, and Spec against the ticket and the PWA screen.
5. **Prove** it at its tier (below), on the final commit.
6. **Merge:** squash into `main` when CI is green, the proof is in the PR and no review finding is open. Tell Saul after a merge that deploys migrations or Edge Functions; a destructive production change (dropping a column, deleting data) waits for his OK. Then close the ticket in Linear (`docs/agents/issue-tracker.md`).

## Prove it works

Proof comes from the running app, driven locally with the `verify` skill (`apps/mobile/.claude/skills/verify/`) before merge. CI runs everything that needs no simulator; Maestro runs only locally. "It compiles" or "tests pass" proves only tier 0 (`principle-prove-it-works`).

| Tier | Change | Proof |
| --- | --- | --- |
| 0 | Docs, CI, refactors covered by tests, engine logic | `pnpm check`, `pnpm test`, CI |
| 1 | A small UI change or fix | One iOS run of an existing flow, or screenshots |
| 2 | A new screen, or a journey that saves data | A Maestro flow for the happy path, an iOS video, one Android run, a read-only seibi-dev query showing the saved row, and the feature's file in the `verify` skill's `features/` map |
| 3 | `supabase/`: migrations, Edge Functions, RLS | `deno test`, applied to seibi-dev first, and a read-only seibi-dev query |

- **Android** runs for tier 2 and for any change to platform-specific code (`*.ios.tsx`, `@expo/ui`, glass, the floating [+]). Everything else is proven on iOS.
- **Edge cases** (night, the largest text size, Reduce Motion, `break-ui`) get one pass in milestone «3 · Prueba en dispositivos», and the `features/` map one `maintain-verification-skill` pass per milestone.
- The PR's Verification section names each run's evidence folder. For tier 2, attach the video to the Linear ticket and link it from the PR.

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

### Mobile app skills (Expo / React Native)

Installed from `expo/skills`, `emilkowalski/skills`, `Appllama/appllama-skills` and `michael-denyer/pstack-claude` (see `skills-lock.json`). Each source has one job:

- **Appllama, quality bar:** `appllama-app-design-skill` sets the bar a mobile screen must meet before it ships: HIG fidelity, navigation semantics, motion, simulator check. Design direction comes from `docs/DESIGN.md`, not from Appllama: the port keeps the PWA's look, and the Paper redesign starts after the port.
- **Expo, best practices:** start every Expo/EAS task with `expo-overview`. It routes to `expo-router`, `expo-native-ui`, `expo-ui`, `expo-design-system`, `expo-data-fetching`, `expo-web-to-native` and the `eas-*` skills.
- **Emil Kowalski, animation and craft:** `expo-animation` builds motion. It is Emil's `animate-expo`, maintained by Expo. `choreograph`, `find-animation-opportunities`, `improve-animations`, `remove-animations`, `apple-design` and `break-ui` review and refine.
- **pstack, proof:** `create-verification-skill` generates the app's `verify` skill (SEI-41), `maintain-verification-skill` keeps its feature map current, and `principle-prove-it-works` applies before calling any task done. See "Prove it works" above.

Seibi decisions win over skill defaults:

- **Styling is Unistyles 3.** Where a skill says inline styles, `StyleSheet.create` from `react-native`, NativeWind or Tailwind, use Unistyles' `StyleSheet.create` with theme tokens.
- **Native first.** Prefer system UI and native SDKs, `@expo/ui` included, over web-style or JS-only versions.
- **No local Supabase.** Use the hosted dev project; never run `supabase start`.
