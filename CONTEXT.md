# Seibi

Seibi tracks vehicle maintenance: work done on a Vehicle, when the next
Service is due, and what that work might cost.

## Language

**Vehicle**:
An automobile owned by a user. Every Service, Reminder, and Mileage reading
belongs to exactly one Vehicle. A Plate is optional. Mileage on a Vehicle
uses one odometer measure. A Vehicle may have no Mileage readings yet.
_Avoid_: auto, car, unit

**Withdrawn**:
A Vehicle the user has removed from their Vehicles without destroying it.
A Withdrawn Vehicle does not appear among the user's Vehicles until it is
restored. Services and Mileage readings stay on it.
_Avoid_: deleted, removed, archived

**Plate**:
The registration identifier on a Vehicle. Optional and not unique; two
Vehicles may share a Plate, or share brand, model, and year. An absent
Plate is shown as absent; Seibi does not invent one.
_Avoid_: placa, license

**Service**:
A dated record of work done on a Vehicle. Its date is a calendar day, not
a clock time. Every Service is recorded with exactly one Mileage reading.
The Service date and that reading's date are separate; they are written
the same and are not kept in lockstep. A Mileage reading is not a Service.
A Service can be withdrawn without destroying its Mileage reading.
_Avoid_: entry, log, job

**Type**:
The kind of Service: maintenance (planned, recurring) or repair (unplanned).
_Avoid_: category, class

**Shop**:
The place a Service was performed. Optional on a Service, not a standalone
concept.
_Avoid_: garage, mechanic, store

**Service item**:
One thing done or replaced within a Service: a named line with an optional
cost, part brand, and part number. It may carry one Maintenance task; a
Service item without one (an alternator, a dent) is history only and does
not move any Reminder.
_Avoid_: line, part, entry

**Maintenance task**:
A code from a fixed catalog of recurring work (`engine_oil`,
`brake_pads_front`, `tire_rotation`, …). Service items, Maintenance
schedules, and Reminders all speak in Maintenance tasks. A Maintenance
task is not a Service; it is what a Service item says it did.
_Avoid_: job, item type, category

**Maintenance schedule**:
The recommended interval (distance, time, or both) for each Maintenance
task on one brand, model, year range, and engine, with the sources it came
from. A schedule with no citable source is a general schedule and is
labeled as such; Seibi never presents a general schedule as the
manufacturer's.
_Avoid_: plan, program, manual

**Reminder**:
A due notice on a Vehicle for one Maintenance task, derived from its
Maintenance schedule, the last Service item for that task, the current
odometer, the Usage rate, and elapsed time. Derived Reminders are computed,
not stored; a Reminder the user writes by hand (a date and a note) is
stored. A Reminder is due when the distance or the time runs out, whichever
comes first. When the user has no Service for a task but remembers roughly
when it was last done (and maybe the odometer then), Seibi keeps that
remembered date on the Reminder; it is not a Service and has no Mileage
reading.
_Avoid_: alert, notice, notification

**Appointment**:
Future work planned on a Vehicle: a date, an optional Shop, and the
Maintenance tasks it is for. Completing an Appointment records a Service
with its Mileage reading; the Appointment is not itself a Service.
_Avoid_: booking, scheduled service, cita (in code)

**Routine**:
A trip the user repeats every week (to work, to school), with a distance
per trip and days per week. Routines let Seibi project Mileage before
there are enough Mileage readings.
_Avoid_: route, commute, habit

**Usage rate**:
How far a Vehicle travels per day, in its Odometer measure. Taken from
recent Mileage readings when there are at least two; otherwise from its
Routines; otherwise unknown, and Seibi asks. The Usage rate is a
projection, not a Mileage reading.
_Avoid_: average, pace, driving habit

**Mileage**:
A dated odometer reading for a Vehicle. Its date is a calendar day, not a
clock time. A Vehicle has many. A series of readings describes how much
the Vehicle is used — that usage is not an Estimate. A Mileage reading is
not a Service. A reading recorded with a Service may be any number
(backfill). A reading recorded on its own is always dated today and must
be strictly greater than the current odometer. With no current odometer,
any non-negative number is allowed. A wrong number is corrected by
changing that reading, not by deleting it. An edit may be any
non-negative number; the “strictly greater” rule is only for new
standalone inserts.
_Avoid_: odometer, distance, millage, last checked

**Current odometer**:
The Mileage reading on a Vehicle for the latest calendar date; if several
share that date, the highest number. A Vehicle with no readings has no
current odometer.
_Avoid_: last checked, cached mileage

**Odometer measure**:
Whether Mileage on a Vehicle is recorded in kilometers (`km`) or miles
(`mi`). Set on the Vehicle; every reading uses that measure.
_Avoid_: unit, units

**Estimate**:
A price range, in USD, for a Maintenance task, repair, or part on one
Vehicle in one city: parts, labor, and total, split by dealership and
independent Shop, with the sources it came from. An Estimate is never a
final price and says so.
_Avoid_: quote, budget, price

**Intro**:
The product demo a person sees the first time they open Seibi, before they
sign in. It does not create a Vehicle.
_Avoid_: setup, FTUE, walkthrough

**Onboarding**:
The first run after sign-in: a welcome, then questions grouped by
category that set the user's Knowledge level, country, city, and
Routines. A Vehicle is not required to finish it. The first Vehicle may be
created during Onboarding; creating one later is not Onboarding.
_Avoid_: setup, first-run, FTUE

**Knowledge level**:
How much the user knows about vehicle maintenance: `none`, `basic`,
`intermediate`, or `advanced`. Set in Onboarding, editable in the profile.
It changes wording, explanations, and how much detail a form shows; it
never changes the data Seibi records or the Reminders it computes.
_Avoid_: expertise, skill, experience

**Model render**:
The 3D model and 2D poster that show a Vehicle's brand, model, year, and
color. Generated once per combination and shared by every Vehicle that
matches. It is an illustration, not a photo of the user's Vehicle.
_Avoid_: avatar, photo, picture
