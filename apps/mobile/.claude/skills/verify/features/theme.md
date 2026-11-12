# The theme follows the phone and the saved preference

Seibi draws every screen in the PWA's light or night palette. By default
(«Auto») it follows the phone: switching the phone between light and dark
mode recolours the open screen in place, with no reload. Picking «Claro» or
«Oscuro» fixes the theme whatever the phone says, and the choice survives a
cold start: the app opens straight in it. Today the choice lives in the
«Tema» control on the placeholder start screen; Perfil (S11) takes it over,
and this file changes with it.

## Sub-features

- `palette-light` draws the start screen on `bg #f2f4f7` with `ink` text, as the PWA's light theme.
- `palette-night` draws it on `bg #0e0f11` with night `ink`, as the PWA's night theme.
- `follow-system` (preference «Auto») switches light ↔ night when the phone switches, while the screen stays open: no splash, no reload.
- `preference-night` («Oscuro») shows night while the phone is light.
- `preference-light` («Claro») shows light while the phone is dark.
- `preference-persists` opens a cold start in the saved choice from the first frame.
- `theme-check` reads `theme: <light|night> (<system|preference>)`: the active theme and what chose it.

## How to get to it (user POV)

- Switch the phone between light and dark mode (Settings → Appearance on iOS, quick settings on Android) while Seibi is open.
- Tap «Auto», «Claro» or «Oscuro» in the «Tema» control on the start screen.
- Close Seibi and open it again.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`.
- Seibi Dev is installed from the branch under test, built after Unistyles joined (SEI-42). An older build has no Unistyles native module and shows a red screen.
- The seibi-dev test account is available to `verify.sh` (see [`auth.md`](./auth.md)): the start screen is the signed-in home, so the flow signs in first when signed out (`sign-in.yaml`).
- On iOS, the simulator has rebooted at least once since it was created (`launch` does this for a simulator it creates; see Gotchas).

- **Start in light.** Run `.claude/skills/verify/scripts/verify.sh drive ios theme` (then `android`). The flow sets the device to light (`setDarkMode: disabled`), cold-starts the app, signs in if needed, taps `id: theme-system` and waits for `id: theme-check` to read `theme: light (system)`. Screenshot `system-light`: light palette.
- **Phone goes dark.** The flow runs `setDarkMode: enabled` and waits for `theme: night (system)`, then asserts `start-title` and `engine-check` are still on screen. Screenshot `system-night`: night palette. The video shows the screen recolour in place.
- **Phone back to light.** `setDarkMode: disabled`; `theme-check` reads `theme: light (system)` again.
- **Oscuro.** The flow taps `id: theme-night` and waits for `theme: night (preference)`, with the phone still light. Screenshot `preference-night`.
- **Cold start keeps it.** `stopApp`, then the dev link again; `theme-check` reads `theme: night (preference)` on the first screen. Screenshot `preference-night-cold-start`.
- **Back to Auto.** The flow taps `id: theme-system`; `theme-check` reads `theme: light (system)`. Screenshot `system-light-restored`. The run leaves the device in light and the preference on Auto.
- **Proof.** The run folder holds `startRecording/theme.mp4` and the five screenshots. Check the background colour of the screenshots, not only how they look: `system-light` and `system-light-restored` are `#f2f4f7`, `system-night`, `preference-night` and `preference-night-cold-start` are `#0e0f11`.

## Gotchas

- A newly created iOS 27 simulator stores dark mode (`xcrun simctl ui <udid> appearance` says `dark`) but keeps drawing light, even in its own Settings, until it reboots once. `verify.sh launch` reboots a simulator it creates; for one created by hand, `xcrun simctl shutdown <udid>` and `launch` again.
- iOS crossfades the whole window when the appearance changes, and the splash fades out on a cold start. A screenshot taken the moment `theme-check` changes catches a grey, half-faded frame; the flow waits for animations to end first.
- `theme-check` is the only part of the screen that re-renders on a theme change; everything else is recoloured natively by Unistyles. If the whole screen re-renders on a switch, check that `app.config.ts` still passes `adaptiveColors: false` to the `expo-router` plugin.
- The saved choice is `theme.v1` in the app's kv-store. A run that stops halfway can leave «Oscuro» saved; the flow taps «Auto» first, so the next run still starts from Auto.
- The emulator and simulator are shared between sessions: the flow leaves dark mode off, but a failed run may leave it on. Check before handing the device back (`xcrun simctl ui <udid> appearance`, `adb -s emulator-5560 shell cmd uimode night`).
