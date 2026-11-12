# Migration plan: PWA → native app

> **Temporary.** This file plans the move from the PWA (`apps/app`) to the
> native app (`apps/mobile`). Delete it in the PR that closes SEI-49.
> What is already true lives in [`ARCHITECTURE.md`](../ARCHITECTURE.md);
> design rules live in [`DESIGN.md`](./DESIGN.md); the reasons also go to
> the Linear document «Historial de decisiones». Agreed on 2026-11-11.

## Goal

Ship Seibi as a native iOS and Android app on the backend that exists
today, then shut the PWA down.

**Port first, redesign later.** Everything ported does what the PWA does,
with the PWA's look, and nothing new. The Paper redesign starts after the
port.

Done when:

1. The MVP is live on the App Store (by 2026-12-15 at the latest) and on
   Google Play.
2. The after-launch tickets have shipped.
3. SEI-49 has shut down the PWA and removed Web Push.

## Decisions

| Decision | Why |
| --- | --- |
| Port first, then redesign on the native app. The Paper redesign is paused until the port is done | Each screen gets built once, and the port has one simple contract |
| The port changes no behaviour: same features, same look, nothing new | Every ticket and review checks against the PWA |
| Scope is set per ticket: each lists what is in and out, and can be edited or cancelled before it starts | Granular control, without leaving scope to the agent that picks it up |
| 3 shared tickets (A, B, C), then one ticket per section (S1–S13) | Sections run in parallel once the shared base exists |
| Copy `apps/app/src/lib/` into `apps/mobile`; no shared data package. `packages/maintenance-engine` stays shared | The PWA is frozen and will be shut down; sharing would only couple the two |
| Icons: `expo-symbols`, one `{ ios, android }` name map (Paradero's `icon.tsx`) | Native on both platforms and proven in a live app; 30 icons mapped once instead of twice |
| Navigation: 4 `NativeTabs` plus a floating [+] (bottom right; glass on iOS, Material on Android) that opens the actions sheet | `NativeTabs` can't host a centre action; the floating button stays in thumb reach |
| Estimados has no tab at launch (3 tabs + [+]); S10 adds the tab back by OTA. If the MVP finishes early, S10 joins before submission | A "pronto" screen risks rejection under App Review guideline 2.1; tabs are JavaScript, so adding one later needs no new review |
| Test sign-in: email + password in the `development` and `preview` EAS builds only, never in `production` | Apple and Google sign-in can't be automated; a hidden production login breaks App Review guideline 2.3.1 |
| Accessibility: Paradero's rules and check scripts, aiming at WCAG 2.2 AA. High-contrast palettes come after the redesign | Cheap from the first screen, expensive to retrofit; high contrast is a new feature |
| Light palette: change only the text roles that fail AA (primary button on `radiantStrong`, new `radiantText`, `okText`, `soonText`, `overdueText`, darker `subtle`); fills, dots and icons keep their colors. Values in `docs/DESIGN.md` → Accessibility | Keeps both "the PWA's look" and AA with the smallest visible change; the redesign starts from passing tokens |
| Pace: at most 3 tickets in progress. Claude (the orchestrator) reviews and merges PRs into `main` once CI is green; never a direct push. Saul is told after any merge that deploys migrations or Edge Functions, and approves destructive production changes (dropping a column, deleting data) first. Implementing agents never merge | Saul doesn't want to be the review bottleneck (2026-11-11); merging to `main` deploys to production, so production-affecting merges stay visible |
| 3D is out of the port. SEI-48 removes the 3D step and keeps the `glb_path` column; whether 3D returns is a Backlog idea (SEI-11) | The frozen PWA still selects `glb_path` (`apps/app/src/lib/garage.ts`); 3D's future is undecided |
| Launch: App Store by 2026-12-15 at the latest, with the full MVP. The date moves before the scope does | Ship the MVP whole, then the rest |
| Styling: Unistyles 3. SEI-42 starts with a spike on SDK 58; on failure, fall back to plain `StyleSheet` + tokens | Same `StyleSheet.create` API plus themes and variants for the UI kit; neither reference app uses it |
| Zod at three boundaries: Edge Function responses, NHTSA vPIC, forms. Table reads use the generated Supabase types | Validate only the data whose shape Seibi doesn't control |
| Two app variants: Seibi Dev (`com.seibiapp.app.dev`) and Seibi (`com.seibiapp.app`). The `preview` EAS profile builds the production app | TestFlight and Play's closed test use the production app; one Apple app record fewer |
| Verification: every PR proves itself in the real app with pstack's `verify` skill (generated in SEI-41 with `create-verification-skill`): a video of the journey, screenshots, and a read-only seibi-dev query for the saved data. Maestro in CI (SEI-52) starts as soon as the first iOS EAS build exists and becomes part of every PR's proof | No human reviews PRs (2026-11-11), so proof from the running app is the merge gate; CI-run Maestro needs an iOS build first |
| Expo SDK 58 | The latest SDK; Paradero ships on it |
| References: Paradero (`~/Desktop/Personal/paradero`, MIT) for the native UI layer, check scripts and release script; Zagged for auth, variants and OTA (patterns only, previous-employer code) | Two apps that shipped |

## Scope

Every feature the PWA has today, with its call. **Port** = same behaviour;
**Simplify** = same purpose, simpler form; **Postpone** = after launch, in
«4 · Después»; **Drop** = no ticket.

| # | Area | Feature | Call | MVP | Ticket |
| --- | --- | --- | --- | --- | --- |
| 1 | First run | Splash: the logo animation that flies into Login | Simplify: native splash | yes | S1 |
| 2 | First run | Login with Apple and Google, plus the rotating Vehicle carousel | Port sign-in; Simplify the carousel to one still image | yes | S1 |
| 3 | First run | Intro: 3 slides playing inside a phone | Simplify: still slides | no | S2 |
| 4 | First run | Questions: name, knowledge level, country/city, how the Vehicle is used, last maintenance, push permission, optional first Vehicle | Port | yes | S3 |
| 5 | Inicio | Garage: Vehicle carousel, Mileage, status, greeting | Port | yes | S4 |
| 6 | Mi flota | Vehicle list and search by brand, model, year or plate | Port | yes | S5 |
| 7 | Mi flota | Add or edit a Vehicle: NHTSA vPIC makes and models, engine, trim, paint, plate, km/mi | Port | yes | S5 |
| 8 | Mi flota | Remove a Vehicle, with a window to restore it | Port | yes | S5 |
| 9 | Vehicle | Service history, «Gastado este año», estimated usage, Mileage readings and corrections | Port | yes | S6 |
| 10 | Vehicle | Maintenance plan with sources, or the «Recomendación general» label | Port | yes | S6 |
| 11 | Vehicle | Weekly Routines | Port | yes | S6 |
| 12 | Vehicle | Model render image, with the silhouette until it exists | Port | yes | S6 |
| 13 | [+] | Record a Service: type, line items (part, brand, part number, cost), shop, date, Mileage, notes | Port | yes | S7 |
| 14 | [+] | Invoice or receipt photo on a Service | Port, with the native camera and photo library | no | S12 |
| 15 | [+] | Update Mileage | Port | yes | S8 |
| 16 | [+] | Schedule an Appointment (Cita) | Port | no | S13 |
| 17 | Avisos | Reminders by status (Por vencer / Al día / Pospuestos), detail with source, snooze | Port | yes | S9 |
| 18 | Avisos | «Completa tu historial» | Port | yes | S9 |
| 19 | Avisos | Hand-written Reminders: create, complete, delete | Port | yes | S9 |
| 20 | Estimados | Estimate by city, dealer vs independent shop, what drives the price, sources, past queries | Port | no | S10 |
| 21 | Estimados | Chat with Seibi | Postpone | no | Chat |
| 22 | Perfil | Name, knowledge level, location, theme, notifications | Port | yes | S11 |
| 23 | Perfil | «Planes» card («Seibi Común, todo incluido durante el lanzamiento») | Drop: the paywall replaces it | — | — |
| 24 | Perfil | Contact email, privacy policy and terms, in the app | Port | yes | S11 |
| 25 | Perfil | Delete account | Port (Apple requires it) | yes | S11 |

Web-only pieces get replaced inside existing tickets: OAuth redirect →
native sign-in (SEI-44); Web Push → Expo Push (SEI-47); the service
worker's update prompt → EAS Update (SEI-41); Safari standalone fixes →
not needed; Paraglide → i18next (SEI-43); the 3D viewer → removed (SEI-48).

## Tickets

Each ticket's Linear description repeats its "in" and "out" in Spanish
and links back here. Agents build from the PWA screen named in the
ticket and keep its behaviour.

### 1 · Base nativa

| Id | Title | In | Out | Depends on | MVP | Linear |
| --- | --- | --- | --- | --- | --- | --- |
| SEI-40 | Turborepo | `turbo.json`, root scripts and CI through `turbo` | Remote cache | — | yes | SEI-40 |
| SEI-41 | `apps/mobile` with Expo SDK 58, Expo Router, EAS | `app.config.ts` with `EXPO_PUBLIC_APP_VARIANT` (2 variants), one slug, `eas.json` with `development` / `preview` / `production`, Metro + pnpm config, `expo-updates` with `fingerprint` and the OTA hook, splash + font gate, `ITSAppUsesNonExemptEncryption`, `react-native-svg`, the native modules after-launch tickets need (`expo-image-picker`); the `verify` skill in `apps/mobile/.claude/skills/verify/` generated with `create-verification-skill` (Maestro on the iOS Simulator and Android emulator, test sign-in, video evidence), proven on one feature | Screens | SEI-40 | yes | SEI-41 |
| SEI-42 | Unistyles 3 theme | Spike on SDK 58 first; `light` / `night` themes from `docs/DESIGN.md`; fonts | High contrast | SEI-41 | yes | SEI-42 |
| SEI-43 | i18n | i18next + expo-localization, typed keys, `es.json` | `en.json` | SEI-41 | yes | SEI-43 |
| SEI-44 | Native auth | Apple + Google via `signInWithIdToken`; encrypted session store; `startAutoRefresh` / `stopAutoRefresh` on app state; full name on first Apple sign-in; `Stack.Protected`; email + password test sign-in in `development` / `preview` only; account-deleted screen | — | SEI-41 | yes | SEI-44 |
| SEI-45 | Sentry | `@sentry/react-native`, source maps from EAS builds | — | SEI-41 | yes | SEI-45 |
| SEI-46 | CI for the native app | Typecheck, lint, Paradero's 3 check scripts (tokens, contrast, strings) on every PR | Maestro (SEI-52) | SEI-41, SEI-42 | yes | SEI-46 |
| SEI-47 | Native push | `push_tokens` table + RLS; register the token after sign-in, delete it on sign-out; `reminders-daily` also sends through Expo; a tap opens Avisos | Web Push removal (SEI-49) | SEI-44 | yes | SEI-47 |
| SEI-52 | Maestro in CI | The `verify` map's journeys on every PR against seibi-dev, with the test sign-in and the recordings attached | — | SEI-41 (the first iOS EAS build) | yes | SEI-52 |

### 2 · Migración

| Id | Title | In | Out | Depends on | MVP | Linear |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data layer | Copy queries, mutations and types from `apps/app/src/lib/`; one folder per domain; query key factories; error code → i18n message map (no router import); Zod at the Edge Function and vPIC boundaries; generated Supabase types; kv-store for theme, active Vehicle and intro-done | Screens | SEI-43, SEI-44 | yes | SEI-53 |
| B | UI kit | The components in `docs/DESIGN.md` on Unistyles variants; `Icon` with the `expo-symbols` map; `sonner-native` toasts; `@expo/ui` pickers, toggles, menus and date picker, each tested on both platforms | Screens | SEI-42 | yes | SEI-54 |
| C | App shell | `NativeTabs` Inicio · Mi flota · Avisos (Estimados is added by S10), a stack per tab; floating [+] opening the actions `formSheet`; header avatar → Perfil | Screen contents; the Appointment action until S13 | SEI-41, B | yes | SEI-55 |
| S1 | Splash and Login | Native splash; Apple and Google buttons; one still Vehicle image; legal line | Lockup fly animation; Vehicle carousel | SEI-44, B | yes | SEI-56 |
| S2 | Intro | Still slides | The phone animation | B, C | no | SEI-57 |
| S3 | First-run questions | Every question, the push permission ask, the optional first Vehicle (S5's form) | — | A, B, S5 | yes | SEI-58 |
| S4 | Inicio | Garage: Vehicle carousel, Mileage, status, greeting, paint accent | Changes to car art or paint presets; «Deshacer» | A, B, C | yes | SEI-59 |
| S5 | Mi flota and the Vehicle form | List, search, add and edit with vPIC, paint presets, km/mi, withdraw and restore | — | A, B, C | yes | SEI-60 |
| S6 | Vehicle detail | Service history, «Gastado este año», usage, readings and corrections, plan sources or the general label, Routines, render image with silhouette | 3D | A, B, C | yes | SEI-61 |
| S7 | Record a Service | Form with line items, shop, date, Mileage, notes; the Mileage write rules | Invoice photo (S12) | A, B, C | yes | SEI-62 |
| S8 | Update Mileage | A standalone reading dated today, strictly above the current odometer | — | A, B, C | yes | SEI-63 |
| S9 | Avisos | Statuses, detail with source, snooze, «Completa tu historial», hand-written Reminders, push opt-in | — | A, B, C, SEI-47 | yes | SEI-64 |
| S10 | Estimados | The Estimados tab (shipped by OTA), estimate form, results, what drives the price, sources, past queries | Chat | A, B, C | no | SEI-65 |
| S11 | Perfil | Name, knowledge level, location, theme, notifications, contact email, privacy policy and terms, delete account | «Planes» card | A, B, C | yes | SEI-66 |
| S12 | Invoice photo | `expo-image-picker` camera + library → Supabase Storage, on the Service form | — | S7 | no | SEI-67 |
| S13 | Schedule an Appointment | The form, the [+] action, Appointments in Avisos and Vehicle detail | — | A, B, C | no | SEI-68 |
| SEI-48 | Remove the 3D step from `vehicle-render` | Remove the image-to-3D step and its code | Dropping the `glb_path` column | — | no | SEI-48 |

### Outside the port

| Id | Title | Milestone | Linear |
| --- | --- | --- | --- |
| SEI-71 | Recruit 12 testers for Play's closed test | 3 · Prueba en dispositivos (no blockers) | SEI-71 |
| SEI-69 | Chat with Seibi | 4 · Después | SEI-69 |
| SEI-70 | High-contrast palettes | 4 · Después | SEI-70 |
| SEI-11 | Bring 3D back? (idea) | Backlog | SEI-11 |
| SEI-49 | Shut down the PWA and remove Web Push | 4 · Después, after both stores | SEI-49 |

## Order and pace

1. Merge PR #31 and #32.
2. SEI-40, then SEI-41. Strictly one after the other.
3. SEI-42 to SEI-46 in parallel.
4. A, B and C.
5. The MVP sections and SEI-47.
6. Milestone 3: devices, TestFlight, Play's closed test.
7. The after-launch tickets.

Rules:

- **At most 3 tickets in progress.** MVP tickets go first; after-launch
  tickets wait in Backlog until the MVP ships.
- **The orchestrator reviews and merges.** Every ticket is one PR from
  its own branch, merged into `main` once CI is green and the change is
  reviewed. Saul hears about every merge that deploys migrations or Edge
  Functions, and approves destructive production changes first.
- A ticket that changes what is true updates `ARCHITECTURE.md` in the same
  PR.
- **Every PR carries proof.** A PR that changes what a user sees or does
  adds or updates its feature file in the `verify` skill's map
  (`apps/mobile/.claude/skills/verify/features/`) and proves it: a video
  of the journey, screenshots, and a read-only seibi-dev query for the
  saved data. The video goes on the Linear ticket, linked from the PR. No
  proof, no merge. Once SEI-52 lands, the same journeys also run in CI.
- Work nobody has tried in Seibi or the reference apps starts with a short
  spike before anything is built on it (see Gotchas).

## Launch

The MVP ships whole. If it isn't ready, the date moves; the scope doesn't.

| By | What |
| --- | --- |
| Nov 12–30 | Base nativa and the MVP tickets |
| Dec 1–7 | Device testing (simulators, physical phones, TestFlight) |
| ~Dec 8 | Submitted to App Review, with a week of slack for a rejection |
| **Dec 15** | **Live on the App Store, at the latest** |

- **Android:** Play's closed test needs 12 testers enrolled for 14
  consecutive days, then a production-access review of about 7 days
  (checked in Play Console help, 2026-11-11). It starts with the first
  store build, not with the finished MVP, so Android can launch close to
  iOS. Recruiting the testers is SEI-71.
- **After launch:** EAS Update can add JavaScript screens without a new
  review, but not native modules. A native module an after-launch ticket
  needs ships in the first binary (`expo-image-picker` for S12).

## Gotchas

From the Paradero and Zagged reviews and the planning session:

- **Session size.** A Supabase session can exceed `expo-secure-store`'s
  ~2 KB value limit (Zagged moved its session out of SecureStore). SEI-44
  uses an encrypted store: a key in SecureStore, the data elsewhere.
- **Session expiry on device.** Zagged found expired-token bugs late, on
  real phones. Test background → foreground after the access token
  expires.
- **Metro + pnpm.** Zagged's SDK upgrade pain was Metro config in a
  monorepo. Settle `metro.config.js` and the pnpm workspace in SEI-41.
- **Currency on Hermes.** Hermes ignores some `Intl.NumberFormat` options
  (Paradero: `currencyDisplay: 'narrowSymbol'`). Checked in SEI-53: the
  native `formatUsd` (`style: 'currency'`, no `currencyDisplay`) prints the
  same as the PWA in a browser on the iOS simulator and the Android
  emulator. Keep `currencyDisplay` out of the formatters.
- **Android icons.** Material Symbols has no filled variants; filled
  icons on Android are SVG.
- **App Store.** Set `ITSAppUsesNonExemptEncryption` in `app.config.ts`
  from day one.
- **One EAS slug.** Per-variant slugs broke EAS for Zagged: one slug, one
  project id.
- **Runtime version.** Use the `fingerprint` policy. Zagged's `appVersion`
  policy stranded OTA updates after a version bump.
- **OTA before the first release.** Zagged added EAS Update late and
  couldn't update its early builds.
- **Detail screens inside each tab.** In Paradero the tab bar vanished on
  detail screens that were top-level routes. SEI-55 puts them in each
  tab's own stack (`ARCHITECTURE.md` → Navigation); keep new detail
  screens there.
- **SEI-48 keeps `glb_path`.** The frozen PWA selects it; dropping it
  breaks production on the next merge.
- **Untried anywhere:** native Google sign-in with Supabase (Zagged used
  browser OAuth), `expo-notifications`, Sentry, Expo in a pnpm monorepo.
  Each starts with a spike. (Unistyles 3 passed its spike in SEI-42.)

## Open questions

- **Clash Display: how to ship it.** Read in SEI-42 (ITF Free Font
  License 2.0, 17 Aug 2026, the `License/FFL.txt` in Fontshare's zip):
  §01 allows embedding the font in mobile apps, commercial use included,
  with no credit required. §02 forbids modifying the files (no subsetting
  or format conversion) and making them available to anyone else,
  "through another … repository … publicly accessible servers". This repo
  is public, so committing the font file would break §02. Options:
  make the repo private, or download the official file from Fontshare
  during the EAS build (and for local builds) so it never sits in git.
  Until one is chosen, headings use Archivo 600, the PWA's own fallback.
  Archivo and Geist Mono are under the SIL Open Font License.
- **Google sign-in setup.** Confirmed in SEI-44: one web client (the ID
  token's audience on Android), one iOS client per bundle id, one Android
  client per package and signing key's SHA-1; Supabase's Google provider
  lists the web and iOS client ids (and the Android ones), with «Skip nonce
  check» on for iOS. Saul creates them; the app reads them from
  `EXPO_PUBLIC_GOOGLE_*` (`ARCHITECTURE.md` → Auth). Proven end to end once
  they exist, on a physical phone.
- **Play's "App access" credentials.** A dedicated test Google account
  for reviewers. Confirm the current form in the store ticket.
- **Night for Garage.** The PWA's v3 Garage is art-directed for day only;
  night uses the base night palette. The port keeps that.
- **[+] position.** Bottom right by default; centred, as in the PWA, if
  Saul prefers.
- Whether 3D comes back (SEI-11) and the freemium model (SEI-13): after
  launch.
