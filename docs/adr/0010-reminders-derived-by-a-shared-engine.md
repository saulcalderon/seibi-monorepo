# Reminders are derived by one shared engine

## Status

accepted

## Decision

Derived Reminders are **computed, not stored**, by a pure TypeScript
package, `packages/maintenance-engine`, imported by the SPA and by the
`reminders-daily` Edge Function. Inputs: the Maintenance schedule, Service
items per Maintenance task, Mileage readings, Routines, and today. Only
hand-written Reminders and per-Reminder snoozes are stored.

Due = whichever comes first of the distance and time interval since the
last Service item for that task. Distance is projected from the Usage rate
(recent readings, else Routines). Status: `ok`, `soon` (within 10% of the
interval or 30 days), `overdue`, or `unknown` (no last Service and the user
did not know).

A Vehicle's health is the worst status among Reminders that have a date.
`unknown` Reminders do not count: every new Vehicle starts with a dozen of
them, and it would read "revisar" until the user filled in each one. Seibi
asks about them in a separate "Completa tu historial" prompt instead.

## Considered options

- **Stored `reminders` rows updated by triggers** — rejected: every Service,
  reading, and schedule change would have to rewrite them; drift is easy.
- **SQL function** — rejected: the logic is easier to test in TypeScript and
  must run in the client for instant feedback.
