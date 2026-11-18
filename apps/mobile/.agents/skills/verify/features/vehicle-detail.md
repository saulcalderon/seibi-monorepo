# Detalle del Vehículo

Opening a Vehicle — from Mi flota's card, Inicio's stage, or the
`seibi-dev://vehicle/<id>` deep link — shows its detail: the name and a
subtitle (year · versión · placa), «Editar Vehículo» in the header, the
Vehicle's art as a hero, and three tiles (Kilometraje with «actualizar»,
Salud with the pending count, weekly Uso). Four tabs switch through the
route's `tab` param: «Mantenimiento» (the plan banner and the Reminder
groups «Vencido», «Pronto», «Al día», plus «Citas y recordatorios» when it
has items), «Historial» (the «Servicios» and «Gastado este año» stats,
«Registrar Servicio», the Services grouped by month as expandable cards —
lines, «Taller», notes, «Editar», «Quitar» with its confirm — and the last
8 «Lecturas de kilometraje», each opening «Corregir lectura», which
changes the number without moving the date or the odometer), «Uso» (the
«Uso estimado» card and «Rutinas semanales» with their weekly total;
adding or editing a Routine happens in a sheet, deleting asks first) and
«Datos» (the Vehicle's rows, «Editar datos», the maintenance plan's
sources in the browser, the illustration note and «Retirar de mi
flota»). An id with no active Vehicle explains itself and offers «Ir a Mi
flota».

## Sub-features

- `header` the title is `id: vehicle-name`; the subtitle `id:
  vehicle-subtitle`; the pencil `id: vehicle-edit` opens the edit form.
- `hero` `id: vehicle-hero` shares the art with Inicio's stage
  (`src/vehicle/vehicle-art.tsx`): `id: vehicle-hero-art-poster` when the
  Vehicle has a render, else `id: vehicle-hero-art-silhouette` (Inicio's
  are `home-vehicle-poster` / `home-vehicle-silhouette`).
- `tiles` `id: tile-odometer`, `id: tile-health`, `id: tile-usage`; the
  first opens «Actualizar Kilometraje» for this Vehicle, the last jumps to
  Uso.
- `tabs` `id: detail-tabs` is a radio group; `id: detail-tabs-<tab>`
  selects `mantenimiento` (default), `historial`, `uso` or `datos` and
  lands in `?tab=` for deep links.
- `plan` the schedule banner is `id: schedule-banner-pending` / `-model` /
  `-general`; the last's «Buscar plan del fabricante» refreshes the
  Vehicle's data (`id: schedule-fetch`).
- `reminders` the groups are `id: reminder-group-<status>` with rows `id:
  reminder-<taskCode>` — read-only until the Reminder detail (S9), with no
  status badge (the group names it; a snoozed row says «Pospuesto»).
- `agenda` «Citas y recordatorios» (`id:
  detail-appointments`) lists appointments (`id: detail-appointment`)
  and open manual Reminders (`id: detail-manual-reminder`) read-only; hidden when empty.
- `history` stats `id: stat-services` and `id: stat-spent`; `id:
  record-service` opens «Registrar Servicio» for this Vehicle; each
  month's card `id: service-card-<n>` expands to `id:
  service-card-body-<n>` with `id: service-card-edit-<n>` → the form with
  `?serviceId=` and `id: service-card-withdraw-<n>` → «¿Quitar este
  Servicio del historial? El kilometraje registrado se conserva.» then the
  «Servicio quitado del historial» toast.
- `readings` `id: history-readings` rows `id: reading-<n>` open
  «Corregir lectura» (`id: correct-sheet`, field `id: correct-reading`,
  `id: correct-save`); a wrong value answers «Escribe un número válido.»,
  a saved one toasts «Lectura corregida».
- `usage` `id: usage-estimate` carries `id: usage-update-mileage`; `id:
  routine-add` and the rows `id: routine-<n>` open the Routine sheet (`id:
  routine-sheet`, `id: routine-title`, `id: routine-name`, `id:
  routine-distance`, name presets `id: routine-preset-<key>` on create,
  day chips `id: routine-day-<n>` (radios), `id: routine-save`, `id:
  routine-delete` when editing); `id: routine-total` sums the week. A
  `routineId` that no longer exists shows `id: routine-gone` instead of
  the create form.
- `data` `id: data-rows`, `id: data-edit` opens the edit form, `id:
  data-source-<n>` opens a plan source in the browser, `id: data-withdraw`
  is the danger row — flows never tap it.
- `missing` `id: vehicle-missing` explains «No encontramos este Vehículo»
  and its action goes to Mi flota.

## How to get to it (user POV)

- Mi flota → tap a card (`id: fleet-vehicle-<n>`).
- Inicio → tap the stage's Vehicle name (`id: home-stage-vehicle`).
- Deep link `seibi-dev://vehicle/<id>` and `…?tab=historial|uso|datos`.
- Record-service flow: Historial → «Registrar Servicio».
- Correct-reading flow: Historial → a «Lecturas de kilometraje» row.
- Routine flow: Uso → «Agregar rutina» or a routine row.
- Edit flow: the header pencil or Datos' «Editar datos».

## Driving it with verify.sh

Preconditions: the baseline, and the test account's first Vehicle on
seibi-dev (the Toyota Yaris). `vehicle-detail` walks every tab and saves
and removes a Service and a Routine with the `verify SEI-61` marker. It
starts by running `scripts/cleanup-sei61.js` (before the recording), so
an interrupted earlier run can't change the totals it asserts;
`vehicle-detail-cleanup` runs the same cleanup alone, through REST under
the account's RLS (the marker text only shows inside an expanded card). `service`
exercises edit and withdraw from Historial's card. Commands as in
`../SKILL.md`: `scripts/verify.sh drive <ios|android> vehicle-detail`.

## Gotchas

- The Service's Mileage is the odometer read from `id: tile-odometer`,
  never a hardcoded number — the test Yaris moves with every `mileage`
  run.
- «Quitar»/«Eliminar Rutina»/«Retirar de mi flota» are destructive: only
  the two marked verify rows are ever removed; the withdraw row is
  asserted visible but never tapped.
- Toast copies («Servicio quitado del historial», «Lectura corregida»,
  «Rutina guardada», «Rutina eliminada») announce for accessibility only;
  assert them on iOS and prove Android by the closed sheet and the changed
  list.
- «Corregir lectura» and the Routine sheet keep their title, field and
  save over the open number pad (SEI-76): the flow asserts them with the
  pad up (`detail-05-correct-pad`, `detail-06-routine-pad`). With the pad
  up the Routine's day chips sit under the save bar, where Maestro still
  counts them visible, so the flow drags the form up first, as a person
  does.
- The confirm alerts differ by platform, so the taps split with `runFlow:
  when: platform`. On iOS «Quitar» and «Eliminar Rutina» also name the
  card's or sheet's button behind the alert, so the flow picks the
  alert's own («Quitar» by `index: 1`, «Eliminar Rutina» between the
  alert's message and «Cancelar»); on Android the alert is its own window
  and the flow taps `android:id/button1`.
