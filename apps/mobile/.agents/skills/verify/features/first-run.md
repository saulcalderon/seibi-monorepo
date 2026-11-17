# The first-run questions

A signed-in account that hasn't finished its first run (no
`onboarded_at`) opens the first-run questions instead of Inicio, on the
light Garage palette, one screen per step with the system's back between
them. «Tú»: «¡Bienvenido a Seibi!» and «¿Cómo te llamamos?» («Continuar»
waits for a name). «Conocimiento»: «¿Cuánto sabes de carros?» (four
levels), three check questions (the third with the coolant light), then
the calibrated level («Tu nivel», «Prefiero otro nivel»). «Ubicación»:
country (El Salvador or Estados Unidos) and a city of two letters or more.
«Tu Vehículo»: «Agrega tu Vehículo» with the Vehicle form, or «Lo agrego
después». With a Vehicle only: «¿Cómo usas tu Vehículo?» (three patterns
and the round-trip distance, or «Prefiero no decirlo») and «Tu último
mantenimiento» (oil, tire rotation, battery; «Calcular mis avisos» once
one is answered). «Avisos»: «¿Te avisamos a tiempo?» with «Activar avisos»
or «Ahora no»; neither asks the system for permission yet (native push is
SEI-47), and neither blocks. Then «Se guardó tu información» for 2 s and
Inicio. A cold start after that opens Inicio.

## Sub-features

- `gate` the first screen after sign-in or the splash: `id:
  first-run-name-field` with no `onboarded_at`, `id: home-screen` with one.
- `name` `id: first-run-name-field`, «Continuar» `id:
  first-run-name-continue` (disabled while blank).
- `level` the four options `id: first-run-level-none|basic|intermediate|advanced`.
- `check` the options `id: first-run-check-<0|1|2>-<option>` (e.g.
  `first-run-check-2-overheating`); the last one saves the Knowledge level.
- `result` `id: first-run-result-level` («Tu nivel: …»), «Prefiero otro
  nivel» `id: first-run-result-other` opening `first-run-result-level-<level>`,
  «Continuar» `id: first-run-result-continue`.
- `location` the country select `id: first-run-location-country`, the
  city `id: first-run-location-city`, «Continuar» `id:
  first-run-location-continue` (disabled under two letters).
- `vehicle` the Vehicle form's fields as `id: first-run-vehicle-form-<field>`
  (`-brand`, `-year`, `-model`, `-plate`, `-odometer`, `-measure-km`),
  «Agregar y continuar» `id: first-run-vehicle-form-save`, «Lo agrego
  después» `id: first-run-vehicle-later`; the pickers are Mi flota's
  (`pick-option-<value>`, `pick-custom`). Back on this step after adding:
  «Vehículo agregado» `id: first-run-vehicle-added`.
- `usage` `id: first-run-usage-daily|some|weekend`, the distance `id:
  first-run-usage-distance` («Escribe la distancia aproximada.» when
  missing), «Continuar» `id: first-run-usage-continue`, «Prefiero no
  decirlo» `id: first-run-usage-skip`.
- `history` the chips `id: first-run-history-<engine_oil|tire_rotation|battery>-<under3|3to6|6to12|over12|unknown>`,
  the button `id: first-run-history-continue`.
- `notifications` «Activar avisos» `id: first-run-notifications-enable`,
  «Ahora no» `id: first-run-notifications-later`.
- `done` «Se guardó tu información» `id: first-run-done-title`; on a
  failed save its error and «Reintentar» (`id: first-run-done-retry`).

## How to get to it (user POV)

- Sign in with an account that has never finished the first run (a new
  account, or one the PWA never took through it).
- Open the app signed in before finishing it: the splash gives way to the
  questions, not Inicio.
- No link opens it, and nothing in the app leads back to it once
  finished.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test
  account set (`test user:` line).
- Light mode, default text size.
- No leftover «S3-» Vehicle: `drive ios fleet-cleanup` withdraws any.
- Both flows reset the account's first run themselves
  (`flows/scripts/reset-first-run.js`, a PATCH under the account's own RLS
  that empties `display_name`, `knowledge_level`, `country`, `city` and
  `onboarded_at`); nothing else on the account changes.

- **Every question, with a Vehicle.** `drive ios first-run` (then
  `android`). It resets the first run, signs in by hand (not
  `sign-in.yaml`, which would answer the questions itself) and records:
  the disabled «Continuar» and the name «E2E» (`first-run-01-name`), the
  levels (`-02-level`), «Tengo experiencia» and three right answers, the
  coolant light (`-03-coolant`), «Hablas el idioma del taller» with
  «Prefiero otro nivel» open (`-04-result`), «Santa Ana» after «S» kept
  «Continuar» off (`-05-location`), the Vehicle step with «Lo agrego
  después» (`-06-vehicle`), a Toyota Corolla 2018, Plate S3-RUN-01,
  30,000 km, «Agregar y continuar»; «Todos los días» with the missing
  distance's error, then 24 km (`-07-usage`); oil «3–6 meses» and battery
  «No sé» turning the button into «Calcular mis avisos» (`-08-history`);
  avisos (`-09-notifications`), «Ahora no», «Se guardó tu información»
  (`-10-done`), Inicio (`-11-home`), Inicio again after a cold start
  (`-12-relaunch`), and the S3 Vehicle withdrawn through Mi flota
  (`-13-cleaned`).
- **Skip the Vehicle and avisos.** `drive ios first-run-skip`: «Lo agrego
  después» goes straight to avisos (no Routine or history step), «Ahora
  no» still ends on Inicio (`first-run-skip-home`).
- **Every other flow.** `sign-in.yaml` answers the questions the short
  way (`first-run-finish.yaml`) when an account lands on them, so the
  test account works after a reset or a recreation.
- **Proof.** After `first-run`, a read-only query on seibi-dev shows what
  the questions saved:

  ```sql
  select p.display_name, p.knowledge_level, p.country, p.city, p.onboarded_at,
         v.brand, v.model, v.plate, v.deleted_at,
         r.name as routine, r.round_trip_distance, r.days_per_week,
         (select json_agg(json_build_object('task', s.task_code, 'on', s.remembered_on, 'unknown', s.last_unknown) order by s.task_code)
            from reminder_states s where s.vehicle_id = v.id) as history
  from profiles p
  join auth.users u on u.id = p.user_id
  left join vehicles v on v.user_id = p.user_id and v.plate = 'S3-RUN-01'
  left join routines r on r.vehicle_id = v.id
  where u.email = 'e2e@seibi.test'
  order by v.created_at desc nulls last
  limit 1;
  ```

  Expected: `E2E`, `intermediate`, `SV`, `Santa Ana`, a fresh
  `onboarded_at`; Toyota Corolla `S3-RUN-01` withdrawn by the cleanup;
  routine «Trabajo o estudio», 24, 5 days; history `engine_oil` and
  `oil_filter` about 4 months back, `battery` unknown.

## Gotchas

- The test account's first run is shared state: a reset (these flows) or
  a recreation (`delete-account`) sends it through the questions on its
  next sign-in. `sign-in.yaml` handles it; a flow that signs in by other
  means must too.
- «Sin Vehículos todavía» after «Lo agrego después» can't be shown on the
  shared account, which keeps its Toyota Yaris; Inicio's sample screen
  (`home-fixture`, `?case=empty`) shows the empty state.
- «Activar avisos» asks no system permission until SEI-47 adds native push:
  it only keeps the answer on the phone. Don't report a permission prompt
  as proven.
- vPIC can be down: the model step takes «Usar "Corolla"» when the list
  fails, as in `fleet`.
- Each step is its own screen in a stack; covered steps stay mounted, so
  target the step's own ids (`first-run-<step>-…`), never shared text like
  «Continuar» alone.
