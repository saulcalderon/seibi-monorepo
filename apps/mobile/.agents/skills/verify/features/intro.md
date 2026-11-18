# The Intro

On a phone's first launch, signed out, the splash gives way to the Intro
instead of Login: what Seibi does in three still slides on the light Garage
palette (in night too). The lockup and «Saltar» at the top; each slide a
picture, an eyebrow, a title and a line; «Siguiente» and the dots at the
bottom. «Qué es Seibi» · «Tu Vehículo, siempre en orden» (the white 370Z);
«El problema» · «Se acabó el “¿cuándo fue el último cambio?”» (three cards:
«Último cambio», «Factura del taller», «Precio»); «Cómo te ayuda» · «Avisos
según tu modelo y tu uso» (the 370Z's «Estado», four tasks). A swipe, the
button or a dot moves between slides; the last one says «Empezar» and has no
«Saltar». «Saltar» or «Empezar» opens Login, and the Intro never shows on
that phone again: not after a relaunch, not after a sign-out. A phone that
opens signed in never shows it either.

## Sub-features

- `gate` signed out on a first launch: `id: intro-title` instead of `id: sign-in-title`.
- `slides` the current slide's eyebrow `id: intro-eyebrow`, title `id: intro-title`, line `id: intro-body`; the pages `id: intro-pages`.
- `next` «Siguiente» / «Empezar» `id: intro-next`.
- `swipe` a horizontal swipe moves one slide; the dots `id: intro-dots` follow.
- `skip` «Saltar» `id: intro-skip` on the first two slides; Login follows.
- `once` after «Saltar» or «Empezar», a cold start opens Login (`id: sign-in-title`), never the Intro.
- `a11y` VoiceOver and TalkBack: the eyebrow says «…, diapositiva N de 3»; the dots are one adjustable control («Diapositivas», «N de 3», swipe up or down); a change of slide is announced; the pictures are skipped.

## How to get to it (user POV)

- Install the app (or clear its data) and open it: the Intro is the first screen after the splash.
- Nothing in the app leads back to it once skipped or finished, and no link opens it.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`.
- Light mode, default text size.

- **First launch.** Run `.agents/skills/verify/scripts/verify.sh drive ios intro` (then `android`). The flow runs `stopApp` and `clearState` (a fresh install's state), then `openLink: ${DEV_URL}`, and waits up to 120 s for `id: intro-title`: «Tu Vehículo, siempre en orden», eyebrow «Qué es Seibi», `id: intro-skip` and «Siguiente» visible, no `id: sign-in-title`. Screenshot `intro-1-what`.
- **Siguiente.** `tapOn: id: intro-next` → the title starts «Se acabó el», eyebrow «El problema». Screenshot `intro-2-problem`.
- **Swipe.** `swipe: direction: LEFT` → «Avisos según tu modelo y tu uso», `id: intro-next` reads «Empezar», `id: intro-skip` is gone. Screenshot `intro-3-help`. `swipe: direction: RIGHT` → «El problema» and «Siguiente» again.
- **Saltar.** `tapOn: id: intro-skip` → `id: sign-in-title` within 15 s. Screenshot `intro-skipped-login`.
- **Never again.** `stopApp`, `openLink: ${DEV_URL}` → `id: sign-in-title`, no `id: intro-skip`. Screenshot `intro-relaunch-login`.
- **Proof.** The run folder holds `startRecording/intro.mp4` and the five screenshots. The Intro saves nothing to seibi-dev: its «done» mark lives on the phone (`intro-done.v1`), so there is no `SELECT` to run.
- **VoiceOver / TalkBack** (by hand, once per milestone): the eyebrow reads «Qué es Seibi, diapositiva 1 de 3»; «Siguiente» announces the next slide; the dots adjust up and down; «Saltar» opens Login.

## Gotchas

- `clearState` signs the test account out on this device and resets «Tema»: the next flow that needs a session signs in again (`sign-in.yaml`).
- Every flow that cold-starts the app runs `skip-intro.yaml` first, so a fresh install (a new simulator, `launch --rebuild` after an uninstall) doesn't stop on the Intro. Only the first flow of such a run sees it.
- The pictures are hidden from VoiceOver and TalkBack, so Maestro can't see their parts: check them on the screenshots.
- The Intro's mark is the phone's, not the person's: sign-out keeps it. Only clearing the app's data (or reinstalling) shows the Intro again.
