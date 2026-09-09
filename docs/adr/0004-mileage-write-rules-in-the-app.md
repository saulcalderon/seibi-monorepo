# Mileage write rules live in the app, not Postgres

A Service-linked Mileage reading may be any number (backfill). A
standalone reading must be strictly greater than the current odometer and
is always dated today. Editing a reading may set any non-negative number;
the “strictly greater” rule is only for new standalone inserts.

We do not enforce that split in the schema. A Service is written as the
reading first, then the Service row — at insert time Postgres cannot tell
a backfill from an odometer update. A trigger on `mileage_readings` insert
alone would reject the backfill this rule allows. SEI-8 and SEI-9 apply
the rule.

**Later (schema enforcement):** a `kind` on the reading (`service` |
`odometer_update`), or a deferrable constraint at commit that requires
“strictly greater” only when no Service points at the row. Pick one when
we want the database to own the rule; do not add the naive insert trigger.
