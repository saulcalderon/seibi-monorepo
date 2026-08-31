# English for technology, Spanish for people-facing writing

The team is bilingual: engineering works in English, coworkers and product
writing work in Spanish. We keep that split rather than picking one language
for everything — Spanish identifiers would fight the stack and the technical
lead; English-only writing would lock the rest of the team out of Linear and
the domain conversation.

## Status

accepted

## Decision

**Technology is English.** Schema, code identifiers, commits, pull requests,
ADRs, and agent docs use English.

**`CONTEXT.md` is English.** One glossary, English terms. A second Spanish
`CONTEXT` file would drift; the Spanish names live only in the mapping below.

**People-facing writing is Spanish.** Linear (issues, PRDs, comments),
user-facing UI, and other writing meant for non-engineering coworkers use the
Spanish column in this ADR.

**Enums are English; free text is as-entered.** Constrained stored values
(Postgres enums, check constraints, TypeScript unions that persist) use the
English identifier (`maintenance`, `repair`). Free-text fields (shop name,
notes, comments) store whatever the user typed — Spanish, English, or mixed.
The UI maps enum codes back to the Spanish word.

## Mapping

| CONTEXT.md | Schema | Linear / UI |
| --- | --- | --- |
| Vehicle | `vehicles` | Vehículo |
| Plate | `plate` | Placa |
| Service | `services` | Servicio |
| Type | `type` — enum `maintenance` \| `repair` | Tipo — mantenimiento \| reparación |
| Shop | `shop` (free-text column, not its own table) | Taller |
| Reminder | `reminders` | Recordatorio |
| Mileage | `mileage_readings` | Kilometraje |
| Odometer measure | `odometer_measure` — enum `km` \| `mi` | Medida del odómetro — km \| millas |
| Estimate | `estimates` | Estimado |

UI copy still says the Spanish word (placa, taller, mantenimiento). The
column behind it is English (`plate`, `shop`, `type`). `type` stores
`maintenance` or `repair`; `shop` stores the typed name.

## Considered options

- **Spanish everywhere, including tables** — rejected: Postgres, TypeScript,
  and the technical lead are English-first; renaming `vehiculos` later is a
  real migration.
- **English everywhere, including Linear** — rejected: coworkers need the
  Spanish names to follow product work.
- **Two CONTEXT files** (English + Spanish) — rejected: they would drift;
  one glossary plus this mapping is enough.
- **Spanish terms, English definitions in one CONTEXT** — rejected: the mix
  is harder to read than an English glossary.
- **Spanish column names, English table names** (or the reverse) — rejected:
  a half-split is harder to apply than a hard rule.
- **Persist glossary strings as-is** (`mantenimiento` in the row) — rejected:
  enums are technology; free text is the bilingual exception.

## Consequences

- New tables and columns follow the Schema column. Existing localStorage keys
  and fields such as `placa` are not a precedent; the schema does not copy them.
- Type is an enum: the column is `type`, the values are `maintenance` and
  `repair`. Linear and the UI still say mantenimiento and reparación.
- Agents write Linear in Spanish (Linear / UI column) and code in English
  (CONTEXT.md + Schema). They do not name a table `vehiculos`.
