// NHTSA vPIC: a free catalog of makes and models by year. It covers the U.S.
// market; models sold only in Latin America (Hilux, NP300) are typed by hand.
// Its answers are checked with Zod before the Vehicle form reads them.
import { z } from 'zod';

/** Brands common in El Salvador and the U.S., shown before searching. */
export const POPULAR_BRANDS = [
  'Toyota',
  'Nissan',
  'Honda',
  'Hyundai',
  'Kia',
  'Mazda',
  'Chevrolet',
  'Ford',
  'Mitsubishi',
  'Suzuki',
  'Volkswagen',
  'Isuzu',
  'Jeep',
  'Subaru',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Lexus',
  'Dodge',
  'RAM',
  'GMC',
  'Tesla',
  'Volvo',
  'Peugeot',
  'Renault',
  'BYD',
  'Chery',
  'JAC',
  'Great Wall',
  'Geely',
];

/** `GetMakesForVehicleType/<type>`: only the fields Seibi reads. */
export const makesResponse = z.object({
  Results: z.array(z.object({ MakeName: z.string() })),
});

/** `GetModelsForMakeYear/make/<make>/modelyear/<year>`: only the fields Seibi reads. */
export const modelsResponse = z.object({
  Results: z.array(z.object({ Model_Name: z.string() })),
});

export type MakesResponse = z.infer<typeof makesResponse>;
export type ModelsResponse = z.infer<typeof modelsResponse>;

function titleCase(value: string) {
  if (value.length <= 3) return value.toUpperCase();
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

const spanish = (a: string, b: string) => a.localeCompare(b, 'es');

/**
 * Each name once, however it is capitalised («Kia» and vPIC's «KIA»): the
 * first spelling seen wins, so the popular brands keep theirs.
 */
function oncePerName(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.toLocaleLowerCase('es');
    if (name && !seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()];
}

/** The popular brands and every vPIC make, title-cased, once each (ignoring case), in Spanish order. */
export function makeNames(lists: MakesResponse[]): string[] {
  const fromVpic = lists.flatMap((list) => list.Results.map((r) => titleCase(r.MakeName.trim())));
  return oncePerName([...POPULAR_BRANDS, ...fromVpic]).sort(spanish);
}

/** A year's models, once each (ignoring case), in Spanish order. */
export function modelNames(body: ModelsResponse): string[] {
  return oncePerName(body.Results.map((r) => r.Model_Name.trim())).sort(spanish);
}
