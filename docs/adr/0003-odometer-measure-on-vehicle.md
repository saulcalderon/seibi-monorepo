# Odometer measure lives on the Vehicle

A Vehicle’s dash shows either kilometers or miles. We persist that as
`odometer_measure` (`km` | `mi`) on the Vehicle, default `km`, and every
Mileage reading for that Vehicle uses it. We do not store a per-reading
measure, a user-wide measure, or a canonical-km value with display
conversion — the number on the dash is the source of truth. Changing
measure later is a later ticket; history is not silently converted.
