// Where a link from outside the app opens (src/app/+native-intent.tsx).
// After Paradero's src/app/+native-intent.tsx (MIT).

/** `vehicle/<id>`, with or without a scheme or a leading slash, then an optional query or fragment. */
const VEHICLE = /^\/vehicle\/([^/?#]+)\/?(?:[?#].*)?$/;

/**
 * A link to a Vehicle opens inside Mi flota, so its detail has the fleet
 * list under it and a back button. `vehicle/<id>` exists in all three tabs;
 * without this the router would pick one by itself. Anything else: `null`.
 */
export function vehicleLinkTarget(path: string): string | null {
  const at = `/${path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')}`.replace(/^\/+/, '/');
  const match = VEHICLE.exec(at);
  return match ? `/(app)/(tabs)/(fleet)/vehicle/${match[1]}` : null;
}
