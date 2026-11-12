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
  Native** in `apps/mobile` (`@seibi/mobile`). Its base exists (SEI-41:
  config, builds, updates, one placeholder start screen; SEI-43: i18n);
  the rest of the Linear milestone «1 · Base nativa» (SEI-42…SEI-47) and
  the port's screens are being built.

The backend does not change in the move: Supabase, the Edge Functions,
and `packages/maintenance-engine` serve both apps.

## Repo layout

pnpm workspaces (`apps/*`, `packages/*`).

| Path | Status | What it is |
| --- | --- | --- |
| `apps/app` (`@seibi/app`) | exists, frozen | PWA: Vite + TanStack Router SPA |
| `apps/mobile` (`@seibi/mobile`) | exists (base only) | Expo + React Native app; screens arrive with the port's tickets |
| `packages/maintenance-engine` | exists | Reminder math shared by the apps and Edge Functions |
| `supabase/migrations/` | exists | Schema, RLS, storage buckets, cron |
| `supabase/functions/` | exists | Edge Functions (Deno) |
| `CONTEXT.md` | exists | Domain glossary + English ↔ schema ↔ Spanish map |
| Turborepo (`turbo.json`) | exists | Runs `build`, `typecheck`, `lint`, `test` and `dev` across packages, with a local cache |

Shared code goes in `packages/*`, imported by direct path (no barrel
files).

pnpm uses its default isolated installs (no `nodeLinker: hoisted`); Expo
SDK 58 supports them, and Metro needs no monorepo config, so `apps/mobile`
has no `metro.config.js`. Apps depend on shared packages with
`workspace:*`. pnpm 11 holds back releases younger than a day
(`minimumReleaseAge`); when an install needs a fresher one (Expo patches
often are), pnpm adds that exact version to `minimumReleaseAgeExclude` in
`pnpm-workspace.yaml`.

## Stack

| Layer | Today (PWA, frozen) | Target (native) |
| --- | --- | --- |
| UI runtime | React, Vite, TanStack Router | Expo (latest SDK), React Native, Expo Router, React Compiler, New Architecture |
| Data | TanStack Query → Supabase | TanStack Query → Supabase |
| Styling | Tailwind + Radix | Unistyles 3 |
| Copy / i18n | Inline Spanish strings, Paraglide compiled | `i18next` + `react-i18next` + `expo-localization`, `es.json` |
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
`.github/workflows/app-pr.yml` runs lint, typecheck (PWA, native app,
shared packages), unit tests, `deno check` on Edge Functions, and the PWA
build on every PR.

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
  in git), Expo Router with routes in `src/app/`, React Compiler, New
  Architecture (the only architecture since SDK 55), typed routes.
  Development builds (no Expo Go). Add packages with `npx expo install`.
  The first binary already carries the native modules that after-launch
  tickets need (`expo-image-picker` for S12, `react-native-svg`,
  Reanimated), so those tickets can ship by OTA.
- **Variants:** one dynamic `app.config.ts`, selected by
  `EXPO_PUBLIC_APP_VARIANT` (`development` | `production`; unset means
  `production`, so an update published without it can't ship development
  behaviour; any other value fails the config). Installable side by side:

  | Variant | Name | Bundle id / package | URL scheme |
  | --- | --- | --- | --- |
  | `development` | Seibi Dev | `com.seibiapp.app.dev` | `seibi-dev` |
  | `production` | Seibi | `com.seibiapp.app` | `seibi` |

  Each variant has its own scheme so deep links open the right install.
  Only Seibi Dev registers the dev client's `exp+seibi` scheme. One EAS
  slug (`seibi`) and one project id, set once in `EAS_PROJECT_ID` at the
  top of `app.config.ts`; while it is empty, builds are local only and
  EAS Update is off. `pnpm start` / `ios` / `android` in `apps/mobile`
  run the `development` variant.
- **Builds:** `apps/mobile/eas.json`. Profiles `development` (dev client,
  Seibi Dev, internal), `development-simulator` (the same for the iOS
  Simulator, for Maestro in CI), `preview` (internal, builds Seibi) and
  `production` (store, Seibi, `autoIncrement`). Each profile has the EAS
  Update channel and EAS environment of its name. Remote app versions
  (`appVersionSource: remote`). Only `com.seibiapp.app` gets an App Store
  Connect record; `.dev` is for the dev client. `ITSAppUsesNonExemptEncryption`
  is `false` (`ios.config.usesNonExemptEncryption`).
- **Updates:** EAS Update with the `fingerprint` runtime policy.
  `useOTAUpdate` (`src/hooks/use-ota-update.ts`, called by the root
  layout) checks on launch and on return to foreground, downloads, then
  offers a restart in the native alert; a declined restart applies on the
  next cold launch. It does nothing in development builds or while EAS
  Update is off. It ships before the first store release.
- **Splash and fonts:** the native splash (logo mark on `#F2F4F7`, light in
  both themes like the PWA's) stays up until the root layout has loaded
  the fonts with `expo-font`: Archivo 300–700 and Geist Mono 400 from
  `@expo-google-fonts`. Clash Display joins once its licence is confirmed
  (SEI-42). A font that fails to load does not keep the app on the splash.
- **Navigation:** four `NativeTabs` (Inicio · Mi flota · Avisos ·
  Estimados; Estimados joins after launch with S10), each with its own
  stack holding its detail screens. A
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
- **i18n:** `i18next` + `react-i18next` + `expo-localization`, in
  `src/i18n/`. Spanish only at launch, English later. The Spanish UI uses
  the Spanish column of the `CONTEXT.md` mapping; the English UI uses the
  English terms.
  - **Every UI string is in `src/i18n/es.json` from a screen's first
    commit**: JSX text, spoken props (`accessibilityLabel`, `title`,
    `placeholder`…) and alert copy. Screens read it with
    `const { t } = useTranslation()`; code outside React uses the default
    export of `@/i18n` (`i18n.t`). Never call `t` at module scope. Keys are
    grouped by screen or feature (`start.title`, `update.restart`). SEI-46's
    strings check fails on text that doesn't come from i18n.
  - **Typed keys.** `src/i18n/i18next.d.ts` types `t()` from `es.json`, so
    a key that isn't in it fails `typecheck` (also with a default value:
    `strictKeyChecks`).
  - **Which language.** The user's stored choice, else the device's first
    language that Seibi speaks (the device only suggests), else Spanish.
    While only `es.json` exists every device gets Spanish. The choice is
    stored by `setLanguage` in the `expo-sqlite` kv-store (`language.v1`;
    `system` removes it). The language picker arrives with Perfil and
    English.
  - **Synchronous start.** The root layout imports `@/i18n`, which at
    module load reads the stored choice with `getItemSync` and inits
    i18next with the bundled JSON and `initAsync: false`. Init is done
    before the first render, so no frame shows a key.
  - **Native strings.** Text the OS draws for the app (iOS permission
    prompts) lives in `locales/<lang>.json` (Expo `locales`, which writes
    `<lang>.lproj/InfoPlist.strings`); `app.config.ts` also reads the
    Spanish file for the `expo-image-picker` plugin. The bundle's
    development region is `es`, and `expo-localization`'s
    `supportedLocales` (the `LANGUAGES` list in `app.config.ts`) limits
    the native localisations and the per-app language setting to the
    languages Seibi ships.
  - **Adding English** touches no screen: add `src/i18n/en.json` with
    every key of `es.json` and add `en` to `LANGUAGES` in
    `src/i18n/languages.ts` (typecheck fails while a key is missing); add
    `locales/en.json` and `en` to `locales` and `LANGUAGES` in
    `app.config.ts`. The `app.config.ts` part is native, so English ships
    in a new build, not by OTA alone.
- **Data:** TanStack Query against Supabase directly, as in the PWA, one
  folder per domain with query key factories. Tables are typed by the
  generated Supabase types; Zod validates Edge Function responses, NHTSA
  vPIC and forms.
- **Accessibility:** WCAG 2.2 AA (rules in `docs/DESIGN.md`).
- **CI:** `@seibi/mobile` has `typecheck` (`tsc --noEmit`) and `lint`
  (`expo lint --max-warnings 0`: ESLint with `eslint-config-expo`), which
  `app-pr.yml` runs through Turbo on every PR. It has no `build` script:
  native builds run on EAS. Typed-route declarations are generated by
  `expo start`, so CI's typecheck does not check route hrefs. Three check
  scripts (no raw values, contrast, no untranslated text) join in SEI-46.
  Maestro runs the `verify` skill's journeys in CI once the first iOS build
  exists (SEI-52).
- **Verification:** `apps/mobile/.claude/skills/verify/` (generated in
  SEI-41 with `create-verification-skill`) drives Seibi Dev on the iOS
  Simulator and the Android emulator (`seibi-pixel`) with Maestro, the way
  a user does: `scripts/verify.sh` launches, checks (`doctor`), drives a
  flow from `flows/` and cleans up. Each run keeps its video, screenshots
  and report in `~/seibi-verify/`, outside git. Every PR that changes what
  a user sees or does is proven with it before merge, with the saved data
  read from seibi-dev; `maintain-verification-skill` keeps its feature map
  (`features/`) current. The test sign-in it will need arrives with SEI-44.
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
| Copy / i18n | Paraglide | `i18next` + `react-i18next` + `expo-localization` (typed keys from `es.json`) |
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
| E2E | Playwright | Maestro: the `verify` skill locally, then CI after the first iOS build (SEI-52) |

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
