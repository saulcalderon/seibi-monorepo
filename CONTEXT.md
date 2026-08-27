# Seibi

Seibi tracks vehicle maintenance: work done on a Vehicle, when the next
Service is due, and what that work might cost.

## Language

**Vehicle**:
An automobile owned by a user. Every Service, Reminder, and Mileage reading
belongs to exactly one Vehicle.
_Avoid_: auto, car, unit

**Service**:
A dated record of work done on a Vehicle.
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
An odometer reading for a Vehicle.
_Avoid_: odometer, distance, millage

**Estimate**:
The projected cost of an upcoming Service.
_Avoid_: quote, budget, price
