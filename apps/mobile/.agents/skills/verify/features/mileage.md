# Actualizar Kilometraje

The Mileage sheet records today's odometer, exactly the PWA's SmallForms
MileageForm. It opens as a form sheet from the [+] actions sheet («Actualizar
Kilometraje») and from Inicio's «Actualizar» — the second already on the
Vehicle Inicio is showing. It reads «Actualizar kilometraje» with a context
line under it («Yaris 2015 · último: 52,000 km · hace 4 días», «… · sin
registros todavía» when the Vehicle has none), the Vehicle picker when the
account has two or more, and one big field in the Vehicle's measure whose
placeholder is the current odometer. Three chips («+100», «+500», «+1,000»)
fill the field from what was typed or the current odometer, and
«Recalculamos tus próximos mantenimientos con este dato.» sits under them.
«Guardar» becomes «Guardar 52,100 km» once a number is in, saves a reading
dated today — it must be strictly above the current odometer, else «Debe ser
mayor que el último registro (52,000 km).» — toasts «Kilometraje
actualizado» and closes. Closing with a number typed asks «¿Descartar los
cambios?» first.

## Sub-features

- `sheet` the form sheet (`id: mileage-sheet`), titled «Actualizar kilometraje», with `mileage-close` on the right.
- `context` the Vehicle's line (`id: mileage-context`): name and year, «último: <odómetro> <medida>» and how long ago; no date part when the reading has none.
- `vehicle` the picker (`id: mileage-vehicle`), only with two or more Vehicles, as in the Service form.
- `reading` the big field (`id: mileage-reading`, spoken «Kilometraje de hoy»): digits only, thousands grouped as typed, leading zeros dropped, at most 7 digits, the current odometer as placeholder, the Vehicle's `km`/`mi` inside.
- `bumps` «+100», «+500», «+1,000» (`id: mileage-bump-100`, `mileage-bump-500`, `mileage-bump-1000`): each sets typed ?? odometer ?? 0 plus its number.
- `save` `id: mileage-save`, disabled while empty, «Guardar <número> <medida>» once a number is in, the loading state while saving.
- `error` a number at or under the current odometer is refused (`id: mileage-error`): «Debe ser mayor que el último registro (<actual>).» A malformed number is `number_invalid`; an empty submit can't happen (the button is disabled).
- `guard` leaving with a number typed asks «¿Descartar los cambios?»; a clean sheet closes with no prompt.
- `saved` writes a `mileage_readings` row dated today (`useAddReading` → `standaloneReading`), toasts «Kilometraje actualizado» and closes; Inicio's odometer and every derived state move to it.

## How to get to it (user POV)

- Inicio → «Actualizar» under the Vehicle's Kilometraje: the sheet opens on that Vehicle.
- Any tab → the floating [+] → «Actualizar Kilometraje»: the sheet opens on the active Vehicle.
- Pick another Vehicle (with two or more), type the odometer or tap a chip, then «Guardar».
- Swipe the sheet down, Back or «Cerrar» to leave; with a number typed it asks to discard first.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test account set (`test user:` line).
- The test account has at least one Vehicle; the flow asserts on whichever is active.

- `.agents/skills/verify/scripts/verify.sh drive ios mileage` (then `android`). Signs in, reads the current odometer from `home-odometer`, opens the sheet from [+] → `action-update-mileage` (on Android it asserts the title and save with the number pad open, SEI-76) and closes it clean (`mileage-01-sheet`), reopens it from `home-update-mileage`, asserts the context's «último», tries `1` → the «mayor que el último registro» error (`mileage-02-refused`), taps `mileage-bump-100` → «Guardar <actual+100> km» (`mileage-03-bumped`), saves, asserts the toast and Inicio's new odometer (`mileage-04-saved`).
- **Proof.** Each run folder holds the video (`startRecording/mileage.mp4`) and the screenshots; the row it wrote shows in `select v.brand, v.model, m.reading, m.recorded_on from public.mileage_readings m join public.vehicles v on v.id = m.vehicle_id join auth.users u on u.id = v.user_id where u.email = 'e2e@seibi.test' order by m.created_at desc limit 5;` on seibi-dev.

## Gotchas

- **Every run raises the odometer by 100.** A standalone reading is dated today and readings are corrected, never deleted: `mileage.yaml` hardcodes nothing and reads the current number from `home-odometer` first, so reruns and other sessions' readings are fine — but the shared Yaris's Mileage climbs with each run.
- Two runs on the same day both count toward the current odometer; the error line shows whatever was last, so the flow formats the number it read.
- The Vehicle picker doesn't render with one Vehicle (the shared account's usual state), so `mileage-vehicle` is not asserted in the flow.
