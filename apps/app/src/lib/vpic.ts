import { useQuery } from '@tanstack/react-query'

// NHTSA vPIC: free, CORS-enabled catalog of makes and models by year. It
// covers the U.S. market; models sold only in Latin America (Hilux, NP300)
// are typed by hand.

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

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
]

function titleCase(value: string) {
  if (value.length <= 3) return value.toUpperCase()
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

async function fetchMakes(): Promise<string[]> {
  const types = ['car', 'truck', 'multipurpose passenger vehicle (mpv)']
  const lists = await Promise.all(
    types.map(async (t) => {
      const res = await fetch(`${BASE}/GetMakesForVehicleType/${encodeURIComponent(t)}?format=json`)
      if (!res.ok) throw new Error(`vpic ${res.status}`)
      const body = (await res.json()) as { Results: Array<{ MakeName: string }> }
      return body.Results.map((r) => titleCase(r.MakeName.trim()))
    }),
  )
  return [...new Set([...POPULAR_BRANDS, ...lists.flat()])].sort((a, b) => a.localeCompare(b, 'es'))
}

export function useMakes(enabled: boolean) {
  return useQuery({
    queryKey: ['vpic', 'makes'],
    queryFn: fetchMakes,
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
  })
}

async function fetchModels(make: string, year: number): Promise<string[]> {
  const res = await fetch(
    `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`,
  )
  if (!res.ok) throw new Error(`vpic ${res.status}`)
  const body = (await res.json()) as { Results: Array<{ Model_Name: string }> }
  return [...new Set(body.Results.map((r) => r.Model_Name.trim()))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
}

export function useModels(make: string, year: number | null) {
  return useQuery({
    queryKey: ['vpic', 'models', make.toLowerCase(), year],
    queryFn: () => fetchModels(make, year!),
    enabled: make.trim().length > 1 && year != null,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
  })
}

export function yearOptions() {
  const max = new Date().getFullYear() + 1
  return Array.from({ length: max - 1979 }, (_, i) => max - i)
}
