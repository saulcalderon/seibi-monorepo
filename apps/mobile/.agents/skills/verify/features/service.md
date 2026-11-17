# Registrar un Servicio

Recording a Service happens in a form sheet that opens over whatever
screen it came from, titled «Registrar Servicio». It shows the Vehicle it
applies to (a picker when the sheet wasn't opened for one), the date, a
type («Mantenimiento» or «Reparación»), the Maintenance tasks it covers as
chips, the lines of work and parts («trabajos y piezas») with a cost per
line or one total, the odometer reading it was done at, the shop and free
notes. «Guardar» validates in the PWA's order: the reading first
(«Escribe el kilometraje de ese día.»), then the cost texts, then at
least one task or named line («Agrega al menos un trabajo o pieza.»);
each missing field is named and the sheet stays open. Saving writes the
Mileage reading first and then the Service, so Inicio's «Estado»,
Avisos and the Vehicle's «Servicios» list move at once. Opening the same
sheet for a Service (`?serviceId=`) edits it and offers «Quitar del
historial», which asks («Quitar» confirms) and withdraws it — the Mileage
reading stays. Closing with typed input asks «¿Descartar los cambios?»
first; a clean sheet just closes. In
Avisos a Maintenance task with no Service yet asks «¿Cuándo fue la última
vez?»; recording one for it answers that.

## Sub-features

- `open-actions` the [+] actions sheet's «Registrar un Servicio»
  (`id: action-record-service`) opens the form on the active Vehicle.
- `open-vehicle` the Vehicle detail's «Servicios» list (`id:
  vehicle-services`, `id: vehicle-service-<n>`) holds «Registrar un
  Servicio» (`id: vehicle-record-service`), which opens the form for that
  Vehicle — no picker.
- `title` the sheet is `id: service-form` titled «Registrar Servicio»
  (`id: service-form-title`).
- `vehicle` when the form needs a Vehicle it shows the picker (`id:
  service-vehicle`); `?vehicleId=` or `?serviceId=` skips it.
- `tasks` Maintenance tasks are chips `id: service-task-<code>`; at least
  one task or one named line is required.
- `type` «Reparación» is `id: service-type-repair` (Mantenimiento is the
  default).
- `items` «Agregar» (`id: service-add-item`) appends a line `id:
  service-item-<n>` with a name (`id: service-item-<n>-name`) and, with
  costs per line (`id: service-per-item-cost`), a cost (`id:
  service-item-<n>-cost`); the lines' total is `id: service-items-total`.
- `fields` the odometer is `id: service-mileage` (required), the shop
  `id: service-shop`, the notes `id: service-notes`.
- `save` «Guardar» (`id: service-save`) validates and saves; the sheet
  closes and the new Service appears in the Vehicle's list and moves its
  Avisos answer.
- `close` `id: service-close` closes a clean sheet with no prompt; with
  input it asks «¿Descartar los cambios?» («Descartar» leaves, staying is
  the default).
- `edit` `?serviceId=` opens the same sheet pre-filled for editing.
- `withdraw` the edit sheet's «Quitar del historial» (`id:
  service-withdraw`) asks («Quitar» confirms) and withdraws the Service;
  its Mileage reading stays.

## How to get to it (user POV)

- Tap the floating [+] in the tab bar → «Registrar un Servicio».
- Open a Vehicle in Mi flota (or from Inicio's stage), scroll to
  «Servicios», tap «Registrar un Servicio».
- Tap an existing Service in that list to edit or withdraw it.
- Deep links: `seibi-dev://record-service?vehicleId=<id>`,
  `?serviceId=<id>`, `?tasks=<codes>`.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test
  account set (`test user:` line).
- The test account has at least one Vehicle; the flows read the first one
  (`scripts/first-vehicle.js`, read-only) and pick the Toyota Yaris 2015
  in the picker when other sessions' Vehicles are around.
- Light mode (`service` sets it; `service-discard` runs in night), default
  text size.

- **Clean slate first.** `drive ios service-cleanup` opens the Vehicle's
  «Servicios» and withdraws any leftover Service whose line says
  «Bombillo de freno» (what `service` records). Run it before `service`
  whenever a previous run died mid-way.
- **Record, edit, withdraw.** `drive ios service` (then `android`). It
  signs in before `startRecording`, checks Avisos asks «Cambio de aceite,
  ¿Cuándo fue la última vez?» (`service-01-reminders-before`), opens the
  form from [+] (`service-02-form`), proves the guards («Agrega al menos
  un trabajo o pieza.», `service-03-items-required`; the missing reading,
  `service-06-mileage-required`) and the keyboards (`service-04`…`07`,
  hiding each with the subflow `service-hide-keyboard.yaml`), saves
  (`service-08-saved`), shows Avisos answered (`service-09-reminders-after`)
  and the Service in the Vehicle's list (`service-10-vehicle-services`),
  edits it (`service-11-edit`, `service-12-edited`) and withdraws it
  (`service-13-withdraw-confirm`, `service-14-withdrawn`) — the run leaves
  no Service behind.
- **The discard guard.** `drive ios service-discard` (night): opens the
  Vehicle's form, closes it clean with no prompt, types, and answers
  «¿Descartar los cambios?» both ways.
- **Look at the screenshots.** Check the task chips' due dots, the per
  line costs and their total, that the keyboard never covers a field or
  «Guardar», and the discard sheet's wording.
- **Proof.** Each run folder holds the video and screenshots. The run
  deletes its Service, so the seibi-dev proof is the video plus a query
  for it during `service-08-saved`…`service-12-edited` (or the
  `report.xml` steps).

## Gotchas

- The shared test account changes under you: pick the Vehicle by name in
  `service-vehicle` («… 2015»), not by position; rerun if it was
  withdrawn mid-run.
- The keyboard hides each field under it: the flow scrolls every field
  into view before tapping and hides the keyboard with
  `service-hide-keyboard.yaml` (the number pad has no return key).
- Android shows an «Open|Abrir» app-link sheet on the `seibi-dev://vehicle/…`
  deep link; `service-discard` already taps it for iOS — check the same
  step's shape if a new flow deep-links on Android.
- «Descartar los cambios» appears via `repeat()` on
  `usePreventRemove`: a fast tap on `service-close` after typing must
  still show it; a clean form must close silently.
