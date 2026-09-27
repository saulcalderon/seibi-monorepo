# Dock: Inicio, Mi flota, quick action, Avisos, Estimados

## Status

accepted — updates the tab note in ADR-0002

## Decision

The floating dock is **Inicio · Mi flota · [+] · Avisos · Estimados**. The
center [+] opens quick actions: record a Service, update Mileage, plan an
Appointment. Service history (Servicios) moves into each Vehicle's detail.
Perfil opens from the avatar in the header.

## Context / why

The brief asks for a fleet that scales from one Vehicle to many and for
price Estimates. Service history is per Vehicle, so it belongs in the
Vehicle, not in a global tab. Avisos keeps its short label (ADR-0002).
