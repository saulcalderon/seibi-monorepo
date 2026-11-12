# The UI kit's sample screen shows every component and works

Seibi Dev has a sample screen, «Kit de UI», with every component of the UI
kit in the active theme: the type scale and tones, buttons, chips, cards
and rows, text, number and Mileage fields, the platform's own picker,
switch, menu and date picker, status badges and progress bars, empty and
error states, a skeleton that takes the content's place, toasts, the
native confirmation alert, the logo and the eight body-type silhouettes,
and the icon map. «Abrir formulario en hoja» opens a sample form in a
native sheet whose «Guardar» stays above the keyboard. Four lines at the
top say what the screen is drawn with: `theme: …`, `motion: …` (Reduce
Motion), `text: …×` (the system text size) and `fit: ok` when every Text's
drawn lines fit its box (otherwise `fit: N cut: <the words drawn>`). The
screen exists only in development builds; in any other build its route
goes home and the sample isn't in the bundle.

## Sub-features

- `palette-light` / `palette-night` every section draws in the light or night palette, following the phone.
- `buttons` each variant and size; a tap counts (`Toques: n`); loading and disabled buttons ignore taps.
- `chips` one filter at a time (`Filtro: <id>`), selected chip filled; a count stays a pill when its chip loses the selection.
- `text-fit` no label is cut: `fit: ok` (Android once drew «Al» of «Al día»; docs/DESIGN.md → Text that fits).
- `rows` a tappable row is one button (`Fila tocada: …`); at large text its parts stack.
- `fields` focus ring, hint, error, `· opcional`, unit suffix; the Mileage groups thousands as it is typed (`52,000`).
- `native-controls` `@expo/ui` picker, switch, menu (with SF Symbols and a destructive item on iOS) and date picker; their values show in `kit-native-check`.
- `states` the four status badges with bars, the empty state, the error state with «Reintentar» (`Reintentos: n`).
- `skeleton` «Simular carga» swaps the content for a skeleton of the same height (`Alto con contenido: N pt · cargando: N pt`).
- `toasts` «Mostrar aviso» and «Mostrar error» show a toast at the top; VoiceOver and TalkBack read it.
- `confirm` «Pedir confirmación» opens the native alert; «Cancelar» and «Eliminar» answer it (`Confirmación: …`).
- `brand` the isotype at three sizes and on light and dark surfaces; the eight silhouettes.
- `form-sheet` the sample form in a native sheet: required Mileage error, «Guardar» above the keyboard, a drag puts the keyboard away on iOS (on Android a downward drag closes the sheet), saving shows a toast and closes the sheet.
- `large-text` at the largest text size nothing overlaps or is cut (`fit: ok`); rows and switches stack; icons beside text grow with it.
- `reduce-motion` with Reduce Motion on: no press scale, no skeleton pulse, no progress fill, toasts appear in place.
- `dev-only` the route exists only in Seibi Dev.

## How to get to it (user POV)

- In Seibi Dev, open `seibi-dev://ui-kit` (from Safari, Notes, `xcrun simctl openurl`, `adb shell am start -d`). It opens signed in or signed out; the back button returns to where the link opened it.
- On the sample screen, tap «Abrir formulario en hoja» for the form sheet.
- Change the phone's appearance, text size or Reduce Motion (Settings → Accessibility on iOS; Display and Accessibility on Android) and open the screen again.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with a Seibi Dev built from this branch (it needs `react-native-keyboard-controller` and `sonner-native`; an older build shows a red screen).
- No session is needed: the flows open the screen by deep link and never sign in.
- The device is in its default text size and motion (`verify.sh a11y <platform> reset`) except where a flow below says otherwise.

- **Light, every control.** `.claude/skills/verify/scripts/verify.sh drive ios ui-kit` (then `android`). The flow sets light mode, cold-starts the app, opens `${APP_URL}ui-kit`, puts the kit's «Tema» back on Auto if needed, and asserts `theme: light (system)`, `text: 1.00×` and `fit: ok`. It then walks every section: taps «Guardar» (`Toques: 1`), «Vencidos» (`Filtro: overdue`; on Android it crops «Todos»'s count as `round-01-chip-count`), «Cambio de aceite» (`Fila tocada: Cambio de aceite`), types a plate and `52000` in the Mileage (`52,000`), picks «Reparación», turns the switch off, picks «Archivar» from the menu (`Menú: Archivar`), picks the 20th in the date picker (`Tipo: Reparación · Recordatorios: no · Fecha: 20 nov 2026`), taps «Reintentar» (`Reintentos: 1`), toggles the skeleton (equal heights in `kit-loading-check`), shows both toasts, cancels and then accepts the confirmation (`Confirmación: eliminado`), and asserts `fit: ok` again in `kit-fit-check-end` under the icons. `verify.sh` then checks the `round-*` crops' corners (`round-check.txt`). Screenshots `light-01-type` … `light-19-icons`, with the open picker, menu and calendar, both toasts and the alert.
- **Night.** `verify.sh drive <platform> ui-kit-night`. The flow sets dark mode, opens the kit, waits for `theme: night (system)`, asserts `fit: ok` and photographs every section (`night-01-type` … `night-12-icons`), the open menu, the skeleton and both toasts, then sets light mode and waits for `theme: light (system)` on the open screen.
- **Form sheet.** `verify.sh drive <platform> ui-kit-form`. Opens the sheet (`form-01-sheet`), closes it with the X and opens it again, taps «Guardar» empty (`Escribe el kilometraje de este servicio.`, `form-02-mileage-required`), types the shop and `61500` (`61,500`) with «Guardar» still on screen above the keyboard (`form-03-keyboard-text`, `form-04-keyboard-number`), puts the keyboard away (a drag on iOS, Back on Android), types notes (`form-05-keyboard-notes`) and saves: toast `Servicio de muestra guardado`, sheet gone (`form-06-saved`).
- **Largest text.** `verify.sh a11y <platform> large-text` (iOS: `accessibility-extra-extra-extra-large`; Android: font scale 2.0), then `verify.sh drive <platform> ui-kit-large-text`, then `verify.sh a11y <platform> reset`. The flow asserts `kit-text-check` is not `1.00×` and `fit: ok`, and photographs every section and the form with the keyboard up (`large-01-top` … `large-12-form-keyboard`). Check the pictures: no text cut off or drawn over another, rows and the switch stacked, «Guardar» visible.
- **Reduce Motion.** `verify.sh a11y <platform> reduce-motion`, then `verify.sh drive <platform> ui-kit-reduce-motion`, then `verify.sh a11y <platform> reset`. The flow asserts `motion: reduced`, photographs the progress bars, the skeleton twice (`motion-03-skeleton-a` and `-b` show the same frame) and a toast. The video shows no pulse, no bar fill and no toast slide.
- **Proof.** Each run folder holds `startRecording/<flow>.mp4` and the screenshots named above. Nothing is saved to seibi-dev, so no query is needed.

## Gotchas

- The page is long. Maestro's `scrollUntilVisible` checks the window, not what the native header covers: scroll to the control the flow taps next, not to a line below it, or the tap lands under the header (on iOS a tap there can scroll the page back to the top). After a centred scroll, `waitForAnimationToEnd` before tapping. The centring swipe can also overshoot (on iOS it once carried «Simular carga» from y 622 to y 90, under the header): before a tap, prefer scrolling without centring to a line just below the control.
- iOS's number pad has no return key: on iOS the flows drag the screen to put the keyboard away (`keyboardDismissMode="on-drag"`), never `hideKeyboard`. On Android a downward drag on the form sheet moves the sheet and closes it, so there the form flow uses `hideKeyboard` (Back).
- The flows tap `kit-select`: on iOS the field box a `MenuView` opens from, on Android the view around Material's dropdown. Either opens from a tap anywhere on the box.
- A slow `swipe` (2 s) that starts on a text field reads as a long press there and brings up the keyboard. Start swipes on a heading or a card, or centre the next control with `scrollUntilVisible` instead.
- Android's date dialog draws its header and day names in the phone's language: on the English emulator it says «Select date» and the flow matches the day as `.* 20,? .*2026` («Friday, November 20, 2026»).
- On Android, sonner-native's toast is drawn but missing from the accessibility tree (`uiautomator dump` has no «Servicio guardado» while it shows), so Maestro can't see it. The flows assert the toast's text on iOS only (`runFlow` `when: platform: iOS`) and photograph it on both.
- A toast lasts 3.2 s, and on Android `tapOn` can spend 5 s waiting for the screen to settle while the toast animates. Taps that show a toast pass `waitToSettleTimeoutMs: 500`, or the toast is gone before the check.
- On Android, the kit opened by a link before any touch can come up scrolled far down (a button there takes focus and the page scrolls to it). `ui-kit-open.yaml` flings back up to `kit-theme-check` before a flow starts.
- Reduce Motion is read when the app starts: change it before the flow's cold start, not during a run.
- `verify.sh launch` pre-approves `seibi-dev` on the Simulator, but a simulator that was already booted when the approval was written can still ask «Open in "Seibi Dev"?» once; `ui-kit-open.yaml` taps «Open» when it shows.
- The device settings are shared with other sessions: always finish with `verify.sh a11y <platform> reset` and light mode, even after a failed run.
- Never `speed: 100` in `scrollUntilVisible`: Maestro turns speed into a swipe of `1000 × (100 − speed) / 100 + 1` ms, so 100 is a 1 ms swipe that Android sometimes ignores (a run once sat four minutes with the page unmoved). Fling with 90 (101 ms).
- `fit: ok` is a layout check, not a pixel one: each Text compares the lines it drew (`onTextLayout`) with the box it got (`onLayout`). It catches a line drawn outside its box, not a label that wrapped when it didn't need to; the screenshots show that.
- On Android every kit Text ends with a thin hanging space (docs/DESIGN.md → Text that fits), so a Text's `text` attribute in the hierarchy ends in a space. Its `accessibilityText` (the content description) holds the words alone, and Maestro matches either, so flows write the words as they read. A Text with nested Text gets no such label: match it with a pattern that allows the trailing space.
- A `round-*` crop needs an element whose fill differs from what is behind it: a selected chip's count is the chip's own colour, so the flow crops a count after its chip loses the selection. `kit-chip-<id>-count` is a plain wrapper around the badge, not the badge: a testID keeps a view from being flattened, which is the condition of the Android bug, so on the badge it would make the check pass whatever the code. With the count fix reverted the check fails (corners the badge's own `#eceef2`). iOS's hierarchy has no views inside a button, so the crop is Android only.
