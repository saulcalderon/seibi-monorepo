# Perfil

Perfil opens from the avatar at the top right of any tab, inside that tab, and
is the PWA's Perfil without its «Planes» card. A card at the top shows Google's
picture (or the initials on a dark circle), the name and the email. «Tú» has
three rows: «Cómo te llamamos» (the name, or «Sin nombre»), «Nivel de
conocimiento» (the level's title, or «Sin definir») and «Ubicación» («Santa
Ana, El Salvador», or «Sin definir»); each opens its own sheet, and a save
shows on the row at once and in the PWA, which reads the same profile.
«Preferencias» has «Notificaciones de avisos», off and disabled with «Pronto
podrás recibirlas en este teléfono.» until native push arrives, and «Tema»
(«Auto · Claro · Oscuro»). «Legal y ayuda» opens «Términos de uso» and
«Política de privacidad» in the in-app browser and «Escríbenos»
(hola@seibiapp.com) in the mail app. Under them: «Cerrar sesión», «Eliminar
mi cuenta» and «Seibi · <version>».

## Sub-features

- `card` the top card (`id: signed-in-as`), spoken as «<name>, <email>»; the name is the saved name, else the account's name, else the email.
- `name` «Cómo te llamamos» (`id: profile-name-row`) opens «¿Cómo te llamamos?» (`id: profile-name-sheet`): one field «Nombre» (`id: profile-name-field`, 60 characters at most) starting from the saved name, «Guardar» (`id: profile-name-save`) saves and closes. An empty name saves as none («Sin nombre»).
- `level` «Nivel de conocimiento» (`id: profile-level-row`) opens the sheet (`id: profile-level-sheet`) with «Cambia cómo te explicamos las cosas. Tus datos y avisos no cambian.» and the four levels (`id: profile-level-none|basic|intermediate|advanced`), the chosen one tinted with a chevron; a tap saves it and closes.
- `location` «Ubicación» (`id: profile-location-row`) opens the sheet (`id: profile-location-sheet`): «País» (`id: profile-location-country`, El Salvador when none is saved) and «Ciudad» (`id: profile-location-city`, 80 characters at most); «Guardar» (`id: profile-location-save`) saves and closes.
- `guard` closing the name or location sheet with something new typed asks «¿Descartar los cambios?» («Descartar» or «Seguir editando»); a clean sheet closes with no prompt. Each sheet closes with its ✕ (`id: profile-name-close`, `profile-level-close`, `profile-location-close`), a swipe or Back.
- `notifications` «Notificaciones de avisos» (`id: profile-notifications`) is off and disabled until native push (SEI-47).
- `theme` «Tema» (`id: theme-system`, `theme-night`, `theme-light`) recolours the app in place and is kept across a cold start ([`theme.md`](./theme.md)); in Seibi Dev `id: theme-check` reads `theme: <light|night> (<system|preference>)`.
- `legal` «Términos de uso» (`id: profile-terms`) and «Política de privacidad» (`id: profile-privacy`) open seibiapp.com's pages in the in-app browser; «Escríbenos» (`id: profile-contact`) opens a new mail to hola@seibiapp.com, or says «No pudimos abrir tu correo…» when the phone has no mail app.
- `account` «Cerrar sesión» (`id: sign-out`) and «Eliminar mi cuenta» (`id: delete-account`): [`auth.md`](./auth.md).
- `version` `id: profile-version` reads «Seibi · <version>».
- `dev` in Seibi Dev only, «Desarrollo» links to «Revisar datos» (`id: open-data-check`) and the UI kit (`id: open-ui-kit`).

## How to get to it (user POV)

- Sign in, then tap the avatar at the top right of Inicio, Mi flota or Avisos.
- In Perfil, tap «Cómo te llamamos», «Nivel de conocimiento» or «Ubicación»; type or choose, then «Guardar» (a level saves on the tap).
- Tap «Auto», «Claro» or «Oscuro» under «Preferencias».
- Scroll to «Legal y ayuda» and tap «Términos de uso», «Política de privacidad» or «Escríbenos».

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test account set (`test user:` line).
- The device is in light mode with the theme on Auto (the flow sets both, and leaves them so).

- **The screen.** `.agents/skills/verify/scripts/verify.sh drive ios profile` (then `android`). Signs in, opens Perfil (`open-profile.yaml`: `id: signed-in-as` has the test email) and asserts the three «Tú» rows. Screenshot `profile-01-top`.
- **Rename, then restore.** Taps `id: profile-name-row`, copies the field's name, types «Verify Perfil», taps `id: profile-name-close`: «¿Descartar los cambios?» shows (`profile-02-discard`); «Seguir editando» keeps the text. `id: profile-name-save` closes the sheet; the row and `id: signed-in-as` read «Verify Perfil» (`profile-03-renamed`). It reopens the sheet, types the copied name back (or leaves it empty when there was none) and saves; the row no longer says «Verify Perfil».
- **Level and location open.** `id: profile-level-row` shows the four levels (`profile-04-level`) and `profile-level-close` closes it unchanged; `id: profile-location-row` shows «País» and «Ciudad» (`profile-05-location`) and `profile-location-close` closes it with no prompt.
- **Notifications and theme.** Scrolls to `id: theme-check`; `id: profile-notifications` is on screen. Taps `theme-night`: `theme: night (preference)` (`profile-06-night`); taps `theme-system`: `theme: light (system)`.
- **Legal and the account.** Scrolls to `id: profile-version` («Seibi · …»); `id: profile-terms`, `profile-privacy`, `profile-contact` (with hola@seibiapp.com), `sign-out` and `delete-account` are on screen (`profile-07-legal`). Taps `profile-privacy`: the Privacy Policy opens in the in-app browser (`profile-08-privacy`); its close button (iOS) or Back (Android) returns to `id: profile-screen`.
- **Proof.** The run folder holds `startRecording/profile.mp4` and the eight screenshots. The saved row, before the restore and after it: `select p.display_name, p.knowledge_level, p.country, p.city, p.updated_at from public.profiles p join auth.users u on u.id = p.user_id where u.email = 'e2e@seibi.test';` on seibi-dev (read-only). To prove a level or a location save, change it by hand in the sheet, run the query, then put it back.

## Gotchas

- **The flow renames the shared test account for a moment.** A run that stops between the save and the restore leaves «Verify Perfil» as its name; rename it back by hand in Perfil (the original name is in `maestro.log`, from `copyTextFrom`).
- `theme-check` and the «Desarrollo» section exist in Seibi Dev only; Seibi (production and preview builds) has neither.
- Perfil is taller than the screen: «Preferencias» may sit under the tab bar, and «Legal y ayuda», sign-out and deletion are below it. Every flow that taps them scrolls first (`scrollUntilVisible`).
- The iOS Simulator has no Mail app: «Escríbenos» shows the «No pudimos abrir tu correo» toast there. On a phone (or an emulator with a mail app) it opens a new message.
- The in-app browser's close button is the system's and its label follows the iOS version and language (the flow matches «Listo», «OK», «Done», «Cerrar» or «Close»). The pages are seibiapp.com's, so the step needs the network.
- The notifications switch stays off and disabled until SEI-47 ships native push; nothing taps it.
