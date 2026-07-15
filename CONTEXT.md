# Seibi

Seibi is a mobile-first app for tracking vehicle maintenance: it records what work a
vehicle has had done, reminds the owner when the next work is due, and estimates what
that work will cost. The ubiquitous language is **Spanish** — canonical terms below are
Spanish, and code/UI should use them rather than English synonyms.

## Language

**Vehículo**:
A car owned by a user. The root entity everything else hangs off; every Servicio,
Recordatorio and Kilometraje reading belongs to exactly one Vehículo.
_Avoid_: auto, carro, unidad

**Servicio**:
A single dated entry logged against a Vehículo recording work that was done. This is the
core atomic record. It carries a `tipo` and an optional `taller`.
_Avoid_: registro, entrada, trabajo

**Tipo (de servicio)**:
The category of a Servicio — currently `mantenimiento` (planned, recurring work) or
`reparación` (unplanned fix). A `tipo` value, not a separate concept: "mantenimiento" and
"reparación" are kinds of Servicio, never their own tables.
_Avoid_: categoría, clase

**Taller**:
The place where a Servicio was performed. For now an optional free-text label on a
Servicio, **not** its own entity — promote to an entity only if shop history is needed.
_Avoid_: garaje, mecánico, tienda

**Recordatorio**:
An alert tied to a Vehículo that fires based on mileage (Kilometraje) or elapsed time,
telling the owner a Servicio is due.
_Avoid_: alerta, aviso, notificación

**Kilometraje**:
An odometer reading for a Vehículo. Drives mileage-based Recordatorios.
_Avoid_: millaje, odómetro, distancia

**Estimado**:
The projected cost of an upcoming Servicio, shown before the owner visits a Taller.
_Avoid_: cotización, presupuesto, precio

---

> **Note:** The domain model above is provisional and intentionally shallow — it captures
> only what was firmly agreed. The fuller domain-modeling session (relationships,
> lifecycle of Recordatorio/Estimado, whether Taller becomes an entity, DIY vs
> shop-logged work) is deferred to a dedicated grilling session. See the tracking issue.
