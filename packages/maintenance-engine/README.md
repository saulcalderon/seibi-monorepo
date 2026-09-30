# @seibi/maintenance-engine

Pure TypeScript that turns a Vehicle's Maintenance schedule, Service items,
Mileage readings, and Routines into derived Reminders (ADR-0010). No I/O,
no dependencies. Imported by the app and by the `reminders-daily` Edge
Function, so it uses explicit `.ts` imports that Deno understands.

Dates are calendar days as `YYYY-MM-DD` strings (CONTEXT.md: Service and
Mileage dates are calendar days).
