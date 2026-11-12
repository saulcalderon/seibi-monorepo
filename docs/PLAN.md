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
| Test sign-in: email + password in the `development` and `preview` EAS builds only, never in `production` | Apple and Google sign-in can't be automated; a hidden production login breaks App Review guideline 2.3.1 |
| Accessibility: Paradero's rules and check scripts, aiming at WCAG 2.2 AA. High-contrast palettes come after the redesign | Cheap from the first screen, expensive to retrofit; high contrast is a new feature |
| Pace: at most 3 tickets in progress; only Saul reviews and merges PRs; agents never merge | Review is the bottleneck, and merging to `main` deploys to production |
| 3D is out of the port. SEI-48 removes the 3D step and keeps the `glb_path` column; whether 3D returns is a Backlog idea (SEI-11) | The frozen PWA still selects `glb_path` (`apps/app/src/lib/garage.ts`); 3D's future is undecided |
| Launch: App Store by 2026-12-15 at the latest, with the full MVP. The date moves before the scope does | Ship the MVP whole, then the rest |
| Styling: Unistyles 3. SEI-42 starts with a spike on SDK 58; on failure, fall back to plain `StyleSheet` + tokens | Same `StyleSheet.create` API plus themes and variants for the UI kit; neither reference app uses it |
| Zod at three boundaries: Edge Function responses, NHTSA vPIC, forms. Table reads use the generated Supabase types | Validate only the data whose shape Seibi doesn't control |
| Two app variants: Seibi Dev (`com.seibiapp.app.dev`) and Seibi (`com.seibiapp.app`). The `preview` EAS profile builds the production app | TestFlight and Play's closed test use the production app; one Apple app record fewer |
| Maestro E2E is postponed until after launch (SEI-52) | Days of setup that find little before there are users; CI keeps typecheck, lint and the check scripts |
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
| SEI-41 | `apps/mobile` with Expo SDK 58, Expo Router, EAS | `app.config.ts` with `EXPO_PUBLIC_APP_VARIANT` (2 variants), one slug, `eas.json` with `development` / `preview` / `production`, Metro + pnpm config, `expo-updates` with `fingerprint` and the OTA hook, splash + font gate, `ITSAppUsesNonExemptEncryption`, `react-native-svg`, the native modules after-launch tickets need (`expo-image-picker`) | Screens | SEI-40 | yes | SEI-41 |
| SEI-42 | Unistyles 3 theme | Spike on SDK 58 first; `light` / `night` themes from `docs/DESIGN.md`; fonts | High contrast | SEI-41 | yes | SEI-42 |
| SEI-43 | i18n | i18next + expo-localization, typed keys, `es.json` | `en.json` | SEI-41 | yes | SEI-43 |
| SEI-44 | Native auth | Apple + Google via `signInWithIdToken`; encrypted session store; `startAutoRefresh` / `stopAutoRefresh` on app state; full name on first Apple sign-in; `Stack.Protected`; email + password test sign-in in `development` / `preview` only; account-deleted screen | — | SEI-41 | yes | SEI-44 |
| SEI-45 | Sentry | `@sentry/react-native`, source maps from EAS builds | — | SEI-41 | yes | SEI-45 |
| SEI-46 | CI for the native app | Typecheck, lint, Paradero's 3 check scripts (tokens, contrast, strings) on every PR | Maestro (SEI-52) | SEI-41, SEI-42 | yes | SEI-46 |
| SEI-47 | Native push | `push_tokens` table + RLS; register the token after sign-in, delete it on sign-out; `reminders-daily` also sends through Expo; a tap opens Avisos | Web Push removal (SEI-49) | SEI-44 | yes | SEI-47 |

### 2 · Migración

| Id | Title | In | Out | Depends on | MVP | Linear |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data layer | Copy queries, mutations and types from `apps/app/src/lib/`; one folder per domain; query key factories; error code → i18n message map (no router import); Zod at the Edge Function and vPIC boundaries; generated Supabase types; kv-store for theme, active Vehicle and intro-done | Screens | SEI-43, SEI-44 | yes | SEI-53 |
| B | UI kit | The components in `docs/DESIGN.md` on Unistyles variants; `Icon` with the `expo-symbols` map; `sonner-native` toasts; `@expo/ui` pickers, toggles, menus and date picker, each tested on both platforms | Screens | SEI-42 | yes | SEI-54 |
| C | App shell | 4 `NativeTabs` (Inicio · Mi flota · Avisos · Estimados), a stack per tab; floating [+] opening the actions `formSheet`; header avatar → Perfil | Screen contents; the Appointment action until S13 | SEI-41, B | yes | SEI-55 |
| S1 | Splash and Login | Native splash; Apple and Google buttons; one still Vehicle image; legal line | Lockup fly animation; Vehicle carousel | SEI-44, B | yes | SEI-56 |
| S2 | Intro | Still slides | The phone animation | B, C | no | SEI-57 |
| S3 | First-run questions | Every question, the push permission ask, the optional first Vehicle (S5's form) | — | A, B, S5 | yes | SEI-58 |
| S4 | Inicio | Garage: Vehicle carousel, Mileage, status, greeting, paint accent | Changes to car art or paint presets; «Deshacer» | A, B, C | yes | SEI-59 |
| S5 | Mi flota and the Vehicle form | List, search, add and edit with vPIC, paint presets, km/mi, withdraw and restore | — | A, B, C | yes | SEI-60 |
| S6 | Vehicle detail | Service history, «Gastado este año», usage, readings and corrections, plan sources or the general label, Routines, render image with silhouette | 3D | A, B, C | yes | SEI-61 |
| S7 | Record a Service | Form with line items, shop, date, Mileage, notes; the Mileage write rules | Invoice photo (S12) | A, B, C | yes | SEI-62 |
| S8 | Update Mileage | A standalone reading dated today, strictly above the current odometer | — | A, B, C | yes | SEI-63 |
| S9 | Avisos | Statuses, detail with source, snooze, «Completa tu historial», hand-written Reminders, push opt-in | — | A, B, C, SEI-47 | yes | SEI-64 |
| S10 | Estimados | Estimate form, results, what drives the price, sources, past queries | Chat | A, B, C | no | SEI-65 |
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
| SEI-52 | Maestro E2E against seibi-dev, with the test sign-in | 4 · Después | SEI-52 |
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
- **Only Saul reviews and merges.** Every ticket is one PR from its own
  branch.
- A ticket that changes what is true updates `ARCHITECTURE.md` in the same
  PR.
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
  (Paradero: `currencyDisplay: 'narrowSymbol'`). `formatUsd` in
  `apps/app/src/lib/format.ts` uses `style: 'currency'`; check its output
  on a device.
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
  detail screens that were top-level routes.
- **SEI-48 keeps `glb_path`.** The frozen PWA selects it; dropping it
  breaks production on the next merge.
- **Untried anywhere:** native Google sign-in with Supabase (Zagged used
  browser OAuth), Unistyles 3, `expo-notifications`, Sentry, Expo in a pnpm
  monorepo. Each starts with a spike.

## Open questions

- **Contrast vs "keep the PWA's look".** Several light-palette pairs fail
  WCAG 2.2 AA (4.5:1), starting with white text on Radiant (3.69). The
  list is in `docs/DESIGN.md` → Accessibility. Decide before SEI-46 turns
  the contrast check on: adjust those values, or allow the large-text
  threshold (3:1) for specific pairs.
- **Clash Display licence.** It comes from Fontshare (ITF Free Font
  License). Confirm it allows bundling in a distributed app before SEI-42.
  Archivo and Geist Mono are under the SIL Open Font License.
- **Google sign-in setup.** Native Google sign-in needs the iOS and
  Android client ids added to Supabase's Google provider. Confirm in
  SEI-44.
- **Play's "App access" credentials.** A dedicated test Google account
  for reviewers. Confirm the current form in the store ticket.
- **The Estimados tab at launch.** Estimados (S10) ships after launch, so
  its tab is either hidden until then (added back by OTA, since tabs are
  JavaScript) or shown in a "pronto" state. Decide in SEI-55.
- **Night for Garage.** The PWA's v3 Garage is art-directed for day only;
  night uses the base night palette. The port keeps that.
- **[+] position.** Bottom right by default; centred, as in the PWA, if
  Saul prefers.
- Whether 3D comes back (SEI-11) and the freemium model (SEI-13): after
  launch.
