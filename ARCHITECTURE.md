# Architecture

> This file describes how Seibi works now. Change it in the same PR that
> changes the behaviour. The reasons behind decisions live in Linear
> («Historial de decisiones»).

Domain words (Vehicle, Service, Reminder…) are defined in
[`CONTEXT.md`](./CONTEXT.md). This file says where they live in code and
which rules the code must keep.

## Overview

Seibi tracks vehicle maintenance: Services done on a Vehicle, Reminders
for what is due next, and Estimates of what it might cost. It is a
login-gated mobile app on a Supabase backend.

Seibi is moving from a PWA to a native app:

- **Today:** the PWA in `apps/app` is live and **frozen**. No new work
  lands there except exceptions the owner approves (e.g. SEI-51, Inicio
  v3). It is shut down once the native app is in both stores (SEI-49).
- **Target:** a native iOS and Android app built with **Expo + React
  Native** in `apps/mobile` (`@seibi/mobile`). It does not exist yet; it
  is built in the Linear milestone «1 · Base nativa» (SEI-40…SEI-47).

The backend does not change in the move: Supabase, the Edge Functions,
and `packages/maintenance-engine` serve both apps.

## Repo layout

pnpm workspaces (`apps/*`, `packages/*`).

| Path | Status | What it is |
| --- | --- | --- |
| `apps/app` (`@seibi/app`) | exists, frozen | PWA: Vite + TanStack Router SPA |
| `apps/mobile` (`@seibi/mobile`) | target (SEI-41) | Expo + React Native app |
| `packages/maintenance-engine` | exists | Reminder math shared by the apps and Edge Functions |
| `supabase/migrations/` | exists | Schema, RLS, storage buckets, cron |
| `supabase/functions/` | exists | Edge Functions (Deno) |
| `CONTEXT.md` | exists | Domain glossary + English ↔ schema ↔ Spanish map |
| Turborepo (`turbo.json`) | target (SEI-40) | Task running and caching |

Shared code goes in `packages/*`, imported by direct path (no barrel
files).

## Stack

| Layer | Today (PWA, frozen) | Target (native) |
| --- | --- | --- |
| UI runtime | React, Vite, TanStack Router | Expo (latest SDK), React Native, Expo Router, React Compiler, New Architecture |
| Data | TanStack Query → Supabase | TanStack Query → Supabase |
| Styling | Tailwind + Radix | Unistyles 3 |
| Copy / i18n | Inline Spanish strings, Paraglide compiled | `i18next` + `expo-localization` |
| Auth | Supabase OAuth (Apple, Google) | Supabase, native Apple + Google |
| Push | Web Push (VAPID, `push_subscriptions`) | Expo Push Service (`push_tokens`) |
| Ship | Dockerfile, deployed by Dokploy | EAS Build + EAS Update |

## Backend

**Supabase** hosts Postgres (RLS on every user table), auth (Apple and
Google), Storage, `pg_cron`, and the Edge Functions. Apps talk to Postgres
directly through the Supabase client; anything that needs a secret, a
third-party call, or a schedule runs in an Edge Function, never in an app.

### Edge Functions (`supabase/functions/`)

| Function | Does | Called by |
| --- | --- | --- |
| `vehicle-lookup` | Maintenance schedule + body type for brand/model/year/engine | app (user JWT) |
| `vehicle-render` | Starts or reuses a Model render; polling fallback | app (user JWT) |
| `vehicle-render-webhook` | Receives fal results | fal (HMAC token in URL) |
| `estimates` | Estimate lookup | app (user JWT) |
| `chat` | Follow-up questions scoped to the user's Vehicles | app (user JWT) |
| `reminders-daily` | Computes due Reminders and sends push | `pg_cron`, 14:00 UTC (`x-cron-secret`) |
| `delete-account` | Deletes the user and everything they own | app (user JWT) |

Shared helpers live in `supabase/functions/_shared/`. Details and setup:
[`supabase/functions/README.md`](./supabase/functions/README.md).

### AI providers

- **OpenAI** — Responses API with the `web_search` tool; model from
  `OPENAI_MODEL`. Used by `vehicle-lookup`, `estimates`, `chat`.
- **fal** — image generation only (queue + webhook), for Model renders.
- AI results are cached in Postgres or Storage and shared across users
  when not personal (schedules, renders, Estimates by city).
- Per-user daily limit on AI calls: `AI_DAILY_LIMIT` (default 20), tracked
  in `ai_usage`.

### Secrets

Server secrets live only in Supabase secrets: `OPENAI_API_KEY`,
`FAL_KEY`, `CRON_SECRET`, `RENDER_WEBHOOK_SECRET`, VAPID keys (until
SEI-49). Never put a secret in a client env var (`VITE_*`,
`EXPO_PUBLIC_*`). Client env holds only the Supabase URL, anon key, and
optional public keys (Sentry DSN, VAPID public key).

### Deploy

On merge to `main`, `.github/workflows/migrate-production.yml` applies
pending migrations to production and deploys the Edge Functions.
`.github/workflows/app-pr.yml` runs lint, typecheck, unit tests, `deno
check` on Edge Functions, and the PWA build on every PR.

## Domain rules that live in code

- **Language split.** Schema, code, commits, PRs, and docs are English.
  Persisted enums use English codes (`maintenance`, `repair`, `km`);
  free text (shop, notes) is stored as typed. The UI maps codes to the
  user's language. Names per concept: `CONTEXT.md` mapping table.
- **Odometer measure** is on the Vehicle (`vehicles.odometer_measure`,
  `km` | `mi`, default `km`). Every Mileage reading uses it; there is no
  per-reading measure and no silent conversion of history.
- **Mileage writes** are enforced in the app, not in Postgres. A reading
  recorded with a Service may be any number (backfill). A standalone
  reading is dated today and must be strictly greater than the current
  odometer. An edit may set any non-negative number. Do not add an
  insert trigger on `mileage_readings`: a Service writes its reading
  first, so Postgres cannot tell a backfill from an update.
- **Current odometer** is not stored. It is the reading with the latest
  calendar date; on ties, the highest number (`currentOdometer` in
  `@seibi/maintenance-engine/odometer`).
- **Reminders are derived, not stored**, by
  `packages/maintenance-engine` (pure TS, no I/O; exports `./days`,
  `./odometer`, `./reminders`, `./mileage-prompt`). The apps and
  `reminders-daily` (relative import, explicit `.ts` paths for Deno) use
  the same code. Only hand-written Reminders (`reminders`) and per-Reminder
  state/snoozes (`reminder_states`) are stored.
  - Due = whichever runs out first: distance or time since the last
    Service item for the task. Distance is projected from the Usage rate
    (recent readings, else Routines).
  - Status: `ok`, `soon` (within 10% of the distance interval or 30
    days), `overdue`, `unknown` (no last Service known).
  - Vehicle health = worst status among dated Reminders; `unknown` ones do
    not count (they are collected by "Completa tu historial").
- **Maintenance schedules** come from `vehicle-lookup`: intervals per
  Maintenance task **with a source URL each**, stored once per
  brand/model/year/engine in `maintenance_schedules` and reused by every
  matching Vehicle. Severe intervals are stored when the source gives
  them; the engine uses them when the Usage rate or Routines call for it.
  With no citable source, Seibi shows a general schedule labeled
  "Recomendación general, no específica de tu modelo" — never a guess
  presented as the manufacturer's.
- **Model renders are an image only.** `vehicle-render` generates a fal
  studio image (the poster) per brand/model/year/color, stored in the
  public `vehicle-renders` bucket and `model_renders`; each combination
  is generated once. Until the poster exists the Vehicle shows a
  body-type silhouette. The webhook is the fast path; while generating,
  the app calls `vehicle-render` every 20 s, which after 20 s asks fal's
  queue itself and after 20 min marks the render failed. A render is an
  illustration, never called a photo. Car art and paint presets stay as
  they are. (The image-to-3D/GLB step still in code is being removed:
  SEI-48. The `model_renders.glb_path` column stays until SEI-49: the
  frozen PWA still selects it.)
- **Navigation.** The floating dock is **Inicio · Mi flota · [+] · Avisos
  · Estimados**. [+] opens quick actions (record a Service, update
  Mileage, plan an Appointment). Service history lives in each Vehicle's
  detail. Perfil opens from the header avatar.

## Native app standards (`apps/mobile`)

The migration's order, scope and tickets are in
[`docs/PLAN.md`](./docs/PLAN.md); design rules are in
[`docs/DESIGN.md`](./docs/DESIGN.md).

- **Default:** as native as possible: system sheets, haptics and native
  controls over hand-built web-style equivalents.
- **Expo:** SDK 58, Continuous Native Generation (no `ios/` or `android/`
  in git), Expo Router, React Compiler, New Architecture, typed routes.
  Development builds (no Expo Go). Add packages with `npx expo install`.
- **Variants:** one dynamic `app.config.ts`, selected by
  `EXPO_PUBLIC_APP_VARIANT`; installable side by side:
  `com.seibiapp.app.dev` (Seibi Dev) and `com.seibiapp.app` (Seibi). One
  EAS slug. URL scheme `seibi`.
- **Builds:** EAS Build profiles `development` (Seibi Dev), `preview` and
  `production` (both build Seibi). Remote app versions with
  `autoIncrement`.
- **Updates:** EAS Update with the `fingerprint` runtime policy. An OTA
  hook checks on launch and on return to foreground and offers a restart.
  It ships before the first store release.
- **Navigation:** four `NativeTabs` (Inicio · Mi flota · Avisos ·
  Estimados), each with its own stack holding its detail screens. A
  floating [+] above the tab bar (glass on iOS, Material on Android) opens
  the quick actions in a `formSheet`. Perfil opens from the header avatar.
- **Styling:** Unistyles 3, typed `light` and `night` themes with role
  names (`surface`, `ink`, `line`…), values from `docs/DESIGN.md`. SEI-42
  starts with a spike on SDK 58; if Unistyles fails it, the fallback is
  plain `StyleSheet` + tokens with the same role names. Components use
  role names, never raw values.
- **Auth:** Supabase with native Apple (`expo-apple-authentication`) and
  native Google (`@react-native-google-signin/google-signin`), both via
  `signInWithIdToken`. The session is encrypted at rest: the key in
  `expo-secure-store`, the data in local storage (a session can exceed
  SecureStore's ~2 KB value limit). `startAutoRefresh` / `stopAutoRefresh`
  follow foreground/background; routes are gated with `Stack.Protected`.
  Email + password sign-in exists only in `development` and `preview`
  builds, for testing.
- **Push:** Expo Push Service via `expo-notifications`; device tokens in a
  `push_tokens` table. `reminders-daily` sends to Expo and keeps Web Push
  until the PWA is shut down (SEI-47, SEI-49).
- **i18n:** `i18next` + `expo-localization` with typed keys. Spanish only
  at launch, English later. The Spanish UI uses the Spanish column of the
  `CONTEXT.md` mapping; the English UI uses the English terms.
- **Data:** TanStack Query against Supabase directly, as in the PWA, one
  folder per domain with query key factories. Tables are typed by the
  generated Supabase types; Zod validates Edge Function responses, NHTSA
  vPIC and forms.
- **Accessibility:** WCAG 2.2 AA (rules in `docs/DESIGN.md`).
- **CI:** typecheck, lint and three check scripts (no raw values,
  contrast, no untranslated text) on every PR (SEI-46). E2E with Maestro
  comes after launch (SEI-52).
- **Paid features** (RevenueCat, Superwall) start after the launch.

### Libraries

What replaces each part of the PWA. Install with `npx expo install` so
versions match the SDK.

| Need | PWA | Native |
| --- | --- | --- |
| Routing | TanStack Router | Expo Router (`NativeTabs`, stacks, `formSheet`, `Stack.Protected`) |
| Styling | Tailwind + `index.css` | Unistyles 3 |
| Data | TanStack Query + supabase-js | Same |
| Validation | — | Zod, at Edge Function, vPIC and form boundaries |
| Copy / i18n | Paraglide | `i18next` + `expo-localization` |
| Errors | `@sentry/react` | `@sentry/react-native` |
| Push | Web Push + service worker | `expo-notifications` |
| New versions | Service worker update prompt | `expo-updates` (EAS Update) |
| Motion | `motion` | `react-native-reanimated` + `react-native-gesture-handler` |
| Icons | `lucide-react` | `expo-symbols` (SF Symbols / Material Symbols) |
| Vector art | Inline SVG | `react-native-svg` |
| Sheets | Custom `Sheet` | Expo Router `formSheet` |
| Pickers, toggles, menus, date picker | Custom fields, `Combobox` | `@expo/ui` |
| Toasts | `ToastProvider` | `sonner-native` |
| Confirmations | Custom dialogs | The native alert |
| Local preferences | `localStorage` | `expo-sqlite` kv-store (never AsyncStorage) |
| Session at rest | supabase-js default | Encrypted store, key in `expo-secure-store` |
| Images | `<img>` | `expo-image` |
| Long lists | DOM lists | FlashList |
| Forms and keyboard | Browser | `react-native-keyboard-controller` |
| Invoice photo | `<input type="file">` | `expo-image-picker` |
| Links, `mailto:` | `<a>` | `expo-web-browser`, `Linking` |
| Haptics, splash, fonts | — | `expo-haptics`, `expo-splash-screen`, `expo-font` |
| Glass surfaces | CSS blur | `expo-glass-effect` |
| E2E | Playwright | Maestro on EAS Workflows (after launch) |

## Working rules

- **Dev environment:** never run Supabase locally (no `supabase start`,
  no Docker). The hosted **seibi-dev** project is the dev environment.
- **Changes go through PRs.** No direct pushes to `main` unless the owner
  says so. Merging to `main` deploys migrations and Edge Functions to
  production.
- **Linear** (team Seibi, project «App móvil Seibi») is the tracker; all
  Linear content is Spanish. See
  [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md).
- **Language:** English for code, schema, commits, PRs, and repo docs;
  Spanish for Linear and the Spanish UI.
- **No ADRs.** A decision updates this file in place, in the same PR; the
  why goes to the Linear document «Historial de decisiones» (newest entry
  on top). `CONTEXT.md` changes only when a term changes.

## Open items

The migration's open tickets and questions are in
[`docs/PLAN.md`](./docs/PLAN.md). Outside it:

- SEI-50 — stop using local Supabase everywhere (the README and
  `supabase/functions/README.md` still describe a local stack).
