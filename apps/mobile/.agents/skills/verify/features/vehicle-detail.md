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
- `hero` `id: vehicle-hero` shares the art with Inicio's stage.
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
  reminder-<n>` — read-only until the Reminder detail (S9).
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
  routine-distance`, day chips `id: routine-day-<n>`, `id: routine-save`,
  `id: routine-delete` when editing); `id: routine-total` sums the week.
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
and removes a Service and a Routine with the `verify SEI-61` marker;
`vehicle-detail-cleanup` removes leftovers of an interrupted run through
REST (the marker text only shows inside an expanded card). `service`
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
- On Android the number pad over the Routine sheet needs `back` before the
  next chip is reachable.
