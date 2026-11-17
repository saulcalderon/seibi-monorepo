# Mi flota and the Vehicle form

Mi flota is the second tab. Its list shows each Vehicle as a card: the
Model render or its silhouette in the Vehicle's paint, its name and year,
Plate and current odometer, and its health. The Vehicle Inicio shows
comes first (a house icon), then by urgency. With two or more Vehicles
the header has the system search bar and the list has «Todos · Requiere
atención · Al día» chips; search matches every typed word against make,
model, year, Plate (with or without dashes) and trim, ignoring accents.
«Tu flota está vacía» with no Vehicle, «Sin resultados» when nothing
matches. A card opens the Vehicle in this tab; its «…» menu opens
«Editar Vehículo» or withdraws it after a native alert («Puedes
restaurarlo durante 30 días»). Withdrawn Vehicles sit under «Ver
Vehículos retirados (n)», last withdrawn first, each «Retirado · se
elimina en N días» with «Restaurar». «Agregar» opens the Vehicle form.

The Vehicle form is a modal with its own stack: «Agregar Vehículo» empty
or «Editar Vehículo» pre-filled with «Retirar de mi flota». Its fields:
make, year and model are pickers that push a search screen (the system
search bar, popular makes first, «Usar “…”» keeps free text); then
engine, trim, the 13 paint swatches, Plate, km/mi (the measure locks
once the Vehicle has readings) and Mileage. «Guardar» rides the keyboard
and names the first missing field on an empty save; leaving with unsaved
input asks first.

## Sub-features

- `list` the cards `id: fleet-vehicle-<n>` with `id: fleet-summary`;
  «Tu flota está vacía» is `id: fleet-empty`.
- `search` the header search bar (a field at the bottom on iOS 26, a
  toolbar icon on Android); subflow `fleet-search-field.yaml` focuses it.
  No match: «Sin resultados» (`id: fleet-no-results`) with «Ver todos»
  (`id: fleet-show-all`).
- `filters` the chips `id: fleet-filter-all`, `fleet-filter-attention`,
  `fleet-filter-ok`; the whole group shows only with two or more
  Vehicles.
- `add` «Agregar» (`id: fleet-add`) opens `/vehicle/new`.
- `menu` a card's «…» (`id: fleet-vehicle-<n>-menu`) opens «Editar
  Vehículo» (to `/vehicle/<id>/edit`) or «Retirar de mi flota» (the
  native alert, «Retirar» confirms).
- `withdrawn` «Ver Vehículos retirados (n)» (`id:
  fleet-withdrawn-toggle`) expands the withdrawn list; each row has
  «Restaurar» (`id: fleet-restore-<n>`).
- `form` the modal's fields: `id: vehicle-form-brand`, `-year`, `-model`
  (pickers), `-engine`, `-trim`, `-plate`, `-measure-km`/`-measure-mi`,
  the paint swatches `vehicle-form-paint-<code>` (e.g.
  `vehicle-form-paint-blue`), «Guardar» `vehicle-form-save`, and in edit
  «Retirar de mi flota» `vehicle-form-withdraw`.
- `picker` the pushed search screen's options are `id: pick-option-<value>`
  (e.g. `pick-option-Kia`, `pick-option-2020`, `pick-option-Rio`); «Usar
  “…”» keeps typed text the list doesn't know.

## How to get to it (user POV)

- Tap «Mi flota» in the tab bar.
- «Agregar» in the header, or Inicio's «Agregar mi Vehículo» empty
  state, opens the form.
- A card opens the Vehicle; its «…» menu edits or withdraws it.
- Deep links: `seibi-dev://vehicle/new`, `/vehicle/<id>/edit`,
  `/vehicle/pick?kind=brand|year|model`.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK`, with the test
  account set (`test user:` line).
- Light mode, default text size.
- No leftover «S5-» Vehicles: run `drive ios fleet-cleanup` first if a
  previous run died mid-way. It searches «S5-» and withdraws each match
  through the app; the Yaris is never touched.

- **List, add, search, edit, withdraw, restore.** `drive ios fleet`
  (then `android`). It signs in before `startRecording`, shows the list
  (`fleet-01-list`), opens the empty form and proves the first-field
  error (`fleet-02`, `fleet-03`), picks make «Kia» from the popular list
  (`fleet-04-brand-search`) and types model «Rio» — «Usar “Rio”» when
  vPIC is down (its error note shows), the list option when it's up
  (`fleet-05-models`), fills engine, Plate
  «S5-RIO-01», paint and Mileage 12,345 with the keyboard up and «Guardar»
  visible (`fleet-06`, `fleet-07`), saves (`fleet-08-added`), searches by
  Plate (`fleet-09`), «Sin resultados» + «Ver todos» (`fleet-10`), the
  «Al día» filter (`fleet-11`), narrows to the card and edits it
  (`fleet-12-edit`), withdraws through the alert (`fleet-13`), restores
  it (`fleet-14`, `fleet-15`), narrows again so the cleanup menu can't
  reach another Vehicle, and withdraws it for good (`fleet-16`) — the run
  leaves no «S5-» Vehicle.
- **Look at the screenshots.** Check the render/silhouette thumbnails,
  the card order (Inicio's Vehicle first), the grouped picker rows, the
  paint swatches and the withdrawn rows' «se elimina en N días».
- **Proof.** The run withdraws what it creates; the seibi-dev proof is
  the video plus the read-only query for `plate like 'S5-%'` showing the
  row and its `deleted_at`.

## Gotchas

- The shared test account changes under you: every menu tap is preceded
  by a search narrowing the list to «S5-RIO» so `fleet-vehicle-0-menu`
  is provably the Kia's, never the Yaris's.
- Search and the filter chips only exist with two or more Vehicles; a
  run that leaves the account at one Vehicle loses the search bar (the
  bug that hid the menu behind it was fixed by searching before each
  menu tap).
- The header search bar is a system control: the subflow taps its
  placeholder on iOS («Buscar…») and the toolbar search icon + field on
  Android; «Cancelar»/«Cancel» dismisses it.
- vPIC data is remote and can be down: the flow picks the make from the
  always-rendered popular list and takes the model's free-text «Usar …»
  row when the list fails (the error note is asserted only then).
- iOS and Android name the destructive button differently («Retirar» vs
  «RETIRAR»); the flows match `Retirar|RETIRAR`.
