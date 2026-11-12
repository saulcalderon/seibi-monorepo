# The app launches to the start screen

A cold start of Seibi shows the native splash (the logo mark on the
phone's light or night background) until the app's fonts have loaded and the saved session has
been read, then the sign-in screen (signed out) or the start screen
(signed in) with the heading «Seibi». Today the start screen is a
placeholder, the signed-in home, that also shows a tagline and one value
computed by the shared maintenance engine; its text comes from `es.json`
([`i18n.md`](./i18n.md)). The app shell (SEI-55) and Login (S1) replace
it, and this file changes with them. Sign-in itself is
[`auth.md`](./auth.md).

## Sub-features

- `launch-ios` cold-starts Seibi Dev on the iOS Simulator to the start screen.
- `launch-android` cold-starts Seibi Dev on the Android emulator to the start screen.
- `splash-gate` keeps the native splash up until the fonts load and the session is read; no frame of fallback text, and no flash of sign-in for a signed-in person.
- `start-screen` shows the heading «Seibi» in the heading font (Archivo SemiBold until Clash Display joins), in the theme's colours ([`theme.md`](./theme.md)).
- `engine-check` shows `maintenance-engine: 12500 km`, computed by `@seibi/maintenance-engine` at runtime.

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
- **Start screen.** `runFlow: sign-in.yaml` waits up to 120 s for `id: sign-in-title` or `id: start-title`, signs in with the test account if it is the sign-in screen, and waits for `id: start-title`; the flow then asserts its text is `Seibi`. The video shows the splash, then the heading, with no frame in a fallback font. In a development build the dev client's own screens show between the two (see Gotchas).
- **Engine import.** The flow asserts `id: engine-check` reads `maintenance-engine: 12500 km`. A wrong or missing value means the shared package did not resolve or run.
- **Proof.** The flow takes `takeScreenshot: start-screen` and stops the recording. The run folder holds `startRecording/app-launches.mp4` and `takeScreenshot/start-screen.png`; both show «Seibi» on the start screen. `doctor.txt` shows the branch, commit and the installed app.

## Gotchas

- A red error screen instead of the start screen is a JavaScript or bundling error: read `$TMPDIR/seibi-verify-8081/metro.log`. «EXPO_PUBLIC_SUPABASE_URL … are not set» means `apps/mobile/.env.local` is missing (copy `.env.example`; values in `ARCHITECTURE.md` → Auth).
- The dev client's server list means the link did not open a Metro: run `doctor`; on Android check the `adb reverse` line.
- After a native change (`app.config.ts`, a package with native code), the installed build is stale: `launch <platform> --rebuild`.
- The first bundle after starting Metro is slow; `launch` warms it. A flow that times out on `start-title` right after a Metro restart is usually a cold cache, not a failure: rerun `launch`.
- The splash follows the phone's appearance, not Seibi's «Tema» preference: the OS draws it before any JavaScript runs. A splash change is native: it shows only after a new build (`launch <platform> --rebuild` after `expo prebuild --clean`). The start screen follows the system theme, or the saved preference ([`theme.md`](./theme.md)).
- Development builds add their own screens to the video, and they are not Seibi's: on iOS the dev client's server list flashes and a "Downloading" bar shows before the splash returns (about 3 s from link to start screen); on Android a blank loading view follows the splash for about 15 s while the emulator starts the process and evaluates the unminified bundle (logcat: `Running "main"`). A `preview` build should keep the splash up until the fonts load; prove that when the first one exists.
