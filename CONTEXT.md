# Seibi

Seibi tracks vehicle maintenance: work done on a Vehicle, when the next
Service is due, and what that work might cost.

## Language

**Vehicle**:
An automobile owned by a user. Every Service, Reminder, and Mileage reading
belongs to exactly one Vehicle. A Plate is optional. Mileage on a Vehicle
uses one odometer measure.
_Avoid_: auto, car, unit

**Plate**:
The registration identifier on a Vehicle. Optional; two Vehicles may share
brand, model, and year.
_Avoid_: placa, license

**Service**:
A dated record of work done on a Vehicle. Every Service is recorded with
a Mileage reading. A Mileage reading is not a Service.
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
A dated odometer reading for a Vehicle. A Vehicle has many; the latest is
the current odometer. A series of readings describes how much the Vehicle
is used — that usage is not an Estimate. A Mileage reading is not a Service.
_Avoid_: odometer, distance, millage

**Odometer measure**:
Whether Mileage on a Vehicle is recorded in kilometers (`km`) or miles
(`mi`). Set on the Vehicle; every reading uses that measure.
_Avoid_: unit, units

**Estimate**:
The projected cost of an upcoming Service.
_Avoid_: quote, budget, price
