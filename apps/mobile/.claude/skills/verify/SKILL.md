---
name: verify
description: Drive Seibi's native app (apps/mobile, Expo dev build "Seibi Dev") on the iOS Simulator or the Android emulator with Maestro, the way a user does, and capture a video, screenshots and saved data as proof. Use before merging any PR that changes what a user sees or does in apps/mobile, to prove a feature from features/, or when asked to run, check or screenshot the native app.
---

# Verify Seibi's native app

Proof for `apps/mobile` comes from the running app, not from tests or a
clean compile. This skill launches the **Seibi Dev** development build
(`com.seibiapp.app.dev`) on a simulator or emulator that it owns, drives it
with [Maestro](https://docs.maestro.dev) flows, and keeps the evidence
outside git.

Everything goes through one helper, run from `apps/mobile`:

```bash
.claude/skills/verify/scripts/verify.sh launch  ios|android [--rebuild]
.claude/skills/verify/scripts/verify.sh doctor  ios|android
.claude/skills/verify/scripts/verify.sh drive   ios|android <flow>
.claude/skills/verify/scripts/verify.sh cleanup [ios|android|all]
.claude/skills/verify/scripts/verify.sh where
```

`<flow>` is a file name in `flows/` without `.yaml`. The feature map in
[`features/README.md`](features/README.md) says which flow proves which
feature.

## Requirements

- Run `pnpm install` at the repo root first.
- iOS: Xcode with an iOS Simulator runtime (`xcrun simctl list runtimes`
  shows one; if not, `xcodebuild -downloadPlatform iOS`).
- Android: the SDK in `~/Library/Android/sdk` (or `ANDROID_HOME`), Java 17,
  and the AVD `seibi-pixel` (`emulator -list-avds`).
- Maestro: `maestro` on `PATH`, or `~/.maestro/bin/maestro`, or
  `MAESTRO_BIN`.

## Launch

```bash
cd apps/mobile
.claude/skills/verify/scripts/verify.sh launch android   # or ios
```

What it does, in order:

1. **Device.** iOS: finds the simulator named `Seibi Verify` (creates it as
   an iPhone 17 on the newest iOS runtime if it is missing, and restarts it
   once: a new iOS 27 simulator ignores dark-mode changes until its first
   reboot), boots it and
   opens Simulator.app. It pre-approves the dev client's `exp+seibi` scheme
   so no "Open in Seibi Dev?" prompt appears. Android: boots the AVD
   `seibi-pixel` as `emulator-5560` if that serial is not already running,
   waits for `sys.boot_completed`, and maps the Metro port into the emulator
   with `adb reverse`.
2. **App.** If Seibi Dev is not installed (or `--rebuild` is passed), it
   runs `expo run:<platform> --no-bundler` with
   `EXPO_PUBLIC_APP_VARIANT=development`: prebuild, native build, install.
   The first build takes 10+ minutes (Android ~18 on a cold Gradle cache);
   later ones are incremental. After any change to native config
   (`app.config.ts`, a package with native code, an Expo SDK change), or if
   `ios/` / `android/` were last generated for the production variant,
   regenerate first, then rebuild:

   ```bash
   EXPO_PUBLIC_APP_VARIANT=development npx expo prebuild --clean --no-install
   .claude/skills/verify/scripts/verify.sh launch ios --rebuild
   ```

   JavaScript changes need no rebuild.
3. **Metro.** Starts `expo start --port 8081` from `apps/mobile` (log in
   `$TMPDIR/seibi-verify-8081/metro.log`) unless a Metro already serving
   this checkout's Seibi Dev runs on that port. A port that serves any
   other app or another worktree is a failure, never something to drive.
4. **Warm-up.** Downloads the platform's bundle once, so flows don't time
   out on a cold Metro cache.
5. **Doctor.** Ends with the doctor below; `doctor: OK` means ready.

Ready means: `doctor: OK`. The app itself is opened by each flow (see
Drive), so a fresh install with no data is the starting state.

Teardown is `cleanup` (below).

## Doctor

```bash
.claude/skills/verify/scripts/verify.sh doctor android   # or ios
```

Read-only. It prints and checks: the git branch and commit being served,
the Maestro version, that Metro on the port answers and its manifest is
`Seibi Dev|seibi|<this checkout's apps/mobile>` (right app, development
variant, this worktree rather than another one), whether this helper
started that Metro, that the simulator or emulator is booted, that
`com.seibiapp.app.dev` is installed (iOS also prints the installed display
name), and on Android the `adb reverse` for the port. Run it first
whenever anything looks off. A Metro the helper did not start may belong
to another session: don't drive it unless it is yours.

## Drive

```bash
.claude/skills/verify/scripts/verify.sh drive android app-launches   # or ios
```

`drive` runs `maestro test --device <udid|emulator-5560> flows/<flow>.yaml`
with two variables:

- `APP_ID`: `com.seibiapp.app.dev`.
- `DEV_URL`: the dev client link that cold-starts Seibi Dev on this Metro,
  in the SDK 58 format Expo CLI itself opens:
  `exp+seibi://?__expo_url=http%3A%2F%2Flocalhost%3A8081` plus
  `__expo_disable_fab=1&__expo_disable_auto_launch=1&__expo_disable_onboarding=1`,
  which keep the dev menu's floating button, auto-opened menu and
  onboarding out of the recording. `localhost` works on both platforms:
  the simulator shares the Mac's network, and `launch` maps the port into
  the emulator.

Every flow starts with `startRecording`, then `stopApp` and
`openLink: ${DEV_URL}`: a cold start, splash included. It ends with
`takeScreenshot` and `stopRecording`.

Writing a flow for a new feature:

- Target elements by `testID` (`id:` in Maestro); both platforms expose
  it. Add a `testID` to the component if the element has none. Visible
  text is the fallback, and only for copy the feature owns.
- Wait with `extendedWaitUntil`, never fixed sleeps.
- Assert the resulting state after each action, not only the last screen.
- Name screenshots after the state they prove (`takeScreenshot:
  service-saved`).
- Copy `flows/app-launches.yaml` as the starting point and keep the
  recording around the whole journey.

Sign-in: the app has none yet. SEI-44 adds the email + password test
sign-in (development and preview builds only); it must add a
`flows/sign-in.yaml` that the other flows run first, and say here which
seibi-dev test account it uses and where its password comes from (never
in git).

## Evidence

Each `drive` writes one run folder outside git:

```
~/seibi-verify/<YYYYMMDD-HHMMSS>-<flow>-<platform>/
  doctor.txt                              doctor output at the start of the run
  maestro.log                             Maestro's console output
  report.xml                              JUnit result
  <timestamp>/<flow name>/
    startRecording/<name>.mp4             the video of the whole journey
    takeScreenshot/<name>.png             the screenshots
    commands.json, logs/                  each command's result, device logs
  debug/                                  Maestro's debug output
```

`verify.sh where` prints the root (`SEIBI_VERIFY_EVIDENCE` overrides it).
`drive` fails if the flow fails or no video was recorded, and lists the
video and screenshots it wrote.

Proof standards for a PR (`AGENTS.md` → "Prove it works"):

- Drive the real user path: the screens and controls a person uses. No
  test-only routes, internal setters, or seeded state the user could not
  have created.
- Capture the action and the resulting state: the video covers the whole
  journey; screenshots show the state after the key actions.
- Verify side effects beside what is visible. When a journey saves data,
  run a read-only `SELECT` against the hosted **seibi-dev** Supabase
  project (Supabase MCP `execute_sql`) that shows the saved row, and paste
  the query and result in the PR. Never write to seibi-dev by hand to make
  a journey pass, and never touch production.
- Mocks only where a production boundary already isolates the outside
  system.
- Prove it on both platforms when the change touches both. If one
  platform can't run, say so in the PR as an unchecked box; never report
  it as verified through the other.
- Attach the video to the Linear ticket and link it from the PR. Update
  the feature's file in `features/` in the same PR.

## Cleanup

```bash
.claude/skills/verify/scripts/verify.sh cleanup        # or: cleanup ios | cleanup android
```

It stops only what `launch` started, tracked in
`$TMPDIR/seibi-verify-<port>/`: the emulator (if `launch` booted it) and
the `adb reverse` rule, the simulator (shut down if `launch` booted it; the
`Seibi Verify` device stays for the next run), and, on a full cleanup
only, Metro (the process group of the PID that owned the port, checked
again before the kill). `cleanup ios` or `cleanup android` leaves Metro up
for the other platform. It never kills by process name and never deletes
`~/seibi-verify`: the evidence survives. The logs in
`$TMPDIR/seibi-verify-<port>/` (`metro.log`, `emulator.log`,
`build-<platform>.log`) stay for debugging and are overwritten by the next
run. Run cleanup after every failed attempt too.

## Helpers

- `scripts/verify.sh`: the launch, doctor, drive and cleanup commands
  above. Run it with no arguments for usage. Settings, all optional:
  `SEIBI_VERIFY_PORT` (Metro port, default 8081; use another to run beside
  a Metro you don't own), `SEIBI_VERIFY_EVIDENCE` (evidence root),
  `SEIBI_VERIFY_AVD` (default `seibi-pixel`), `SEIBI_VERIFY_EMU_PORT`
  (default 5560), `SEIBI_VERIFY_SIM` (default `Seibi Verify`),
  `MAESTRO_BIN`.
- `flows/*.yaml`: one Maestro flow per feature journey, named in the
  feature's file.

## Isolation

- One Metro per port. Two sessions (two worktrees) can run side by side
  with different `SEIBI_VERIFY_PORT` values, but they share the
  `Seibi Verify` simulator and the `seibi-pixel` emulator, and each install
  of Seibi Dev replaces the other's. Don't drive the same device from two
  sessions at once; wait, or use another simulator name and AVD.
- Seibi Dev and Seibi (`com.seibiapp.app`) install side by side; the flows
  only touch Seibi Dev.

## Keeping it current

Every PR that changes what a user sees or does adds or updates its file in
`features/` (and its flow). `/maintain-verification-skill` audits the map
against the app.
