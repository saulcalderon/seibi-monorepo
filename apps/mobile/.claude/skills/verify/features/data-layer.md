# The data layer reads and writes seibi-dev

Signed in to Seibi Dev, Perfil (the header avatar) has «Revisar datos (desarrollo)»,
which opens «Revisión de datos»: a screen that exists in the development
variant only, until real screens use the data layer. It lists the person's
Vehicles from the one garage query with each one's current odometer
(«Kilometraje actual: 50,000 km») and how many readings it has; with no
Vehicle it offers «Crear Vehículo de prueba». Under «Kilometraje de hoy» a
standalone Mileage reading is saved through the Mileage write rules: one that
is not above the current odometer is refused with «Debe ser mayor que el
último registro (50,000 km).», one above it shows «Kilometraje actualizado:
50,500 km» and becomes the current odometer. «Formatos en este teléfono»
prints the formatters as the phone's JavaScript engine (Hermes) renders
them; they match the PWA's browser output.

## Sub-features

- `garage-read` the test account's Vehicles load from seibi-dev (`useGarage`), with the current odometer: the latest day's reading, then the highest.
- `create-vehicle` with no Vehicle, «Crear Vehículo de prueba» creates a Toyota Yaris 2015 (black, km) with a first reading of 50,000 km (`useCreateVehicle`), whose schedule and render already exist on seibi-dev.
- `reading-refused` a standalone reading equal to or below the current odometer shows «Debe ser mayor que el último registro (…)» from `es.json`; nothing is saved.
- `reading-saved` a reading above it is saved dated today (`useAddReading`); the garage refetches and the current odometer moves to it.
- `formats` `formatUsd`, `formatUsdRange` and `formatDistance` print `$1,234`, `-$40`, `$1,234.50`, `$80 – $120`, `30,500 km` on the phone.
- `dev-only` the entry and the route exist in the development variant only (`EXPO_PUBLIC_APP_VARIANT=development`).

## How to get to it (user POV)

- Sign in, tap the avatar at the top right of a tab, then «Revisar datos (desarrollo)» under «Desarrollo» in Perfil.
- Deep link `seibi-dev://data-check` while signed in (development variant only).

## Driving it with verify.sh

Preconditions:

- `verify.sh launch <ios|android>` ended with `doctor: OK` and `supabase: … (seibi-dev)`, `test user: e2e@seibi.test (password set)`.
- Seibi Dev is built from a branch that has SEI-53 (JavaScript only: any build since SEI-44 runs it; no rebuild needed).

- **Sign in, then record.** `.claude/skills/verify/scripts/verify.sh drive ios data-layer` (then `android`). The flow signs in with `runFlow: sign-in.yaml` before `startRecording`, then cold-starts the app signed in, so the video never shows the password.
- **Vehicles listed.** Open Perfil (`open-profile.yaml`), scroll to and tap `id: open-data-check`; `id: data-check-vehicle-0` shows with `id: data-check-odometer` reading `Kilometraje actual: <n> km`. On a test account with no Vehicle, `id: data-check-empty` shows first and the flow taps `id: data-check-create-vehicle`. Screenshot `vehicles-listed`.
- **Refused reading.** Type the current odometer into `id: data-check-reading-input`, tap `id: data-check-reading-save`: `id: data-check-reading-error` reads `Debe ser mayor que el último registro (<current> km).`. Screenshot `reading-refused`.
- **Saved reading.** Erase, type current + 500, tap save: `id: data-check-reading-saved` reads `Kilometraje actualizado: <new> km` and `id: data-check-odometer` moves to it. Screenshot `reading-saved`.
- **Formats.** Scroll to `id: format-month`: `id: format-usd` `$1,234`, `id: format-usd-negative` `-$40`, `id: format-usd-cents` `$1,234.50`, `id: format-usd-range` `$80 – $120`, `id: format-distance` `30,500 km`. Screenshot `formats`.
- **Saved data.** A read-only seibi-dev query shows the reading, dated today:
  `select v.brand, v.model, v.year, m.reading, m.recorded_on, m.created_at from public.mileage_readings m join public.vehicles v on v.id = m.vehicle_id join auth.users u on u.id = v.user_id where u.email = 'e2e@seibi.test' order by m.created_at desc limit 5;`

## Gotchas

- Each run leaves one reading on the test account's Toyota Yaris, 500 above the last; the first run on an empty account also leaves the Vehicle. Mileage readings are corrected, never deleted (CONTEXT.md), so they stay; withdraw the Vehicle from Mi flota (S5) or delete the account to start clean.
- The test Vehicle is a Toyota Yaris 2015 in black on purpose: seibi-dev already has its Maintenance schedule (`toyota|yaris|2015`) and Model render (`toyota_yaris_2015_black`), so creating it calls `vehicle-lookup` and `vehicle-render` without spending an AI lookup or a fal render. Another brand, model, year or paint would.
- «Hoy» is the phone's local day. A run just after midnight UTC on a simulator set to another time zone still dates the reading by the simulator's clock.
- The number pad on iOS has no return key; the flow taps `id: data-check-reading-save`, which sits beside the field above the keyboard. Scrolling dismisses the keyboard before the formats.
- The screen is not in production or preview bundles: the route `require`s its module behind `EXPO_PUBLIC_APP_VARIANT === 'development'`, and `Stack.Protected` keeps the route closed there.
