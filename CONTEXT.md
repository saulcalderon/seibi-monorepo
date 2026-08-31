# Seibi

Seibi tracks vehicle maintenance: work done on a Vehicle, when the next
Service is due, and what that work might cost.

## Language

**Vehicle**:
An automobile owned by a user. Every Service, Reminder, and Mileage reading
belongs to exactly one Vehicle. A Plate is optional. Mileage on a Vehicle
uses one odometer measure. A Vehicle may have no Mileage readings yet. A
Vehicle can be withdrawn from the garage without destroying its Services
or Mileage readings. A withdrawn Vehicle can be restored.
_Avoid_: auto, car, unit

**Plate**:
The registration identifier on a Vehicle. Optional and not unique; two
Vehicles may share a Plate, or share brand, model, and year.
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

**Reminder**:
A due notice on a Vehicle, based on Mileage or elapsed time.
_Avoid_: alert, notice, notification

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
The projected cost of an upcoming Service.
_Avoid_: quote, budget, price
