# The app launches to the start screen

A cold start of Seibi shows the native splash (the logo mark on the light
background) until the app's fonts have loaded, then the start screen with
the heading «Seibi». Today the start screen is a placeholder that also
shows a tagline and one value computed by the shared maintenance engine;
its text comes from `es.json` ([`i18n.md`](./i18n.md)). The app shell
(SEI-55) and Login (S1) replace it, and this file changes with them.

## Sub-features

- `launch-ios` cold-starts Seibi Dev on the iOS Simulator to the start screen.
- `launch-android` cold-starts Seibi Dev on the Android emulator to the start screen.
- `splash-gate` keeps the native splash up until the fonts load; no frame of fallback text shows.
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

- **Cold start.** Run `.claude/skills/verify/scripts/verify.sh drive android app-launches` (then `ios`). The flow runs `stopApp`, then `openLink: ${DEV_URL}`. The splash shows the logo mark on `#F2F4F7`.
- **Start screen.** The flow waits up to 120 s for `id: start-title`, then asserts its text is `Seibi`. The video shows the splash, then the heading, with no frame in a fallback font. In a development build the dev client's own screens show between the two (see Gotchas).
- **Engine import.** The flow asserts `id: engine-check` reads `maintenance-engine: 12500 km`. A wrong or missing value means the shared package did not resolve or run.
- **Proof.** The flow takes `takeScreenshot: start-screen` and stops the recording. The run folder holds `startRecording/app-launches.mp4` and `takeScreenshot/start-screen.png`; both show «Seibi» on the start screen. `doctor.txt` shows the branch, commit and the installed app.

## Gotchas

- A red error screen instead of the start screen is a JavaScript or bundling error: read `$TMPDIR/seibi-verify-8081/metro.log`.
- The dev client's server list means the link did not open a Metro: run `doctor`; on Android check the `adb reverse` line.
- After a native change (`app.config.ts`, a package with native code), the installed build is stale: `launch <platform> --rebuild`.
- The first bundle after starting Metro is slow; `launch` warms it. A flow that times out on `start-title` right after a Metro restart is usually a cold cache, not a failure: rerun `launch`.
- The splash is light even when the simulator is in dark mode (the PWA's look). The start screen follows the system theme, or the saved preference ([`theme.md`](./theme.md)).
- Development builds add their own screens to the video, and they are not Seibi's: on iOS the dev client's server list flashes and a "Downloading" bar shows before the splash returns (about 3 s from link to start screen); on Android a blank loading view follows the splash for about 15 s while the emulator starts the process and evaluates the unminified bundle (logcat: `Running "main"`). A `preview` build should keep the splash up until the fonts load; prove that when the first one exists.
