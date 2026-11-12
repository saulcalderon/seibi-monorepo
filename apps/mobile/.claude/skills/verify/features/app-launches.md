# The app launches to Inicio

A cold start of Seibi shows the native splash (the logo mark on the
phone's light or night background) until the app's fonts have loaded and the saved session has
been read, then the sign-in screen (signed out) or Inicio, the first of the
three tabs (signed in), with the floating [+] over the tab bar. Inicio is a
placeholder today: a greeting and the active Vehicle, derived by the shared
maintenance engine from the garage query. The tabs themselves are
[`app-shell.md`](./app-shell.md); sign-in is [`auth.md`](./auth.md); the
Garage (S4) replaces Inicio's content.

## Sub-features

- `launch-ios` cold-starts Seibi Dev on the iOS Simulator to Inicio.
- `launch-android` cold-starts Seibi Dev on the Android emulator to Inicio.
- `splash-gate` keeps the native splash up until the fonts load and the session is read; no frame of fallback text, and no flash of sign-in for a signed-in person.
- `home` shows the tabs, the [+] and the large title «Inicio» in the heading font (Archivo SemiBold until Clash Display joins), in the theme's colours ([`theme.md`](./theme.md)).
- `engine` shows the active Vehicle («Tu Vehículo»), which only appears once `@seibi/maintenance-engine` has derived the garage; an account with no Vehicle shows «Sin Vehículos todavía».

## How to get to it (user POV)

- Open the app from a cold start. In a development build that is the dev
  client link `${DEV_URL}` (what `expo start` and the flow open).
- Tap the Seibi icon on the home screen. In a development build this opens
  the dev client's server list instead, so this entry point is provable
  only on a `preview` or `production` build (none exists yet).

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`.
- Seibi Dev is installed from the branch under test.
- The seibi-dev test account exists and `doctor` shows `test user: … (password set)` (the flow signs in when it starts signed out).

- **Cold start.** Run `.claude/skills/verify/scripts/verify.sh drive android app-launches` (then `ios`). The flow runs `stopApp`, then `openLink: ${DEV_URL}`. The splash shows the logo mark on `#F2F4F7` (dark ticks), or on `#0E0F11` with white ticks when the phone is in dark mode (`login-night`, [`auth.md`](./auth.md)).
- **Inicio.** `runFlow: sign-in.yaml` waits up to 120 s for `id: sign-in-title` or `id: home-screen`, signs in with the test account if it is the sign-in screen, and waits for `id: home-screen`. The flow asserts `id: tab-home` and `id: open-actions`. The video shows the splash, then Inicio, with no frame in a fallback font. In a development build the dev client's own screens show between the two (see Gotchas).
- **Engine and data.** The flow waits for `id: home-vehicle` (or `id: home-empty`). It never shows when the garage query or the shared package fails (an error state shows instead).
- **Proof.** The flow takes `takeScreenshot: home` and stops the recording. The run folder holds `startRecording/app-launches.mp4` and `takeScreenshot/home.png`. `doctor.txt` shows the branch, commit and the installed app.

## Gotchas

- A red error screen instead of Inicio is a JavaScript or bundling error: read `$TMPDIR/seibi-verify-8081/metro.log`. «EXPO_PUBLIC_SUPABASE_URL … are not set» means `apps/mobile/.env.local` is missing (copy `.env.example`; values in `ARCHITECTURE.md` → Auth).
- The dev client's server list means the link did not open a Metro: run `doctor`; on Android check the `adb reverse` line.
- After a native change (`app.config.ts`, a package with native code), the installed build is stale: `launch <platform> --rebuild`.
- The first bundle after starting Metro is slow; `launch` warms it. A flow that times out on `home-screen` right after a Metro restart is usually a cold cache, not a failure: rerun `launch`.
- The splash follows the phone's appearance, not Seibi's «Tema» preference: the OS draws it before any JavaScript runs. A splash change is native: it shows only after a new build (`launch <platform> --rebuild` after `expo prebuild --clean`). Inicio follows the system theme, or the saved preference ([`theme.md`](./theme.md)).
- Development builds add their own screens to the video, and they are not Seibi's: on iOS the dev client's server list flashes and a "Downloading" bar shows before the splash returns (about 3 s from link to Inicio); on Android a blank loading view follows the splash for about 15 s while the emulator starts the process and evaluates the unminified bundle (logcat: `Running "main"`). A `preview` build should keep the splash up until the fonts load; prove that when the first one exists.
