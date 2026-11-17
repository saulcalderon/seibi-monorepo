// Text matching for Mi flota's search and the Vehicle form's pickers, as the
// PWA does it (apps/app/src/screens/Fleet.tsx, ui/Combobox.tsx): accents and
// capitals don't matter, and every typed word must appear.

/** Lower case without accents: «Peugeot 208» and «peugeót» compare equal. */
export function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export type SearchableVehicle = {
  brand: string;
  model: string;
  year: number;
  plate: string | null;
  trimLevel: string | null;
};

/**
 * Whether a Vehicle matches what was typed in Mi flota's search: every word
 * must be somewhere in its brand, model, year, Plate or trim. A Plate also
 * matches without its dashes («P123456» finds «P123-456»).
 */
export function matchesVehicle(vehicle: SearchableVehicle, query: string) {
  const needle = fold(query.trim());
  if (!needle) return true;
  const plate = vehicle.plate ?? '';
  const hay = fold([vehicle.brand, vehicle.model, vehicle.year, plate, plate.replace(/-/g, ''), vehicle.trimLevel ?? ''].join(' '));
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

/**
 * The options that contain what was typed, those that start with it first
 * (the PWA's Combobox). An empty query keeps every option in its order.
 */
export function filterOptions(options: readonly string[], query: string): string[] {
  const needle = fold(query.trim());
  if (!needle) return [...options];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const option of options) {
    const folded = fold(option);
    if (folded.startsWith(needle)) starts.push(option);
    else if (folded.includes(needle)) contains.push(option);
  }
  return [...starts, ...contains];
}

/** The option that is what was typed, ignoring accents and capitals, if there is one. */
export function exactOption(options: readonly string[], query: string): string | null {
  const needle = fold(query.trim());
  if (!needle) return null;
  return options.find((option) => fold(option) === needle) ?? null;
}
