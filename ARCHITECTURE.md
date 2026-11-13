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
  config, builds, updates; SEI-43: i18n; SEI-44: native auth), and so do
  its data layer (SEI-53), UI kit (SEI-54) and app shell of tabs, [+] and
  placeholder screens (SEI-55); the rest of
  the Linear milestone «1 · Base nativa» and the port's screens are being
  built.

The backend does not change in the move: Supabase, the Edge Functions,
and `packages/maintenance-engine` serve both apps.

## Repo layout

pnpm workspaces (`apps/*`, `packages/*`).

| Path | Status | What it is |
| --- | --- | --- |
| `apps/app` (`@seibi/app`) | exists, frozen | PWA: Vite + TanStack Router SPA |
| `apps/mobile` (`@seibi/mobile`) | exists (base + auth + data layer) | Expo + React Native app; screens arrive with the port's tickets |
| `packages/maintenance-engine` | exists | Reminder math shared by the apps and Edge Functions |
| `supabase/migrations/` | exists | Schema, RLS, storage buckets, cron |
| `supabase/functions/` | exists | Edge Functions (Deno) |
| `CONTEXT.md` | exists | Domain glossary + English ↔ schema ↔ Spanish map |
| Turborepo (`turbo.json`) | exists | Runs `build`, `typecheck`, `lint`, `test` and `dev` across packages, and the native app's `check` (`apps/mobile/turbo.json`), with a local cache |

Shared code goes in `packages/*`, imported by direct path (no barrel
files).

pnpm uses its default isolated installs (no `nodeLinker: hoisted`); Expo
SDK 58 supports them, and Metro needs no monorepo config, so `apps/mobile`
has no `metro.config.js`. It has a `babel.config.js` only for Unistyles'
Babel plugin; isolated installs don't hoist `babel-preset-expo`, so it is a
direct dev dependency of `apps/mobile`. Apps depend on shared packages with
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
| `vehicle-render-webhook` | Receives fal's finished poster | fal (HMAC token in URL) |
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
`EXPO_PUBLIC_*`): those are inlined into the bundle. Client env holds only
the Supabase URL, its anon (PWA) or publishable (native) key, OAuth client
ids, and optional public keys (Sentry DSN, VAPID public key).

### Deploy

On merge to `main`, `.github/workflows/migrate-production.yml` applies
pending migrations to production and deploys the Edge Functions.
`.github/workflows/app-pr.yml` runs lint, typecheck (PWA, native app,
shared packages), the native app's `check`, unit tests, `deno check` and
`deno test` on Edge Functions, and the PWA build on every PR, and again on each push to
`main` to refresh the Turbo cache. `.github/workflows/eas-preview.yml`
starts an EAS `preview` build, only by hand (see CI under "Native app
standards").

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
  first, so Postgres cannot tell a backfill from an update. The PWA keeps
  them in `apps/app/src/lib/mutations.ts`; the native app in
  `apps/mobile/src/data/mileage/rules.ts`, with unit tests.
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
- **Model renders are an image only.** `vehicle-render` generates one fal
  studio image (the poster) per brand/model/year/color, stored in the
  public `vehicle-renders` bucket and `model_renders`; each combination
  is generated once. A render goes `pending` → `ready` when its poster is
  stored, or `failed` (started again on the next call, up to 3 attempts).
  There is no 3D step: nothing is sent to fal after the poster. Until the
  poster exists the Vehicle shows a body-type silhouette. The webhook is
  the fast path; while generating, the app calls `vehicle-render` every
  20 s, which after 20 s asks fal's queue itself and after 20 min marks
  the render failed. A render is an illustration, never called a photo.
  Car art and paint presets stay as they are.
  - **Left from the 3D pipeline** (removed in SEI-48), kept until the PWA
    is shut down (SEI-49) because the frozen PWA still reads them: the
    `model_renders.glb_path` column, which nothing writes now; the
    `poster_ready` value of `render_status`, which nothing writes now (a
    render still there is moved to `ready` the next time `vehicle-render`
    sees it); and the GLBs already in the bucket, which the PWA still
    shows in 3D.
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
  run the `development` variant. Since the Sign in with Apple
  entitlement (SEI-44), `pnpm ios` (`expo run:ios`) asks for a signing
  certificate even for the Simulator; on a Mac without one, build for the
  Simulator with the `verify` skill's `launch ios`, which calls
  `xcodebuild` directly (the Simulator needs no certificate).
- **Builds:** `apps/mobile/eas.json`. Profiles `development` (dev client,
  Seibi Dev, internal), `development-simulator` (the same for the iOS
  Simulator, for Maestro in CI), `preview` (internal, builds Seibi) and
  `production` (store, Seibi, `autoIncrement`). Each profile has the EAS
  Update channel and EAS environment of its name. `development` (and so
  `development-simulator`) and `preview` also set
  `EXPO_PUBLIC_TEST_SIGN_IN=1` (see Auth). Remote app versions
  (`appVersionSource: remote`). Only `com.seibiapp.app` gets an App Store
  Connect record; `.dev` is for the dev client. `ITSAppUsesNonExemptEncryption`
  is `false` (`ios.config.usesNonExemptEncryption`).
- **Updates:** EAS Update with the `fingerprint` runtime policy.
  `useOTAUpdate` (`src/hooks/use-ota-update.ts`, called by the root
  layout) checks on launch and on return to foreground, downloads, then
  offers a restart in the native alert; a declined restart applies on the
  next cold launch. It does nothing in development builds or while EAS
  Update is off. It ships before the first store release.
- **Splash and fonts:** the native splash (`expo-splash-screen` in
  `app.config.ts`, SEI-56) is the logo mark on the phone's screen
  background: `#F2F4F7` with dark ticks (`splash-icon.png`), or in dark
  mode `#0E0F11` with white ticks (`splash-icon-dark.png`). It follows the
  phone, not Seibi's «Tema» (the OS draws it before JavaScript runs), and
  changing it needs a new build. It stays up until the root layout has
  loaded the fonts with `expo-font`: Archivo 300–700 and Geist Mono 400 from
  `@expo-google-fonts`. A font that fails to load does not keep the app on
  the splash. Headings use Archivo 600, the PWA's own fallback for Clash
  Display: Clash Display's licence (ITF Free Font License) allows embedding
  it in an app but forbids sharing the font file through a public
  repository, and this repo is public, so the file is not in git. How it
  joins is an open question in [`docs/PLAN.md`](./docs/PLAN.md).
- **Navigation** (SEI-55): the app shell lives in `src/app/(app)/` and
  `src/shell/`.

  ```
  src/app/
    _layout.tsx                  root Stack: Stack.Protected (app) · (auth)/… · ui-kit
    +native-intent.tsx           seibi-dev://vehicle/<id> → Mi flota (src/shell/links.ts)
    (app)/_layout.tsx            Stack, anchor (tabs): (tabs) · actions · record-service · update-mileage · data-check · garage-fixture
    (app)/(tabs)/_layout.tsx     NativeTabs + the floating [+] drawn over them
    (app)/(tabs)/(home)/index.tsx            Inicio  (/)
    (app)/(tabs)/(fleet)/fleet.tsx           Mi flota (/fleet)
    (app)/(tabs)/(reminders)/reminders.tsx   Avisos (/reminders)
    (app)/(tabs)/(home,fleet,reminders)/     one Stack per tab: _layout · vehicle/[id] · profile
  ```

  - **Tabs.** Three `NativeTabs` (`expo-router/native-tabs`): Inicio ·
    Mi flota · Avisos. Liquid Glass on iOS 26 (the system draws it),
    Material 3 on Android (`surface` bar, `radiantSoft` indicator). The
    selected label and icon use `radiantText` (text contrast), the rest
    `muted`. Estimados has no tab until S10 adds one by OTA (decided
    2026-11-11: no «pronto» screen). Tabs are static; adding one is a code
    change, never a runtime toggle (it would remount the navigator). The
    bar never minimizes on scroll (`minimizeBehavior="never"`), so the [+]
    always sits right above it.
  - **A stack per tab.** The array group `(home,fleet,reminders)/` gives
    each tab its own copy of the same stack (`TabStack`,
    `src/shell/tab-stack.tsx`, after Paradero): the root under a large
    title with the avatar on the right, then `vehicle/[id]` and `profile`.
    A detail screen opens inside the tab you are in, under its bar, and
    each tab keeps its place while you visit another. Detail screens are
    never top-level routes (in Paradero that hid the tab bar).
    `unstable_settings` anchors each group to its root, so a link to a
    detail still has its list under it. Screens inside the tabs scroll in
    `TabScroll`, whose end leaves room for the [+].
  - **The [+]** (`FloatingAction`, `src/ui/floating-action*.tsx`;
    `ActionsButton` places it). NativeTabs has no slot for a button and
    doesn't let a tab's press be intercepted, so the tabs layout draws it
    over the tabs, outside them, bottom right, `size.tabBar` above the
    bottom safe area (NativeTabs can't be measured; a token per platform,
    checked on screenshots). iOS: an interactive `GlassView`
    (`expo-glass-effect`) tinted `radiant` with an `onRadiant` [+]; a solid
    `inverse` circle where Liquid Glass isn't available. Android: Material
    3's own `FloatingActionButton` from `@expo/ui/jetpack-compose`
    (`radiantStrong` with an `onRadiant` glyph, the XML drawable
    `assets/icons/add.xml`). Spoken label «Acciones rápidas». It pushes
    `/actions`.
  - **Actions sheet** (`(app)/actions.tsx`): a `formSheet` sized to its
    content, «¿Qué quieres hacer?» with «Registrar un Servicio» and
    «Actualizar Kilometraje». No Appointment action until S13 ships it.
    An action replaces the sheet with its own (`router.replace`):
    `record-service` and `update-mileage`, placeholder sheets until S7 and
    S8 put their forms on those routes.
  - **Perfil** opens from the header avatar (`ProfileButton`: Google's
    picture, else initials; on iOS 26 the header seats it on its own glass
    circle) inside the current tab. Until S11 it is a placeholder with
    who is signed in, «Tema», «Cerrar sesión», «Eliminar cuenta» and, in
    Seibi Dev, links to «Revisión de datos» and the UI kit.
  - **Deep links.** Everything in `(app)` is behind `Stack.Protected`:
    signed out, a link lands on sign-in (and is not replayed after
    sign-in). `vehicle/[id]` exists in all three tabs, so
    `+native-intent.tsx` sends `seibi-dev://vehicle/<id>` (or `seibi://`)
    to Mi flota, where a person would find it; other links pass through.
  - **Placeholders.** Mi flota, Avisos, the Vehicle detail and Perfil are
    placeholders built from kit components over the data layer (Mi flota:
    the Vehicles; Avisos: each Vehicle's Reminders). The S-tickets replace
    their content, not the routes. Inicio is the Garage (below).
- **Inicio** (S4, SEI-59): the PWA's Garage v3 without the 3D branch, in
  `src/home/` (`garage.tsx`, `stage.tsx`, `ticker.tsx`; the decisions as
  plain functions in `garage-logic.ts`, with unit tests). The route
  (`(home)/index.tsx`) reads `useGarage`, `useProfile` and
  `useActiveVehicle` and passes them to `Garage` as props.
  - **Header.** The large title is the greeting for the time of day
    (`greeting()`; the tab stays «Inicio»), with the avatar beside it.
  - **Palette.** `garage` in a `ScopedTheme` in light; the night theme in
    night (Garage is not art-directed for night). The stage's colours are
    the theme's `garage` group (`palettes.ts` → `garageStage`), its
    gradients `backgroundImage` strings built in `src/theme/garage.ts`
    (React Native 0.88 draws CSS linear and radial gradients natively;
    Unistyles converts them on a theme change). The paint presets and the
    paint → accent rule (OKLCH, the PWA's maths) are there too, with a test
    that pins every preset's accent to the PWA's.
  - **Carousel.** The Vehicles are pages of a native horizontal paging
    `ScrollView`: the page follows the finger and settles where the
    platform settles it; `onMomentumScrollEnd` picks the active Vehicle.
    The arrows step and wrap, as the PWA's. For VoiceOver and TalkBack the
    pager is one `adjustable` element («Tus Vehículos», value «<Vehículo>,
    N de M», increment and decrement), as a system page control is; the
    current page's name is a button that opens the Vehicle; other pages
    are hidden from the accessibility tree. No new native module.
  - **The Vehicle.** The poster is downloaded once into `expo-image`'s
    disk cache (`Image.prefetch`, then `Image.getCachePathAsync`) and
    drawn from that file with `react-native-svg`, under the PWA's radial
    mask (opaque to 72 % of the ellipse, clear at its edge): React Native
    views can't be masked, and on iOS a blend mode on a parent doesn't
    blend its children as one group, so painting the edges over failed on
    the screenshots. In light the masked poster multiplies into the floor
    (`mixBlendMode`). Without a poster (none, `pending`, or a failed load)
    the paint-coloured `Silhouette` stands on the floor with its contact
    shadow and a faded reflection.
  - **Mileage and Estado.** The odometer is the screen's big number
    (Archivo 300 at 52 pt, `garageType` in `tokens.ts`); its digits roll
    to a new value with Reanimated layout animations (`Ticker`), never on
    mount. The hint under it comes from the engine's `mileagePrompt`.
    «Actualizar» opens `/update-mileage` with the Vehicle's id (S8 reads
    it). «Estado» shows up to four known, unsnoozed Reminders, overdue
    first, with «Todo al día» or «N por atender»; the cards are not
    buttons until S9 has a Reminder detail. «Completa tu historial» (the
    unknown tasks) is S9's and joins Inicio with it.
  - **Empty.** «Sin Vehículos todavía»; «Agregar mi Vehículo» opens Mi
    flota, where S5 puts the Vehicle form.
  - **Sample screen.** Seibi Dev only: `seibi-dev://garage-fixture`
    (`?case=empty`), the same `Garage` drawn from two sample Vehicles
    derived by the engine (`src/home/dev/`, required behind
    `EXPO_PUBLIC_APP_VARIANT` like the data check). It shows what the
    shared test account can't: paging, a missing poster, the cards and
    the empty state. It writes nothing to seibi-dev.
- **Styling:** Unistyles 3 (`react-native-unistyles` on
  `react-native-nitro-modules`; SEI-42's spike proved it on SDK 58 on both
  platforms). The theme lives in `src/theme/`, values from
  `docs/DESIGN.md`:
  - `palettes.ts`: every colour and shadow as plain data, with no imports,
    so the contrast check reads it with Node. Palettes `light`, `night`
    and `garage` (Inicio v3's light palette).
  - `tokens.ts`: spacing (`space[n]` is `n × 4`), radius, the type scale,
    the font families, and the UI kit's sizes, opacities, motion timings,
    `largeTextScale` and `maxIconScale`.
  - `unistyles.ts`: builds the themes and calls `StyleSheet.configure`. The
    app entry `index.ts` imports it right after Expo Router's entry, so it
    runs before any `StyleSheet.create`; `babel.config.js` adds Unistyles'
    plugin for `src/`.

  Themes are `light`, `dark` (the night palette: Unistyles reserves those
  two names for following the system) and `garage`, for a subtree in a
  `ScopedTheme`. A theme change updates styles natively without
  re-rendering React; only components that call `useUnistyles()`
  re-render. For that, Expo Router's `adaptiveColors` is off
  (`app.config.ts`): by default it re-renders every screen on a
  colour-scheme change, for its own `Color` API, which Seibi doesn't use.
  Components style with `StyleSheet.create((theme) => …)` and
  role names (`theme.colors.surface`, `theme.space[4]`), never raw colours
  or sizes, and express visual states as variants (`styles.useVariants`).
- **UI kit** (`src/ui/`, SEI-54): the components every screen uses (list
  and rules in `docs/DESIGN.md` → Components). Screens compose them and
  write no styles the kit already has. `UIProvider` wraps the root layout:
  `GestureHandlerRootView`, `react-native-keyboard-controller`'s
  `KeyboardProvider`, and the `sonner-native` toaster. Selects, switches,
  menus and date pickers are `@expo/ui` controls; what differs per
  platform lives in `native-controls.ios.tsx` and `native-controls.tsx`
  (`@expo/ui/swift-ui` can't load on Android). Forms use `FormLayout`
  inside an Expo Router `formSheet` route. Helpers for numbers and dates
  in es-SV are in `src/lib/number.ts` and `src/lib/date.ts`. Two React
  Native 0.88 Android bugs shape the kit: text with a `lineHeight` can
  lose its last line (so `Text` hangs a thin space after its words), and a
  rounded view that Fabric flattened (no fill at mount) is drawn square
  when a fill appears (so rounded views that change fill keep a native
  view from mount). Both are in `docs/DESIGN.md`
  (Type → Text that fits; Spacing and radius → Corners on Android).
- **UI kit sample screen:** every component and a sample form sheet, at
  `seibi-dev://ui-kit` (Perfil links to it in Seibi Dev). The screens live in `src/ui/dev/`; the routes in
  `src/app/ui-kit/` `require` them only when `EXPO_PUBLIC_APP_VARIANT` is
  `development`, the same bundle-time fold as the data check, so Metro
  leaves them out of every other bundle. The layout also redirects home
  outside development, so Seibi, preview builds and updates published
  without the variant never mount the route. The root stack lists it
  outside the `Stack.Protected` groups: it opens signed in or signed out.
  The `verify` skill drives it (`features/ui-kit.md`).
- **Theme preference:** `system` (default), `light` or `night` (the PWA's
  Auto · Claro · Oscuro), under `theme.v1` in the expo-sqlite kv-store
  (`src/theme/preference.ts`). `unistyles.ts` reads it synchronously before
  configuring, so a cold start draws the chosen theme first. `system` turns
  Unistyles' adaptive themes on; a fixed choice turns them off and also
  overrides React Native's colour scheme, so native views (alerts, the
  status bar, `@expo/ui`) match. The control is the PWA's «Tema»
  segmented control, in the placeholder Perfil until S11 ports the screen.
- **Auth** (`src/auth/`, `src/lib/supabase.ts`): the same Supabase users
  as the PWA.
  - **Client.** One `supabase` client (`src/lib/supabase.ts`) built from
    `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
    it throws at startup when either is missing. `startAutoRefresh` /
    `stopAutoRefresh` follow `AppState` (foreground only); no manual
    refresh anywhere.
  - **Session at rest.** Supabase's `auth.storage` is
    `createEncryptedStorage` (`src/auth/encrypted-storage.ts`, wired in
    `device.ts`): a 256-bit key in `expo-secure-store`
    (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so a restored backup starts
    signed out) and the session sealed with AES-256-GCM from `expo-crypto`
    (CryptoKit on iOS, javax.crypto on Android) in the `expo-sqlite`
    kv-store, under `auth.session.<storage key>` as `v1:` +
    base64(nonce ‖ ciphertext ‖ tag), the entry name bound as associated
    data. A session passes SecureStore's ~2 KB per value (the bare test
    account's is ~1.9 KB). A value that cannot open (lost key, tampered) is
    deleted and the person signs in again. Never AsyncStorage.
  - **No HTTP disk cache.** iOS's URL cache would write Supabase's answers
    (the sign-in and refresh answers with both tokens, the account) to
    `Library/Caches/<bundle id>/Cache.db` in plain text, and a request's
    `Cache-Control: no-store` doesn't stop it. A config plugin in
    `app.config.ts` (`withoutHttpDiskCache`) gives the app an in-memory
    URL cache only, cleared at launch. Every Supabase request also sends
    `Cache-Control: no-store` (`src/lib/supabase.ts`), which Android's
    OkHttp honours.
  - **Routes.** `src/app/(app)/` needs a session; `(auth)/sign-in` and
    `(auth)/account-deleted` are the only other screens. The root layout
    opens exactly one with `Stack.Protected` guards on `useAuth()`
    (`src/auth/session.ts`, fed only by `onAuthStateChange`); nothing
    redirects by hand. The splash stays up until the saved session is read,
    so a signed-in launch never shows Login. Where `(app)` lands first
    (Inicio or the first-run questions, from `useProfile().onboardedAt`) is
    `(app)`'s own routing (S3, SEI-58).
  - **Login** (`(auth)/sign-in.tsx`, S1, SEI-56): the PWA's Login on the
    `garage` theme in a `ScopedTheme`, light whatever the theme (a
    first-run screen), with a dark status bar. The lockup (`Logo` and the
    `Wordmark`), one still Vehicle (`assets/images/sign-in-vehicle.png`,
    the PWA's `login-yaris.png`, where its carousel rests), the headline,
    the provider buttons (`src/auth/provider-buttons.tsx`), the test form
    when compiled in, and the legal line. Apple's is
    `AppleAuthenticationButton` (Apple draws it; black, pill), shown when
    `isAvailableAsync()` (iOS); it can't grow with the text size, so it
    takes the height of Google's. Google's is built to Google's branding
    guidelines (light style, the standard «G», Google's padding, a pill;
    the platform font, since Google Sans can't be embedded). A failed
    provider shows an inline error and is announced; a cancelled one
    changes nothing. In a scroll view that keeps the focused field above
    the keyboard (`react-native-keyboard-controller`); on Android a strip
    of `bg` under the status bar keeps scrolled content out from under it.
  - **Legal pages:** `src/lib/legal.ts` holds the URLs of the PWA's public
    pages, `https://seibiapp.com/legal/terminos` and
    `https://seibiapp.com/legal/privacidad` (one copy of the text), and
    `openLegal()` opens them with `expo-web-browser`
    (SFSafariViewController, Custom Tabs). Login links them; Perfil (S11)
    will too.
  - **Apple** (iOS): `expo-apple-authentication` →
    `signInWithIdToken({ provider: 'apple', nonce })`, the SHA-256 of a
    random nonce signed into Apple's token. Apple sends the name on the
    first sign-in only: it is saved to `user_metadata.full_name` (Perfil)
    and the first name to `profiles.display_name` when that is empty (the
    signup trigger's convention). Supabase's Apple provider lists both bundle
    ids as client ids.
  - **Google:** `@react-native-google-signin/google-signin` (Play
    services' account picker on Android, Google's sign-in sheet on iOS) →
    `signInWithIdToken({ provider: 'google' })`. Client ids per variant:
    `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the token's audience) and
    `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (also the iOS URL scheme, set in
    `app.config.ts`, so it needs a native build). Android has no id in the
    app: Google matches the package and the signing key's SHA-1. Without
    the ids the button is hidden.
  - **Test sign-in.** Email + password for the seibi-dev test account, only
    when `EXPO_PUBLIC_TEST_SIGN_IN=1` at bundle time (`development` and
    `preview` in `eas.json`, the pnpm scripts, `verify.sh`). The sign-in
    screen `require`s `src/auth/email-sign-in.tsx` behind that check; in
    any other bundle it folds to `undefined === '1'` and Metro drops the
    module, so production bundles do not contain the form (proven with
    `expo export` and a grep in SEI-44). Unset means off.
  - **Sign-out** is one function, `signOut()` in `session.ts`: it revokes
    this device's session (`scope: 'local'`; the PWA and other phones stay
    signed in), then always deletes every `auth.session.*` entry, the key,
    every kv-store key under `user.` (`userDataKey()` in `sign-out.ts`) and
    Google's remembered account. The same wipe runs on every `SIGNED_OUT`,
    so it also happens when Supabase signs out on its own (a refresh token
    revoked elsewhere). Device preferences stay: the theme (`theme.v1`)
    and the language (`language.v1`) are not under `user.`. The wipe also
    clears the in-memory query cache (`caches`, SEI-53). Anything new that
    keeps a person's data on the device (push tokens in SEI-47) is cleared
    there.
  - **Delete account:** `deleteAccount()` calls the `delete-account` Edge
    Function (through `invokeFunction`, which checks for `{ deleted: true }`),
    then `signOut()`, and opens «Cuenta eliminada». The same
    screen opens when the account was deleted elsewhere: on launch and on
    every return to the foreground, `getUser()` answering `user_not_found`
    signs out and shows it. (With an expired access token the refresh
    fails first and the person just lands on sign-in.)
  - **Env vars** (`apps/mobile/.env.example`): locally in
    `apps/mobile/.env.local` (gitignored; the development variant points at
    seibi-dev); in builds and updates from the EAS environment of the
    profile (`development` and `preview` → seibi-dev, `production` →
    production).

    | Variable | Development | Preview | Production |
    | --- | --- | --- | --- |
    | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | seibi-dev | seibi-dev | production |
    | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | web client | web client | web client |
    | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS client for `com.seibiapp.app.dev` | iOS client for `com.seibiapp.app` | iOS client for `com.seibiapp.app` |
    | `EXPO_PUBLIC_TEST_SIGN_IN` | `1` | `1` | never set |
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
    grouped by screen or feature (`start.title`, `update.restart`).
    `check-strings` (see CI) fails on text that doesn't come from i18n.
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
- **Data** (`src/data/`, `src/lib/`; SEI-53): TanStack Query against
  Supabase directly, ported from the PWA's `apps/app/src/lib/` (copied, not
  shared; `@seibi/maintenance-engine` stays shared). Screens read and write
  only through these hooks.
  - **Client and cache.** The one `supabase` client is typed with
    `Database` from `src/lib/database.types.ts`. The one `queryClient`
    (`src/data/query-client.ts`, provided by the root layout) keeps the
    PWA's defaults (fresh for 60 s, one retry) and refetches stale queries
    when the app comes back to the foreground: `focusManager` listens to
    `AppState`. Online state stays TanStack's default (always online):
    reading the network needs a native module (`expo-network` or NetInfo)
    the binary doesn't ship. Nothing is persisted (no offline data), and
    sign-out clears the cache (Auth → Sign-out).
  - **One folder per domain**, each with its hooks:
    `vehicle/` (create, update, withdraw, restore, refresh schedule and
    render, `useRenderNudge` for the shell), `service/`, `mileage/`
    (`rules.ts`: the Mileage write rules), `reminder/` (hand-written
    Reminders, Reminder state, `rememberTasks`, the Reminder text),
    `routine/`, `appointment/`, `estimate/`, `profile/`, `task/` (the
    Maintenance task catalog), `vpic/`, `account/` and `preferences/`.
    Vehicle, Service, Mileage, Reminder, Routine and Appointment are read
    through **one garage query** (`garage/`: `useGarage`), as in the PWA:
    every Vehicle with its readings, Services, Routines, Reminders,
    Appointments, schedule and render in one request, derived by the
    engine, so screens never disagree. Every write to them goes through
    `useGarageMutation`, which refetches the garage when it settles.
  - **Query keys** come from a factory in each domain's `keys.ts`, never a
    loose string: `garageKeys.user(id)` (`['garage', id]`),
    `profileKeys.user(id)`, `estimateKeys.user(id)`, `taskKeys.catalog`,
    `vpicKeys.makes()` / `vpicKeys.models(make, year)`. Keys for the
    person's data carry their user id; each nests under its domain's
    `all`, so invalidating the domain reaches every entry.
  - **Errors** (`src/data/errors.ts`): every failure has a stable code and
    every code a message in `es.json` under `errors.<code>`; screens show
    `errorMessage(error, t)`, never a server's text. `InputError(field,
    code, params)` is a form field that breaks a rule; `RequestError` is an
    Edge Function's code (`ai_limit`, `profile_location`…), `network`, or
    `invalid_response`. A code the app doesn't know shows `errors.unknown`.
    No router import, so it also runs in the unit tests. Form rules are the
    PWA's own checks, ported as they are (`validateVehicle`,
    `validateService`…), each throwing an `InputError`.
  - **Zod at the boundaries** whose shape Seibi doesn't control: the
    responses of `vehicle-lookup`, `vehicle-render`, `estimates` and
    `delete-account` (`invokeFunction` in `src/data/functions.ts` takes the
    schema), the NHTSA vPIC answers (`vpic/schemas.ts`), and the JSON
    columns the Edge Functions write (`maintenance_schedules.sources`,
    `estimates.result`). An unexpected shape is `invalid_response`, never a
    half-read object. The tests parse real recorded answers in
    `src/data/fixtures/`: seibi-dev's Edge Functions called as the test
    account, a stored `estimates.result` row, and vpic.nhtsa.dot.gov. A
    successful `delete-account` is not recorded (it would delete the shared
    test account); its test uses the shape the function's source returns.
    Table reads use the generated types, not Zod.
  - **Generated types.** `src/lib/database.types.ts` is generated from
    seibi-dev's `public` schema, never edited by hand. Regenerate it after
    a migration lands on seibi-dev, in the same PR: the Supabase MCP's
    `generate_typescript_types` for project `blirxlxmmrhafomkykmr` (paste
    its output into the file), or the Supabase CLI after `supabase login`:
    `npx supabase gen types typescript --project-id blirxlxmmrhafomkykmr
    --schema public > apps/mobile/src/lib/database.types.ts` (it reads the
    hosted project; no local stack, no Docker). Then run `pnpm typecheck`.
  - **Device preferences** in the `expo-sqlite` kv-store, read
    synchronously, keys versioned `.v1`: the theme (`theme.v1`) and the
    language (`language.v1`) belong to the phone; the active Vehicle
    (`user.active-vehicle.v1`, `useActiveVehicle`) and the Intro done
    (`user.intro-done.v1`) belong to the person (`src/data/preferences/`),
    so sign-out deletes them.
  - **Formatters** (`src/lib/format.ts`): `es-SV` numbers, money and days
    as the PWA prints them in a browser; words come from `es.json` through
    a `t` argument, so they run outside React. Money uses
    `Intl.NumberFormat` with `style: 'currency'` and no
    `currencyDisplay`; on Hermes it prints what a browser prints (`$1,234`,
    `-$40`, `$1,234.50`), checked with the dev-only screen below on the
    iOS simulator and the Android emulator, so it needs no workaround.
  - **Dev-only check.** In Seibi Dev only, Perfil opens
    «Revisión de datos» (`src/app/(app)/data-check.tsx`, the screen in
    `src/data/dev/`): it lists the person's Vehicles, saves a standalone
    reading and prints the formatters on the phone. Other bundles don't
    contain it (the route `require`s it behind `EXPO_PUBLIC_APP_VARIANT`),
    and `Stack.Protected` keeps the route closed there. It goes once real
    screens use the data layer.
- **Accessibility:** WCAG 2.2 AA (rules in `docs/DESIGN.md`).
- **CI:** `app-pr.yml` runs `pnpm check` at the repo root on every PR (run
  it yourself before pushing). `check` is a Turbo task of `@seibi/mobile`
  only, defined in `apps/mobile/turbo.json`: it runs the app's `typecheck`
  (`tsc --noEmit`) and `lint` (`expo lint --max-warnings 0`: ESLint with
  `eslint-config-expo`), then its check scripts in `apps/mobile/scripts/`,
  adapted from Paradero (MIT; the licence notice is in each script). All
  three run even when one fails, and each failure prints
  `file:line:column` (or the palette pair) and how to fix it.
  - `check-tokens.mjs` fails on a raw color or measurement in any file
    under `src/` except `src/theme/`: a hex, `rgb()` or `hsl()` color in
    any string, a named color in a color prop, and a number other than 0
    in a layout or type prop (`LAYOUT`: padding, gap, width,
    `borderRadius`, `fontSize`…) or in a JSX `size`, `width` or `height`.
    It parses the code (TypeScript's parser), so it reads
    `StyleSheet.create((theme) => …)`, variants and inline styles alike,
    and a value read from the theme (`theme.space[6]`) is never a literal.
    It imports `tokens.ts` and `palettes.ts` to name the token to use.
    `SKIP` is for files that draw in their own coordinates (vector art).
  - `check-contrast.ts` imports the palettes (`light`, `night`, `garage`)
    and measures every text role on each background it sits on (the pair
    list in `docs/DESIGN.md` → Accessibility): 4.5:1 for text, 3:1 for
    status and brand colors on `bg`, `surface` and `surface2`.
    Translucent soft fills are measured over each of those three surfaces.
    Node runs it as TypeScript (type stripping).
  - `check-strings.mjs` fails on text on screen that doesn't come from
    `es.json` through `t()`: JSX text (also literals inside `{…}`),
    literals in the props and option keys a person sees or hears
    (`SPOKEN_PROPS`: `accessibilityLabel`, `title`, `placeholder`, alert
    buttons' `text`…) and the arguments of `Alert.alert` and toasts. Other
    props (`testID`, `accessibilityRole`, `style`…) are never checked.
    `SAME_EVERYWHERE` lists the few names that are the same in every
    language (the brand name). Text built in a variable outside JSX is not
    seen.

  `pnpm test` (also on every PR) runs `@seibi/mobile`'s `test`: Vitest
  over `src/**/*.test.ts`, plain TypeScript modules only, no React Native
  in Node. `@seibi/mobile` has no `build` script: native builds run on EAS.
  Typed-route declarations are generated by `expo start`, so CI's
  typecheck does not check route hrefs. Maestro runs the `verify` skill's
  journeys in CI once the first iOS build exists (SEI-52).
- **Turbo cache in CI:** `actions/cache` keeps `.turbo/cache` between runs,
  one entry per commit (`turbo-<os>-<lockfile hash>-<sha>`). A run restores
  the newest entry from its own PR or from `main` (hence the push trigger on
  `main`), and Turbo replays every task whose inputs haven't changed
  ("cache hit, replaying logs"; "FULL TURBO" when all of them do). On a
  developer's machine Turbo shares one local cache across git worktrees.
- **Preview builds:** an EAS `preview` build (internal distribution, the
  Seibi variant) never runs on a PR, because EAS builds are paid. Start one
  by hand, either way:
  - From a machine, after `eas login`: `cd apps/mobile && eas build
    --profile preview --platform all` (or `ios`, `android`).
  - From GitHub: Actions → "EAS preview build" → Run workflow
    (`eas-preview.yml`, `workflow_dispatch` only). It queues the build with
    `--no-wait` and exits; the build's page on expo.dev has the install
    link. It needs the `EXPO_TOKEN` repository secret, an Expo access
    token.

  Both need the EAS project id, which isn't set yet (`EAS_PROJECT_ID` in
  `app.config.ts`, SEI-72). Until it is, the workflow skips its build job
  and says what is missing, and `eas build` on a machine would offer to
  create a project: leave that to SEI-72. iOS internal builds install only
  on devices registered with `eas device:create`.
- **Verification:** `apps/mobile/.claude/skills/verify/` (generated in
  SEI-41 with `create-verification-skill`) drives Seibi Dev on the iOS
  Simulator and the Android emulator (`seibi-pixel`) with Maestro, the way
  a user does: `scripts/verify.sh` launches, checks (`doctor`), drives a
  flow from `flows/` and cleans up. Each run keeps its video, screenshots
  and report in `~/seibi-verify/`, outside git. Every PR that changes what
  a user sees or does is proven with it before merge, with the saved data
  read from seibi-dev; `maintain-verification-skill` keeps its feature map
  (`features/`) current. Flows that need a session sign in with the
  seibi-dev test account through the test sign-in (`flows/sign-in.yaml`);
  its password lives outside git (the skill's Sign-in section).
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
| Pickers, toggles, menus, date picker | Custom fields, `Combobox` | `@expo/ui` (universal `Picker` and `Switch`; `community/menu` and `community/datetime-picker`; SwiftUI `DatePicker` on iOS) |
| Toasts | `ToastProvider` | `sonner-native` |
| Confirmations | Custom dialogs | The native alert |
| Local preferences | `localStorage` | `expo-sqlite` kv-store (never AsyncStorage) |
| Session at rest | supabase-js default | AES-256-GCM (`expo-crypto`) in the `expo-sqlite` kv-store, key in `expo-secure-store` |
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
