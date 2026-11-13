# Seibi native app verification map

This directory is the maintained source for verifying what a user sees and
does in `apps/mobile`. Read this index before driving the app, then use the
matching feature file as the recipe. The commands come from
[`../SKILL.md`](../SKILL.md); run them from `apps/mobile`.

## Baseline preconditions

- `verify.sh launch <ios|android>` has finished with `doctor: OK`.
- The device runs Seibi Dev (`com.seibiapp.app.dev`), built from the
  branch being proven (`doctor` prints branch and commit).
- Metro on the port serves this checkout's Seibi Dev and was started by
  `launch`.
- Never drive a Metro, simulator or emulator that this verification run did
  not start or check with `doctor`.

## Driving conventions

- Every flow cold-starts the app through `${DEV_URL}`; start each recipe
  from that state unless its preconditions say otherwise.
- Target elements by `testID` (`id:` in Maestro). Visible text is the
  fallback, and only for copy the feature owns.
- Treat flow names, test IDs and expected text as literal.
- Wait with `extendedWaitUntil`, not fixed sleeps.
- Data a journey saves goes to the hosted seibi-dev project. Restore or
  remove it after the run, but keep the evidence.
- Inicio (the home, inside the tabs) needs a session. A flow that starts there runs
  `runFlow: sign-in.yaml` after opening the app; it signs in with the
  seibi-dev test account when the sign-in screen shows.

## Proof and skip reporting

- Proof is the run folder `drive` prints: the video
  (`startRecording/*.mp4`), screenshots (`takeScreenshot/*.png`),
  `maestro.log`, `report.xml` and `doctor.txt`.
- A journey that saves data also needs a read-only seibi-dev `SELECT`
  showing the saved row.
- Prove on iOS and Android when the change touches both. Report a platform
  that could not run, with the command tried and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the
user-visible behaviour. It then uses exactly four H2 sections in this
order.

1. `Sub-features` lists short IDs with one line for each behaviour.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify.sh` starts with `Preconditions:` and uses
   labelled bullets that pair each user action with an exact command or
   flow step and the observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable
handles, required state, commands and observable proof.

## Features

- [The app launches to Inicio](./app-launches.md): cold start, native
  splash, Inicio inside the tabs, on iOS and Android. Flow: `app-launches`.
- [The app shell: tabs, the [+] and its actions, Perfil, deep
  links](./app-shell.md): three tabs with a stack each that keep their
  place, the floating [+] and its actions sheet, Perfil from the header
  avatar, `seibi-dev://vehicle/<id>`. Flow: `app-shell`; subflows
  `open-profile.yaml`, `close-sheet.yaml`.
- [Inicio: the Garage](./home.md): the greeting, the stage with the
  active Vehicle (poster or silhouette), paging by swipe, arrows and an
  adjustable pager, the choice kept across a cold start, Mileage with
  «Actualizar», «Estado» and «Todo al día», «Sin Vehículos todavía», night.
  Flows: `home` (the real account), `home-fixture` (Seibi Dev's sample
  Vehicles), `home-night`; subflow `home-fixture-open.yaml`.
- [The app speaks Spanish from es.json](./i18n.md): every word from
  `src/i18n/es.json`, no keys on screen, Spanish also on a device set to
  English. Flow: `i18n-shell`.
- [The theme follows the phone and the saved preference](./theme.md):
  light and night palettes, a live switch with no reload, the «Tema»
  choice kept across a cold start. Flow: `theme`.
- [Sign-in, session and sign-out](./auth.md): Login (lockup, Vehicle,
  Apple and Google, the legal links) in light, night, large text and Reduce
  Motion, the protected routes, the test sign-in, the session surviving a
  relaunch, sign-out, account deletion and «Cuenta eliminada». Flows:
  `login` (the password-free video), `login-night`, `login-a11y`, `auth`;
  destructive:
  `delete-account`, `account-deleted-elsewhere`. Subflow for every flow
  that needs a session: `sign-in.yaml`.
- [The data layer reads and writes seibi-dev](./data-layer.md): the
  development-only «Revisión de datos» screen lists the test account's
  Vehicles, refuses and saves a standalone Mileage reading, and prints the
  formatters as Hermes renders them. Flow: `data-layer`.
- [The UI kit's sample screen shows every component and works](./ui-kit.md):
  every component of `src/ui/` in light and night, each control used once,
  the form sheet with the keyboard, the largest text size and Reduce
  Motion (Seibi Dev only, `seibi-dev://ui-kit`). Flows: `ui-kit`,
  `ui-kit-night`, `ui-kit-form`, `ui-kit-large-text`,
  `ui-kit-reduce-motion`; subflow `ui-kit-open.yaml`.
