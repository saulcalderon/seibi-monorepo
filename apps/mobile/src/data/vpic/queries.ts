import { useQuery } from '@tanstack/react-query';

import { parseResponse, RequestError } from '../errors';

import { vpicKeys } from './keys';
import { makeNames, makesResponse, modelNames, modelsResponse } from './schemas';

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const DAY_MS = 24 * 60 * 60_000;
/** vPIC's vehicle types that cover cars, pickups and SUVs. */
const VEHICLE_TYPES = ['car', 'truck', 'multipurpose passenger vehicle (mpv)'];

async function getJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new RequestError('network');
  }
  if (!response.ok) throw new RequestError('unknown', response.status);
  return response.json().catch(() => null);
}

async function fetchMakes(): Promise<string[]> {
  const lists = await Promise.all(
    VEHICLE_TYPES.map(async (type) =>
      parseResponse('vpic', makesResponse, await getJson(`${BASE}/GetMakesForVehicleType/${encodeURIComponent(type)}?format=json`)),
    ),
  );
  return makeNames(lists);
}

async function fetchModels(make: string, year: number): Promise<string[]> {
  const url = `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make.trim())}/modelyear/${year}?format=json`;
  return modelNames(parseResponse('vpic', modelsResponse, await getJson(url)));
}

/** Every brand for the Vehicle form, the popular ones included. Fetched once, kept a day. */
export function useMakes(enabled: boolean) {
  return useQuery({
    queryKey: vpicKeys.makes(),
    queryFn: fetchMakes,
    enabled,
    staleTime: Infinity,
    gcTime: DAY_MS,
    retry: 1,
  });
}

/** A brand's models for one year, once the person has typed the brand and picked the year. */
export function useModels(make: string, year: number | null) {
  return useQuery({
    queryKey: vpicKeys.models(make, year ?? 0),
    queryFn: () => fetchModels(make, year!),
    enabled: make.trim().length > 1 && year != null,
    staleTime: Infinity,
    gcTime: DAY_MS,
    retry: 1,
  });
}

/** Model years for the Vehicle form, newest first, back to 1980. */
export function yearOptions(now = new Date()) {
  const max = now.getFullYear() + 1;
  return Array.from({ length: max - 1979 }, (_, i) => max - i);
}
