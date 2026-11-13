# Inicio: the Garage

Signed in, Inicio is the first tab. Its large title is a greeting («Buenos
días», «Buenas tardes», «Buenas noches») with the avatar beside it, which
opens Perfil. Below, the stage: a lit floor with the active Vehicle on it,
its make, its name and «año · pintura» above it. The Vehicle is its poster
(the generated illustration), or its body-type silhouette in its paint until
the poster exists. With more than one Vehicle, the stage pages between them
by swipe and by the arrows, and a pager shows which one is active in its
paint's accent; VoiceOver and TalkBack change it with the pager as an
adjustable control. Under the stage, its Mileage as the screen's big number
with «Actualizar» (which opens the Mileage sheet) and a hint when a new
reading is due; then «Estado», up to four status cards with a summary
(«Todo al día» or «N por atender»), shown once a Service is known. Inicio
remembers the Vehicle you were on. With no Vehicles it shows «Sin Vehículos
todavía» and «Agregar mi Vehículo». In light it uses the Garage palette; in
night, the night palette.

## Sub-features

- `greeting` the large title is the greeting for the time of day; the tab is still «Inicio».
- `avatar` the header avatar opens Perfil (`id: open-profile`, [`app-shell.md`](./app-shell.md)).
- `stage` the active Vehicle's make, name and «año · pintura» (`id: home-stage-vehicle`, spoken «<marca> <modelo>, <año> · <pintura>»); tapping it opens the Vehicle in Inicio's tab.
- `poster` a Vehicle with a ready render shows its poster (`id: home-vehicle-poster`), fed from expo-image's memory and disk cache.
- `silhouette` a Vehicle without a poster shows its body-type silhouette in its paint (`id: home-vehicle-silhouette`).
- `paging` with two or more Vehicles: a horizontal swipe on the stage (`id: home-stage-pages`) pages to the next or previous one; the arrows (`id: home-stage-previous`, `home-stage-next`, «Vehículo anterior», «Vehículo siguiente») step and wrap around.
- `pager-a11y` the pager (`id: home-pager`) is one adjustable control, «Tus Vehículos», whose value is «<Vehículo>, N de M»; swiping up or down with VoiceOver (TalkBack: volume keys or the adjust gesture) changes the Vehicle.
- `remembers` the active Vehicle survives a cold start (the device's `user.active-vehicle.v1`; sign-out clears it).
- `mileage` «Kilometraje» with the current odometer and its measure (`id: home-odometer`, spoken «Kilometraje: 52,000 km»), or «Sin lectura»; «Actualizar» (`id: home-update-mileage`, spoken «Actualizar Kilometraje») opens the Mileage sheet.
- `mileage-hint` when a reading is due, a line under it (`id: home-mileage-hint`): no readings, no usage yet, or «Tu último registro fue hace N días».
- `status` «Estado» (`id: home-status`) with up to four cards (`id: home-status-0` …), overdue first; the summary (`id: home-status-summary`) is «Todo al día» or «N por atender» (red with a dot when one is overdue). No Service known yet: no «Estado».
- `empty` no Vehicles: «Sin Vehículos todavía» (`id: home-empty-title`), the line under it and «Agregar mi Vehículo» (`id: home-add-vehicle`, opens Mi flota).
- `night` in night the stage, cards and text use the night palette.

## How to get to it (user POV)

- Sign in: Inicio is the first screen; or tap «Inicio» in the tab bar.
- On the stage, swipe left or right, or tap the arrows under the Vehicle.
- Seibi Dev only: «Inicio de muestra», `seibi-dev://garage-fixture` (two sample Vehicles) and `seibi-dev://garage-fixture?case=empty` (none), the same screen drawn from sample data, for what the shared test account can't show.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test account set (`test user:` line).
- The test account has at least one Vehicle (the `data-layer` flow creates the Toyota Yaris 2015 on a fresh account). Other sessions may add or withdraw Vehicles on it at any time; the flows assume no name or count.
- Light mode, default text size (`verify.sh a11y <platform> reset`), «Tema» on Auto.

- **The real Inicio.** `.claude/skills/verify/scripts/verify.sh drive ios home` (then `android`). It signs in before `startRecording`, reads the account's Vehicles (`scripts/garage-vehicles.js`, read-only), cold-starts signed in, and asserts a greeting, `id: open-profile`, `id: home-stage-vehicle` naming one of those Vehicles, `id: home-odometer` («Kilometraje: …») and `id: home-update-mileage`. Screenshots `home-01-garage`, `home-02-below` (what sits under the odometer). «Actualizar» → `id: update-mileage-sheet` (`home-03-update-mileage`), closed with `update-mileage-sheet-close`. Tapping the Vehicle → `id: vehicle-name` with `tab-home` still visible (`home-04-vehicle`), then back.
- **Paging, remembering, silhouette, Estado, empty.** `drive ios home-fixture` (then `android`). Opens «Inicio de muestra» (subflow `home-fixture-open.yaml`), puts the Yaris first, asserts its poster and the pager (`fixture-01-yaris-poster`); swipes left on `home-stage-pages` → «Mazda 3, 2019 · Rojo» with `home-vehicle-silhouette` and the stale-reading hint (`fixture-02-swiped-silhouette`); cold-starts and reopens: still the Mazda (`fixture-03-remembered`); `home-stage-next` wraps to the Yaris, a right swipe and `home-stage-previous` step back (`fixture-04-arrows`); scrolls to `home-status-summary` and `home-status-0` (`fixture-05-status`); opens `?case=empty`: «Sin Vehículos todavía», its line and `home-add-vehicle` (`fixture-06-empty`).
- **Night.** `drive ios home-night` (then `android`): dark mode on, the real Inicio (`night-01-home`), the sample's poster, silhouette and cards (`night-02-poster`, `night-03-silhouette`, `night-04-status`); dark mode off at the end.
- **Look at the screenshots.** Maestro reads labels, not pixels: open the PNGs on both platforms and check the stage's floor and vignette, the poster's feathered edges, the silhouette's reflection, the pager's accent dot, that no text is cut, and the cards' corners.
- **Proof.** Each run folder holds the video (`startRecording/<flow>.mp4`) and the screenshots. Inicio saves nothing to seibi-dev; the read-only query for the PR is what it shows: `select v.brand, v.model, v.year, v.color, r.status, r.poster_path, (select reading from mileage_readings m where m.vehicle_id = v.id order by recorded_on desc, reading desc limit 1) from vehicles v left join model_renders r on r.id = v.render_id join auth.users u on u.id = v.user_id where u.email = 'e2e@seibi.test' and v.deleted_at is null` on seibi-dev.

## Gotchas

- The shared test account changes under you: another session's Vehicle (plates starting `S5-`) can appear on the stage or disappear mid-run. `home.yaml` matches any of the Vehicles `garage-vehicles.js` read at the start; rerun if one was withdrawn in between.
- The fixture saves its sample ids (`fixture-yaris`, `fixture-mazda`) as the active Vehicle; the real Inicio then falls back to the first Vehicle, as it does for any id it doesn't have.
- With the pager as an adjustable control, its dots are one element: Maestro can't tap a single dot. Swipe the stage or tap the arrows.
- iOS hides the page's texts behind its button (`home-stage-vehicle` carries their words); Android lists them too (`home-vehicle-brand`, `home-vehicle-model`, `home-vehicle-details`). Assert on `home-stage-vehicle`.
- The poster loads from seibi-dev's public `vehicle-renders` bucket the first time, then from expo-image's disk cache; on a cold cache `home-vehicle-poster` can take a few seconds.
- The poster's edges fade through an SVG mask; on the screenshots its box must never show as a rectangle (a flat edge or a lighter square around the car). Painting the edges over with a colour was tried first and showed one on iOS.
- Maestro's `swipe` with `from: id` and a direction didn't page the stage on iOS; the flow flicks across it by coordinates (35 % of the screen's height). If the stage moves (a taller header, another device), fix those coordinates.
