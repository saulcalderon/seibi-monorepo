# Avisos

The Avisos tab shows the Reminders of the Vehicle Inicio shows: its name,
year and Plate or Mileage, and «N por atender», «Sin datos» or «Al día».
A line over it names another Vehicle with something pending and unfolds to
switch to any other. The «Recibe los avisos en tu teléfono» card has
«Activar» disabled with «Pronto podrás recibirlas en este teléfono.» until
native push. The first card holds the overdue Reminders, the upcoming
Appointments with «Hecho», the open hand-written Reminders with «Hecho», and «N tareas
sin fecha», which unfolds «Completa tu historial»; with nothing due it says
«Nada pendiente». «Por vencer», «Al día» and «Pospuestos» fold under it
with their counts. A Reminder opens its detail as a sheet: its status in
words, the interval used, «Frecuencia», «Última vez», «Toca a los»,
«Fuente» and its links, «Ya lo hice: registrar Servicio», «Decir cuándo fue
la última vez» for an unknown task, «Agendar» (an Appointment for it) and «¿Cuánto cuesta?» side by side, «Posponer 7 días» / «Posponer 30 días»
for a due one, and «Reactivar aviso» for a snoozed one. «Completa tu
historial»'s chips open «¿Cuándo fue “…”?» (rough ranges, the exact day and
Mileage, «No sé», or the full Service). «Nuevo» opens «Nuevo Recordatorio»
(Vehicle, what to remember, day, notes).

## Sub-features

- `screen` `id: reminders-screen`; the Vehicle's name `id:
  avisos-vehicle-name` and status `id: avisos-badge`; loading `id:
  avisos-loading`, error `id: avisos-error`, no Vehicle `id: avisos-empty`
  («Aún no hay avisos», `id: avisos-add-vehicle`).
- `others` `id: avisos-others` (only when another Vehicle has something
  pending): `id: avisos-others-toggle` unfolds `id: avisos-other-<n>`; a
  tap switches Avisos (and Inicio) to that Vehicle.
- `push` `id: avisos-push` with `id: avisos-push-enable` disabled and `id:
  avisos-push-unavailable`; hidden when the profile has notifications off.
- `main` `id: avisos-main`: overdue rows `id: avisos-overdue-<n>`,
  appointments `id: avisos-appointment-<n>` with «Hecho» `-done`
  ([appointments.md](./appointments.md)), hand-written Reminders `id:
  avisos-manual-<n>` with «Hecho» `id: avisos-manual-<n>-done` (spoken
  «Hecho: <title>», toast «Hecho»), «Nada pendiente» `id: avisos-nothing`,
  `id: avisos-unknown-toggle` → `id: avisos-history`.
- `groups` `id: avisos-group-soon` (always), `-ok`, `-snoozed` (when not
  empty), each folded by `id: avisos-group-<g>-toggle` (spoken «<name>,
  <count>»), rows `id: avisos-<g>-<n>` (`soon`, `ok`, `snoozed`).
- `detail` the sheet `id: reminder-detail`: `-title` (the task), `-status`
  (badge with its word), `-due`, `-facts` with `-frequency`, `-last`,
  `-due-at`, `-source` and links `-link-<n>`; `-record` (replaces it with
  «Registrar Servicio» for the task), `-ask-last` (unknown only),
  `-schedule` («Agendar»: replaces it with «Agendar Cita» for the task),
  `-estimate` («¿Cuánto cuesta?»: closes it and opens Estimados, which asks
  for that task's Estimate; [`estimates.md`](./estimates.md)),
  `-snooze-7` / `-snooze-30` (overdue or soon; toast «Pospuesto N días»),
  `-restore` (snoozed; toast «Aviso reactivado»), `-close`. A stale link
  shows `id: reminder-detail-gone` («Este aviso ya no aplica.»).
- `history` «Completa tu historial» (`id: avisos-history`, `id:
  detail-history` in the Vehicle detail, `id: home-history` on Inicio):
  chips `id: <card>-task-<taskCode>`, the best-known tasks first; `id:
  <card>-more` shows the rest.
- `last-done` the sheet `id: last-done-sheet`: `id: last-done-title`, the
  ranges `id: last-done-underMonth|oneToThree|threeToSix|sixToTwelve|overYear`,
  `id: last-done-exact` unfolds `id: last-done-date`, `id:
  last-done-reading` and `id: last-done-save-date`; `id: last-done-invoice`
  and `id: last-done-dont-know`. Toasts «Listo, ya calculamos el próximo» and
  «Anotado. Te recomendamos revisarlo pronto.».
- `new` the sheet `id: new-reminder-sheet`: `id: new-reminder-title`,
  `id: new-reminder-vehicle` (two or more Vehicles), `id:
  new-reminder-what`, `id: new-reminder-date` (today to start), `id:
  new-reminder-notes`, `id: new-reminder-save`. Empty, it answers
  «Escribe qué quieres recordar.»; saved, toast «Recordatorio guardado».
  Closing with text typed asks «¿Descartar los cambios?».
- `delete` in the Vehicle detail only (as the PWA): the bin `id:
  detail-manual-reminder-<n>-delete` asks «¿Eliminar «<title>»?», then
  toast «Recordatorio eliminado».

## How to get to it (user POV)

- The Avisos tab (`id: tab-reminders`).
- A Reminder's detail: any row in Avisos, the Vehicle detail's
  Mantenimiento, or a card in Inicio's «Estado».
- «¿Cuándo fue…?»: a chip in «Completa tu historial» (Avisos, the Vehicle
  detail, Inicio) or the detail's «Decir cuándo fue la última vez».
- «Nuevo Recordatorio»: Avisos' «Nuevo» (`id: avisos-add`) or the Vehicle
  detail's «Recordatorio» (`id: detail-add-reminder`).

## Driving it with verify.sh

Preconditions: the baseline, and the test account's first Vehicle on
seibi-dev (the Toyota Yaris) with «Cambio de aceite» among its unknown
tasks. `reminders` runs `scripts/cleanup-sei64.js` first (before the
recording) and again at the end: it deletes Reminders titled «verify
SEI-64 …», clears any snooze on the account and deletes the flow's
`engine_oil` answer. `reminders-cleanup` runs the same alone.

- **Avisos and a detail.** `scripts/verify.sh drive ios reminders` (then
  `android`): Avisos with its badge, «Por vencer» and the push card's stub
  line (`reminders-01-avisos`); the first overdue row, else the first «Por
  vencer» one, opens its detail with status and source (`reminders-02-detail`).
- **Snooze and restore.** «Posponer 7 días» closes the sheet and the row
  shows in «Pospuestos» as «Pospuesto» (`reminders-03-snoozed`); its
  «Reactivar aviso» empties «Pospuestos» (`reminders-04-restored`).
- **Hand-written: create and complete.** «Nuevo» → saving empty answers
  «Escribe qué quieres recordar.»; «verify SEI-64 hecho» saved shows in the
  first card (`reminders-06-manual-saved`); «Hecho» removes it
  (`reminders-07-manual-done`).
- **Hand-written: create and delete.** Mi flota → the first Vehicle →
  «Recordatorio» → «verify SEI-64 borrar» shows in «Citas y recordatorios»
  (`reminders-08-detail-manual`); the bin asks
  (`reminders-09-delete-confirm`) and «Eliminar» removes it
  (`reminders-10-deleted`).
- **Saved data.** After the run, a read-only seibi-dev `SELECT` on
  `reminders` shows «verify SEI-64 hecho» with `done_at` set and «verify
  SEI-64 borrar» with `deleted_at` set, and on `reminder_states` the
  snoozed task back to `snoozed_until` null.

## Gotchas

- Inicio, Avisos and the Vehicle detail each draw «Completa tu historial»
  and stay mounted in their tabs, so every id in it carries its card's id
  (`avisos-history-task-engine_oil`); a bare id would match Inicio's copy
  under the tab bar.
- The test Yaris has no Service with a task, so all its Reminders start
  unknown: the flow answers «Cambio de aceite» «Hace más de un año» to make
  one overdue, and the cleanup deletes that answer before and after.
- The flow taps rows by position and checks the snoozed one by the task's
  name it read from `id: reminder-detail-title`; a leftover snooze would
  shift «Pospuestos», which is why the cleanup clears every snooze on the
  dedicated test account first.
- The snooze buttons exist only for an overdue or «Por vencer» Reminder:
  the flow needs one on the test Yaris. If both are gone (every Service
  recorded), record an old Service or pick another Vehicle first.
- «Hecho» and the bin are matched by their spoken labels («Hecho:
  <title>», «Eliminar recordatorio: <title>»), so the flow never taps
  another Reminder's button.
- The confirm alert differs by platform: on iOS the flow taps «Eliminar»;
  on Android the alert is its own window and the flow taps
  `android:id/button1`.
- «Nuevo Recordatorio» keeps its title, field and «Guardar» above the
  open keyboard (SEI-76): the flow asserts them with the keyboard up
  (`reminders-05-new-keyboard`).
- Toasts announce for accessibility only; assert the closed sheet and the
  changed list instead.
