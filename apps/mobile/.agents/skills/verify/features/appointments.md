# Agendar una Cita

«Agendar Cita» is a sheet that saves future work on a Vehicle: the
Vehicle (a picker with two or more), the day (the native date picker, from
today on; it opens on today), «¿Para qué es?» (up to 14 Maintenance task
chips, the form's own task and the Vehicle's overdue and soon ones first),
«Taller» and «Notas», both optional, and «Guardar Cita» (toast «Cita
guardada»). It opens from the [+]'s «Agendar Cita», the Vehicle
detail's «Agendar Cita» and a Reminder detail's «Agendar» (with that task's
chip on). The upcoming Appointments (today on, not canceled or done) show
in Avisos' first card as «Cita · <Taller>» with the day and «Hecho», and in
the Vehicle detail's «Citas y recordatorios» with their tasks, day and
Shop, «Marcar hecho» and «Cancelar». «Hecho» and «Marcar hecho» open
«Registrar Servicio» with the Appointment's tasks and Shop; saving it marks
the Appointment done. «Cancelar» asks «¿Cancelar la Cita del <día>?», then
removes it from both (toast «Cita cancelada»). Closing the sheet with
changes asks «¿Descartar la Cita?».

## Sub-features

- `form` the sheet `id: appointment-sheet`: `id: appointment-title`
  («Agendar Cita»), `id: appointment-close`, `id: appointment-vehicle` (two
  or more Vehicles), `id: appointment-date`, chips `id:
  appointment-task-<taskCode>` (selected state spoken), `id:
  appointment-shop`, `id: appointment-notes`, `id: appointment-save`; a
  failed save `id: appointment-error`. No Vehicle: `id: appointment-empty`.
- `rules` the day is required and, for a new Appointment, today or later
  («Una Cita es para hoy o una fecha futura. Si ya lo hiciste, registra un
  Servicio.»); the picker doesn't offer earlier days. Tasks, Shop and notes
  are optional; a blank Shop or notes saves as nothing.
- `discard` closing with a change («Cerrar», a drag, Back) asks
  «¿Descartar la Cita?» («Descartar» / «Seguir editando»).
- `avisos` rows `id: avisos-appointment-<n>` («Cita» or «Cita · <Taller>»,
  the day and «Hoy» / «En N días»), «Hecho» `id:
  avisos-appointment-<n>-done` (spoken «Hecho: registrar el Servicio de la
  Cita del <día>»).
- `detail` rows `id: detail-appointment-<n>` (the tasks or «Cita en el
  taller», the day and the Shop), «Marcar hecho» `-done`, «Cancelar»
  `-cancel` (spoken «Cancelar la Cita del <día>»); `id:
  detail-add-appointment` («Agendar Cita») beside «Recordatorio».
- `done` «Hecho» / «Marcar hecho» open `id: service-form` with a line per
  task and the Shop filled; saving it takes the Appointment off both lists.
- `cancel` the native alert «¿Cancelar la Cita del <día>?» («Sale de Avisos
  y del detalle del Vehículo.», «Cancelar Cita» / «Mantenerla»).
- `from-reminder` a Reminder detail's «Agendar» (`id:
  reminder-detail-schedule`) replaces it with the sheet, that task's chip on.

## How to get to it (user POV)

- The [+] (`id: open-actions`) → «Agendar Cita» (`id:
  action-schedule-appointment`), on Inicio's Vehicle.
- The Vehicle detail's Mantenimiento → «Agendar Cita» (`id:
  detail-add-appointment`), on that Vehicle.
- A Reminder's detail → «Agendar» (`id: reminder-detail-schedule`).
- Seeing and acting on one: the Avisos tab, or the Vehicle detail's
  «Citas y recordatorios».

## Driving it with verify.sh

Preconditions: the baseline, and the test account's Vehicle on Inicio (the
Toyota Yaris) with «Cambio de aceite» among the first 14 chips (it is the
first common task). `appointments` runs `scripts/cleanup-sei68.js` before
the recording and again at the end: it cancels any open Appointment whose
notes or Shop start «verify SEI-68». `appointments-cleanup` runs the same alone.

- **Schedule.** `scripts/verify.sh drive ios appointments` (then
  `android`): the [+] shows «Agendar Cita» (`appointments-01-actions`);
  it replaces the actions sheet with «Agendar Cita» (`appointments-02-form`);
  «Cambio de aceite», Shop «verify SEI-68 taller» and notes «verify SEI-68»,
  with title and «Guardar Cita» above the keyboard
  (`appointments-03-filled`); saving closes the sheet.
- **In Avisos.** «Cita · verify SEI-68 taller» with «Hecho»
  (`appointments-04-avisos`).
- **In the Vehicle detail.** Inicio's stage → the detail: the row with
  «Cambio de aceite», today and the Shop, «Marcar hecho», and «Agendar
  Cita» under the card (`appointments-05-detail`).
- **Cancel.** «Cancelar» asks (`appointments-06-cancel-confirm`); «Cancelar
  Cita» removes the row (`appointments-07-canceled`) and Avisos no longer
  shows it (`appointments-09-avisos-after`).
- **From the detail, discarded.** «Agendar Cita» opens the sheet; with
  «Cambio de aceite» on, «Cerrar» asks «¿Descartar la Cita?»
  (`appointments-08-discard-ask`) and «Descartar» closes it with nothing
  saved.
- **Saved data.** After the run, a read-only seibi-dev `SELECT
  scheduled_on, shop, notes, task_codes, canceled_at, service_id FROM
  appointments WHERE notes LIKE 'verify SEI-68%' ORDER BY created_at DESC
  LIMIT 1` shows today, the Shop, `{engine_oil}` and `canceled_at` set.

## Gotchas

- The flow keeps today's date: the native pickers (SwiftUI's compact one,
  Material's dialog) differ too much to drive reliably, and today is a
  valid Appointment day.
- `detail-appointment-0` is the soonest upcoming Appointment. The flow's is
  today's, so it is first unless the test account has another one today;
  keep the account's other Appointments in the future.
- A Reminder's «Agendar» is not driven here: the test Yaris' Reminders
  are all unknown after the cleanups, so its detail has no Reminder row to
  open. Drive it after `reminders` makes «Cambio de aceite» overdue, or on
  a Vehicle with Services.
- «Hecho» is not driven here: saving a Service moves the test Yaris'
  Reminders and Mileage, which other flows assert. `service` covers the
  Service form.
- With the keyboard up, «Notas» sits under the «Guardar Cita» bar, where
  Maestro still counts it visible: a tap on it lands on «Guardar Cita» and
  saves. The flow puts the keyboard away (`service-hide-keyboard.yaml`)
  before scrolling to «Notas».
- On iOS the row's «Cancelar» and the alert's «Cancelar Cita» differ, so
  `text: Cancelar Cita` hits the alert; on Android the alert is its own
  window and the flow taps `android:id/button1`.
- Toasts announce for accessibility only; assert the closed sheet and the
  changed lists instead.
