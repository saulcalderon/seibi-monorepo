# The app shell: tabs, the [+] and its actions, Perfil, deep links

Signed in, Seibi opens on three native tabs, «Inicio», «Mi flota» and
«Avisos» (Liquid Glass on iOS 26, Material 3 on Android). Each tab is a
stack of its own: a Vehicle opened in a tab opens inside it, under its tab
bar, and switching tabs and back finds each one where it was left. A
floating [+] sits bottom right, just above the bar, on every screen of every
tab: glass tinted orange on iOS, Material's floating action button on
Android. It opens a native sheet, «¿Qué quieres hacer?», with «Registrar un
Servicio» and «Actualizar Kilometraje» (no Appointment action until S13);
each opens its own sheet, a placeholder until S7 and S8. The avatar on the
right of each tab's header opens «Perfil» inside the current tab. A link to
a Vehicle (`seibi-dev://vehicle/<id>`) opens its detail in «Mi flota» with
the fleet list under it. The tab roots, the Vehicle detail and Perfil are
placeholders that the S-tickets fill in.

## Sub-features

- `tabs` three tabs, each with its icon and label; the selected one in the radiant text colour.
- `tab-stacks` a Vehicle opens inside the current tab with the tab bar and the [+] still on screen.
- `keeps-place` leaving a tab and coming back finds it on the same screen (a Vehicle still open).
- `fab-reach` the [+] shows on every tab root (and every screen inside the tabs), above the bar, bottom right.
- `fab-clear` the end of a long list scrolls clear of the [+]: nothing stays hidden under it.
- `actions-sheet` the [+] opens «¿Qué quieres hacer?» with the two actions; no «Cita» action.
- `action-sheets` each action replaces the actions sheet with its own («Registrar un Servicio», «Actualizar Kilometraje») and «Cerrar» closes it.
- `profile` the header avatar (initials, or Google's picture) opens Perfil inside the current tab: who is signed in, «Tema», «Cerrar sesión», «Eliminar cuenta», and in Seibi Dev the links to «Revisar datos» and «Kit de UI».
- `deep-link-vehicle` `seibi-dev://vehicle/<id>` opens that Vehicle in «Mi flota»; back leads to the fleet list. Signed out, the link lands on sign-in.
- `spoken-labels` each tab says its name; the [+] says «Acciones rápidas»; the avatar says «Perfil».

## How to get to it (user POV)

- Sign in: Inicio is the first screen. Tap a tab at the bottom.
- In «Mi flota», tap a Vehicle; in «Inicio», tap «Tu Vehículo»; in «Avisos», tap «Ver Vehículo».
- Tap the [+] at the bottom right, then an action.
- Tap the avatar at the top right of any tab.
- Open `seibi-dev://vehicle/<id>` from outside the app (Notes, Safari, `xcrun simctl openurl`, `adb shell am start -d`).

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test account set (`test user:` line).
- The test account has at least one Vehicle (the `data-layer` flow creates the Toyota Yaris 2015 on a fresh account). `flows/scripts/first-vehicle.js` reads it the way another device would and fails with that hint when there is none.
- Light mode, default text size (`verify.sh a11y <platform> reset`).

- **Whole journey.** `.claude/skills/verify/scripts/verify.sh drive ios app-shell` (then `android`). It signs in before `startRecording`, reads the first Vehicle's id and name (`first-vehicle.js`, read-only), then cold-starts signed in.
- **Tabs and labels.** `id: home-screen` with `id: home-vehicle`; `id: tab-home`, `tab-fleet`, `tab-reminders` and `id: open-actions` visible; the texts «Inicio», «Mi flota», «Avisos», «Acciones rápidas» and «Perfil» are on screen (Maestro reads the accessibility labels). Screenshot `shell-01-home`.
- **A Vehicle inside its tab.** Tap `tab-fleet`, then `id: fleet-vehicle-0`: `id: vehicle-name` shows with `tab-fleet` and `open-actions` still visible. Screenshots `shell-02-fleet`, `shell-03-fleet-vehicle`.
- **The [+] doesn't cover content.** Tap `tab-reminders` (`id: reminder-0-0`), swipe to the end: the last row and the card's bottom edge sit above the [+]. Screenshots `shell-04-reminders`, `shell-05-reminders-end`; look at the second one.
- **Each tab keeps its place.** Tap `tab-fleet`: still `id: vehicle-name`. Screenshot `shell-06-fleet-kept-place`. Back (edge swipe on iOS, Back on Android) to `fleet-vehicle-0`.
- **Actions from each tab root.** From Mi flota tap `open-actions`: `id: actions-sheet` with `action-record-service` and `action-update-mileage`, «¿Qué quieres hacer?», nothing matching `.*Cita.*`. Screenshot `shell-07-actions-from-fleet`; `close-sheet.yaml` closes it (a drag down on iOS, Back on Android). From Avisos, `shell-08-actions-from-reminders`; tap `action-record-service`: `id: record-service-sheet` replaces the actions sheet (`shell-09-record-service`), `record-service-sheet-close` closes it. From Inicio, `action-update-mileage` → `id: update-mileage-sheet` (`shell-10-update-mileage`).
- **Perfil.** `runFlow: open-profile.yaml` taps `id: open-profile`, waits for `id: profile-screen` and asserts `id: signed-in-as` has the test email; `tab-home` and `theme-check` are visible. Screenshot `shell-11-profile`.
- **Deep link.** `openLink: ${APP_URL}vehicle/${output.vehicleId}` (taps iOS's «Open» if asked): `id: vehicle-name` reads the Vehicle's name, `tab-fleet` visible. Screenshot `shell-12-deep-link-vehicle`. Back: `fleet-vehicle-0` (`shell-13-deep-link-back`).
- **Proof.** The run folder holds `startRecording/app-shell.mp4` and the 13 screenshots. The shell saves nothing; the read-only query for the PR is the Vehicle the link opened: `select id, brand, model, year, plate from vehicles where id = '<id>'` on seibi-dev.

## Gotchas

- iOS's back button shows only a chevron (`headerBackButtonDisplayMode: 'minimal'`) and its accessibility label is the previous screen's title, which is also a tab's label: tapping text «Mi flota» can hit the tab instead. The flow goes back with an edge swipe on iOS and `back` on Android.
- A drag that starts in the middle of the actions sheet scrolls nothing and doesn't close it; `close-sheet.yaml` drags from the sheet's top edge (68 % of the screen height) to the bottom on iOS.
- The [+] is placed from a per-platform tab bar height (`size.tabBar` in `src/theme/tokens.ts`): NativeTabs can't be measured. If the [+] overlaps the bar or floats far above it on a new OS or device, fix that token, and check `shell-01-home` on both platforms.
- The tab bar never minimizes on scroll (`minimizeBehavior="never"`): a shrinking bar would leave the [+] floating where the bar was.
- `seibi-dev://vehicle/<id>` exists in all three tabs; `+native-intent.tsx` sends it to «Mi flota». A link to another route (`seibi-dev://profile`) opens in Inicio.
- Signed out, a deep link lands on sign-in and is not replayed after signing in.
