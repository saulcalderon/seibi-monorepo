# Maintenance schedules come from cited sources, cached per model

## Status

accepted

## Decision

A Maintenance schedule for a brand, model, year, and engine is looked up
once by `vehicle-lookup` (OpenAI + web search), which must return
structured intervals per Maintenance task **and** the source URL for each.
It is stored in `maintenance_schedules` and reused by every Vehicle that
matches. When no citable source is found, Seibi stores and shows a
**general schedule**, labeled "Recomendación general, no específica de tu
modelo". Seibi never presents a guess as the manufacturer's.

Where the source gives a "severe" schedule, both are stored; the
maintenance engine uses severe when the Usage rate or Routines call for it.

## Considered options

- **Hand-curated dataset** — reliable, but only covers what we load.
- **Commercial API (CarMD, Vehicle Databases)** — paid, US-centric, misses
  Latin American variants sold in El Salvador.
- **Hardcoded generic intervals (what v1 did)** — rejected: the brief asks
  for brand/model/year-specific recommendations with no invented data.

## Consequences

- Schedules are rows people can review and correct.
- The first Vehicle of a new model waits a few seconds for its schedule;
  it shows the general schedule until the lookup finishes.
