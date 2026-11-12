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

## Prove it works

A PR that changes what a user sees or does must be proven in the running app before it merges:

- Drive it with the `verify` skill in `apps/mobile/.claude/skills/verify/` (generated in SEI-41 with `create-verification-skill`). Until that exists, record the simulator yourself.
- Evidence: a video of the journey, screenshots, and a read-only seibi-dev query showing the saved data. Attach the video to the Linear ticket and link it from the PR.
- Add or update the feature's file in the `verify` skill's `features/` map in the same PR.
- "It compiles" or "tests pass" is not proof (`principle-prove-it-works`).

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
