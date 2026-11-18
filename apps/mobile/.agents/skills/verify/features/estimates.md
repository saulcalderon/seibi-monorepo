# Estimados

The Estimados tab prices a job on one Vehicle in the person's city. Under
«Rangos de precio para tu Vehículo, en tu ciudad.», a line names the
Vehicle Inicio shows with «N por atender» or «Al día», and with two or more
Vehicles unfolds the others to switch to. With no country in the profile,
«¿Dónde está tu Vehículo?» (country, city, «Guardar ubicación») takes the
place of the form. «¿Qué quieres cotizar?» takes three characters or more;
the task chips under it put the Vehicle's overdue and «Por vencer» tasks
first, with a dot, then the popular ones. Asking shows the question as a
bubble, then «Buscando precios en tu zona…», «Comparando fuentes…»,
«Ordenando los resultados…» while the research runs, then the result: the
Vehicle and city, the job, «Taller independiente» and «Agencia» (or «Sin
datos»), economy parts, original parts and labour, the summary, «Suele
incluir», «Qué mueve el precio», the confidence in bars and words, up to
five «Fuentes» that open in the in-app browser, and «Estimado, no
presupuesto…». With no price found, only the summary of what is missing.
«Consultas anteriores» lists the Vehicle's last six, a tap showing that
result again. A failure shows its message («Llegaste al límite de
consultas de hoy. Vuelve mañana.» at the daily AI limit). No Vehicle:
«Agrega un Vehículo».

## Sub-features

- `screen` `id: estimates-screen`; loading `id: estimates-loading`, error
  `id: estimates-error`, no Vehicle `id: estimates-empty` with `id:
  estimates-add-vehicle`.
- `vehicle` `id: estimates-vehicle`: `id: estimates-vehicle-name` («<model>
  · N por atender» / «· Al día»), `id: estimates-vehicle-toggle` unfolds
  `id: estimates-vehicle-<n>` (two or more Vehicles); a tap switches
  Estimados and Inicio.
- `location` `id: estimates-location` (profile without a country): `id:
  estimates-location-country`, `-city`, `-save`.
- `ask` `id: estimates-query` and `id: estimates-send` («Estimar»,
  disabled under three characters or while a request runs); chips `id:
  estimates-task-<taskCode>` in `id: estimates-tasks`, spoken «<task>,
  pendiente» when due.
- `thread` `id: estimates-thread`: the question `id: estimates-asked`, the
  waiting line `id: estimates-waiting` (busy, its step as its value), a
  failure `id: estimates-request-error`.
- `result` `id: estimates-result`: `-title`, `-summary`, `-independent`,
  `-dealership`, `-includes`, `-factors`, `-confidence`, `-sources` with
  `-source-<n>` (in-app browser).
- `past` `id: estimates-past` with rows `id: estimates-past-<n>` (spoken
  «<job>, <independent total or Sin rango> · <day>»); hidden while a request
  runs.
- `link` `/estimates?vehicle=<id>&task=<code>` asks for that task once on
  arrival: the Reminder detail's «¿Cuánto cuesta?» (`id:
  reminder-detail-estimate`).

## How to get to it (user POV)

- The Estimados tab (`id: tab-estimates`), fourth in the bar.
- A Reminder's detail → «¿Cuánto cuesta?» (Avisos, Inicio's «Estado», the
  Vehicle detail's Mantenimiento), which opens the tab on that Vehicle and
  asks for that task.

## Driving it with verify.sh

Preconditions: the baseline; the test account's profile has a country and
city (San Salvador, El Salvador on seibi-dev) and its Toyota Yaris; fewer
than eight of its tasks are overdue or «Por vencer», so «Cambio de aceite»
(`engine_oil`, the first popular task) has a chip; the account has AI calls
left today.

- **The tab and one Estimate.** `scripts/verify.sh drive ios estimates`:
  the tab with the Vehicle line, the field and the chips
  (`estimates-01-form`); `id: estimates-task-engine_oil` asks once: the
  question bubble and, unless the Estimate is cached, the waiting line
  (`estimates-02-waiting`); the result card with its title and summary and
  no error (`estimates-03-result`); its confidence (`estimates-04-confidence`).
- **Past queries.** The first row of «Consultas anteriores» starts with the
  result's title (`estimates-05-past`).
- **Sources.** When the result has one, `id: estimates-result-source-0`
  opens the in-app browser (`estimates-06-source`) and «Done» comes back to
  the card.
- **Saved data.** After the run, a read-only seibi-dev `SELECT` shows the
  new request, the same table the PWA's «Consultas anteriores» reads:

  ```sql
  select r.created_at, e.task_code, e.query, e.city, e.country, e.result->>'found' as found
  from estimate_requests r
  join estimates e on e.id = r.estimate_id
  join auth.users u on u.id = r.user_id
  where u.email = 'e2e@seibi.test'
  order by r.created_at desc
  limit 3;
  ```

## Gotchas

- **One Estimate per run.** Every request spends one of the account's AI
  calls for the day (`AI_DAILY_LIMIT`, 20 by default, counted in `ai_usage`) unless the same
  task, Yaris and city is already cached (30 days in `estimates`). The flow
  asks once, always for `engine_oil`, so after the first run it is cached
  and free; don't add requests to it, and don't loop it. At the limit the
  card shows `id: estimates-request-error` and the flow fails.
- A new Estimate runs a web search and can take one to two minutes; the
  flow waits up to four. A cached one answers in about a second, so the
  waiting line is optional in the flow.
- Each run adds an `estimate_requests` row (it is the request log the PWA
  reads too); nothing removes them, so «Consultas anteriores» keeps
  growing on the test account. Only the first six for the Yaris show.
- `engine_oil` can be a pending chip (with a dot) after the `reminders`
  flow made it overdue, or a popular one; either way its id is the same.
- The in-app browser's close button is in the system's language: the flow
  taps «Done», «Listo» or «OK» on iOS and the back key on Android.
- A profile without a country shows `id: estimates-location` instead of the
  form; the test account has one, so the flow never sees it. Don't clear
  it to prove the card: Perfil's «Ubicación» is the same save.
