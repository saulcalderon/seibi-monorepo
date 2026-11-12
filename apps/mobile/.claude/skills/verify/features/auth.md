# Sign-in, session and sign-out

Without a session, Seibi opens only the sign-in screen: «Seibi», «Inicia
sesión para continuar», the native Sign in with Apple button (iOS), Google's
button (once the build has its OAuth client ids), and, in development and
preview builds only, an email + password form for the seibi-dev test
account. After signing in the person lands on the home (today the start
screen, with their email), and the session survives killing and reopening
the app. «Cerrar sesión» returns to sign-in and leaves nothing of the person
on the device. «Eliminar cuenta» asks first, deletes the account and
everything in it, and shows «Cuenta eliminada»; the same screen shows on the
next launch when the account was deleted somewhere else.

## Sub-features

- `gate-signed-out` without a session no `(app)` route opens, not even from a deep link (`seibi-dev://`).
- `gate-signed-in` with a session the sign-in screen does not open (`seibi-dev://sign-in`).
- `test-sign-in` email + password with the seibi-dev test account, in development and preview builds only.
- `session-restore` the session survives a kill and relaunch (read back from the encrypted store).
- `sign-out` «Cerrar sesión» returns to sign-in; a relaunch stays signed out.
- `delete-account` «Eliminar cuenta» → native alert → `delete-account` Edge Function → «Cuenta eliminada» → «Entendido» → sign-in.
- `deleted-elsewhere` a session whose account was deleted elsewhere shows «Cuenta eliminada» on the next launch.
- `apple` Sign in with Apple (iOS). Needs Apple enabled in Supabase and, on the Simulator, an Apple ID.
- `google` Google's account picker. Hidden until the build has `EXPO_PUBLIC_GOOGLE_*` client ids.

## How to get to it (user POV)

- Open the app signed out: the sign-in screen is the first screen after the splash.
- Tap a sign-in button; in a development or preview build, type the test account in the form and tap «Entrar con correo».
- Signed in, the home shows «Cerrar sesión» and «Eliminar cuenta» (until Perfil exists).
- A deep link to any route (`seibi-dev://`, `seibi-dev://sign-in`) opens only what the session allows.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, and `doctor` shows `supabase: https://blirxlxmmrhafomkykmr.supabase.co (seibi-dev)` and `test user: e2e@seibi.test (password set)`.
- Seibi Dev is installed from the branch under test, built after this feature landed (it adds native modules: `launch <platform> --rebuild` on an older build).
- The test account exists on seibi-dev (see Gotchas after a destructive flow).

- **Signed out, (app) closed.** Run `.claude/skills/verify/scripts/verify.sh drive ios auth` (then `android`). From a cold start the flow signs out first if a session is left over, then opens `${APP_URL}` (`seibi-dev://`): `id: sign-in-title` stays and `id: start-title` is not visible. Screenshot `signed-out`.
- **Test sign-in.** `runFlow: sign-in.yaml` taps `id: test-sign-in-email` and types `TEST_EMAIL`, presses Return (focus moves to `id: test-sign-in-password`), types `TEST_PASSWORD` and presses Return to submit (the keyboard covers `id: test-sign-in-submit`), declines iOS's offer to save the password, then waits for `id: start-title` and asserts `id: signed-in-as` reads the test email. Screenshot `signed-in`.
- **Session survives a relaunch.** `stopApp`, then `openLink: ${DEV_URL}` (a cold start): the home shows again with `id: signed-in-as`, with no sign-in in between. Screenshot `session-restored`. `${APP_URL}sign-in` keeps the home.
- **Sign-out.** Tap `id: sign-out`: `id: sign-in-title` shows, `id: start-title` is gone, `${APP_URL}` stays on sign-in, and a cold relaunch opens sign-in. Screenshots `signed-out-again`, `relaunch-signed-out`.
- **Delete account (destructive).** `drive <platform> delete-account`: tap `id: delete-account`, the native alert «¿Eliminar tu cuenta?», tap «Eliminar»: `id: account-deleted-title` («Cuenta eliminada»), then `id: account-deleted-continue` («Entendido») opens sign-in, and a relaunch stays there. Screenshots `delete-confirm`, `account-deleted`, `relaunch-after-delete`.
- **Deleted elsewhere (destructive).** `drive <platform> account-deleted-elsewhere`: signs in, stops the app, deletes the account with its own session through `delete-account` (`flows/scripts/delete-test-account.js`, seibi-dev only), cold-starts: «Cuenta eliminada» shows. Screenshot `account-deleted`.
- **Saved data.** After `auth`, a read-only seibi-dev query shows the sign-in: `select id, email, last_sign_in_at from auth.users where email = 'e2e@seibi.test'`. After a destructive flow the same query returns no row, and `select count(*) from public.profiles where user_id = '<the old id>'` returns 0.
- **Encrypted at rest (iOS).** With the test account signed in: `sqlite3 "$(xcrun simctl get_app_container <udid> com.seibiapp.app.dev data)/Documents/SQLite/ExpoSQLiteStorage" "select key, substr(value, 1, 24) from storage"` shows `auth.session.sb-…-auth-token` with a `v1:` base64 value, and `grep -c refresh_token` on the file is 0. The HTTP cache holds none either: `Library/Caches/com.seibiapp.app.dev/` has no `Cache.db` with a `supabase.co` entry (`grep -a -c refresh_token` on any `Cache.db*` there is 0). On Android, `adb shell run-as com.seibiapp.app.dev grep -r -c refresh_token cache files` finds nothing outside the dev bundle.

## Gotchas

- The test account is `e2e@seibi.test` on seibi-dev; its password is never in git. `verify.sh` reads `SEIBI_TEST_EMAIL` / `SEIBI_TEST_PASSWORD` from the environment, else from `~/.config/seibi/test-account.env` (`SEIBI_TEST_ACCOUNT_FILE`), and scrubs the password from the run's logs. Do not use `prueba@seibi.test`: that is the «Ana» screenshot account.
- The two destructive flows delete the test account. Recreate it on **seibi-dev only** before the next flow signs in, with the same email and password: the Supabase MCP `execute_sql` insert into `auth.users` and `auth.identities` used in SEI-44 (email provider, `email_confirmed_at = now()`, `encrypted_password` = the output of `htpasswd -bnBC 10 "" "$SEIBI_TEST_PASSWORD" | tr -d ':\n' | sed 's/^\$2y/$2a/'`, empty strings in the token columns). Never through the PWA's signup: seibi-dev sends a confirmation email.
- A flow that waits on `id: start-title` from a cold start now passes through sign-in first; use `runFlow: sign-in.yaml`.
- The email form only exists when Metro serves `EXPO_PUBLIC_TEST_SIGN_IN=1` (verify.sh and the pnpm scripts set it). A Metro started another way shows no form, and the flow times out on `id: test-sign-in-email`.
- Apple and Google cannot be driven here yet: Apple is disabled on seibi-dev and needs an Apple ID on the Simulator; Google needs Saul's OAuth client ids. Both are proven on a physical phone.
- Token expiry in the background (an hour) is not covered by these flows; prove it on a physical phone.
- Videos of a sign-in show the password field as dots, but iOS and Android flash each typed character for a moment. Treat sign-in recordings as holding the test password: share them where the test account may be known, and rotate the password (new hash, same insert) if one leaves that circle. A failed run can type the password into the email field in plain text; delete that run's screenshots and video.
- An Android `AlertDialog` may draw its buttons in capitals; the delete flow matches `Eliminar|ELIMINAR`.
