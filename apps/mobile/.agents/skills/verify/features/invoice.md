# La factura de un Servicio

The Service form has «Factura o recibo», as the PWA's. «Adjuntar foto»
opens the system menu with «Tomar foto» and «Elegir de la galería». The
chosen photo shows as a thumbnail with «Foto lista. Se sube al guardar.»
and «Quitar factura»; saving uploads it. Opening a Service that has an
invoice shows it as «Factura guardada», with «Quitar factura» and
«Reemplazar factura»; removing or replacing it happens on «Guardar
cambios». In the Vehicle's Historial a Service with an invoice has a
«Factura» button on its expanded card, which opens the photo full screen
(a PDF uploaded from the PWA opens in the browser with «Abrir PDF»). The
file lives where the PWA keeps its invoices, so each app shows what the
other uploaded. Denying the camera explains it and offers «Elegir de la
galería» and «Abrir Ajustes».

## Sub-features

- `attach` «Adjuntar foto» (`id: service-invoice-attach`) → «Elegir de la
  galería» or «Tomar foto» puts the photo in the form (`id:
  service-invoice`, «Foto lista. Se sube al guardar.»).
- `save` «Guardar» / «Guardar cambios» (`id: service-save`) uploads it
  where the PWA reads invoices (`scripts/invoice-check.js` checks it as
  another device would).
- `view` the expanded card's «Factura» (`id: service-card-invoice-<n>`)
  opens the viewer (`id: invoice-viewer`) with the photo (`id:
  invoice-image`); `id: invoice-close` closes it. A PDF shows «Abrir PDF»
  (`id: invoice-open-pdf`).
- `saved` editing a Service with an invoice shows «Factura guardada» with
  its thumbnail, «Quitar factura» (`id: service-invoice-remove`) and
  «Reemplazar factura» (`id: service-invoice-replace`).
- `remove` «Quitar factura» then «Guardar cambios» clears the invoice and
  deletes its file; «Factura» leaves the card.
- `denied` a denied camera shows «Seibi no puede usar la cámara» with
  «Elegir de la galería», «Abrir Ajustes» and «Ahora no».

## How to get to it (user POV)

- The [+] → «Registrar un Servicio», or a Vehicle's Historial → «Registrar
  Servicio»: «Factura o recibo» at the end of the form.
- A Vehicle's Historial → tap a Service's card → «Editar» (attach, replace,
  remove) or «Factura» (view).
- Deep link to the viewer: `seibi-dev://invoice?serviceId=<id>`.

## Driving it with verify.sh

Preconditions:

- `verify.sh launch ios` ended with `doctor: OK`, with the test account
  set (`test user:` line).
- The test account has at least one Vehicle (`scripts/first-vehicle.js`
  reads the first one, read-only).
- The photo: `flows/media/invoice.jpg`, a receipt that reads «verify
  SEI-67». `drive` adds it to the device's library before the flow
  (SKILL.md → Photos). By hand: `xcrun simctl addmedia <udid>
  flows/media/invoice.jpg`.

- **Attach, see, remove.** `drive ios invoice`. It signs in and runs
  `scripts/cleanup-sei67.js` before `startRecording` (withdraws the Service
  an earlier run left, notes «verify SEI-67», and deletes its files). Then:
  records «Revisión con factura» from the Vehicle's Historial
  (`invoice-01-new-service`, «Adjuntar foto» visible on a new Service),
  opens it with «Editar», «Adjuntar foto» → «Elegir de la galería»
  (`invoice-02-menu`), picks the photo (`invoice-03-attached`), saves, and
  `scripts/invoice-check.js` (read-only, as another device) checks the
  path and that its signed link serves the file. «Factura» on the card
  (`invoice-04-card`) opens the photo (`invoice-05-viewer`). «Editar»
  shows «Factura guardada» (`invoice-06-saved-in-form`), «Quitar factura»
  brings back «Adjuntar foto» (`invoice-07-removed-in-form`), and after
  saving the check confirms no invoice and the old file gone; «Factura»
  leaves the card (`invoice-08-removed`).
- **Clean up.** `drive ios invoice-cleanup` withdraws the run's Service
  and deletes its files; `invoice` also does it at its start.
- **Proof query.** The Service stays (without invoice) until a cleanup:

  ```sql
  select s.id, s.invoice_path, s.updated_at, i.name
  from services s join service_items i on i.service_id = s.id
  where s.notes = 'verify SEI-67' and s.deleted_at is null;
  ```

  For the attached state, run it between `invoice-03-attached` and
  `invoice-07-removed-in-form`, or read `invoice-check.js`'s output
  (`invoicePath`) in `maestro.log`.

## Gotchas

- The simulator has no camera: «Tomar foto» shows «No pudimos abrir la
  cámara…» there. The camera path and the denied-camera alert need a
  phone.
- The photo picker is the system's, outside the app. The flow taps the
  first photo it lists. On a stock (not slim) simulator the library also
  holds Apple's sample photos, and the first may be one of them: the
  upload is still proven, but check `invoice-05-viewer` shows the receipt,
  or run on the slim simulator.
- The iOS photo picker reads «Photo, <date>» in English and «Foto, …» in
  Spanish; the flow takes either.
- `invoice-check.js` expects exactly one live «verify SEI-67» Service. A
  run that died before the cleanup leaves two only if the cleanup itself
  failed: run the flow again.
