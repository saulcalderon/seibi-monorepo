import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { invokeFunction } from '../functions';
import { useUserId } from '../user';

import { estimateKeys } from './keys';
import { estimateResponse, estimateResult, type EstimateResult } from './schemas';

export type Estimate = {
  id: string;
  query: string;
  taskCode: string | null;
  city: string;
  country: 'SV' | 'US';
  createdAt: string;
  vehicleId: string | null;
  result: EstimateResult;
};

/** How many past queries Estimados lists. */
const HISTORY_LIMIT = 20;

async function fetchHistory(): Promise<Estimate[]> {
  const { data, error } = await supabase
    .from('estimate_requests')
    .select('id, vehicle_id, created_at, estimate:estimates(id, query, task_code, city, country, created_at, result)')
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  const seen = new Set<string>();
  const out: Estimate[] = [];
  for (const row of data ?? []) {
    const e = Array.isArray(row.estimate) ? row.estimate[0] : row.estimate;
    if (!e || seen.has(`${e.id}:${row.vehicle_id}`)) continue;
    // `result` is JSON the Edge Function wrote: a row that doesn't parse is left out, not shown broken.
    const result = estimateResult.safeParse(e.result);
    if (!result.success) continue;
    seen.add(`${e.id}:${row.vehicle_id}`);
    out.push({
      id: e.id,
      query: e.query,
      taskCode: e.task_code,
      city: e.city,
      country: e.country,
      createdAt: row.created_at,
      vehicleId: row.vehicle_id,
      result: result.data,
    });
  }
  return out;
}

/** The person's past Estimates, newest first, once per Estimate and Vehicle. */
export function useEstimateHistory() {
  const userId = useUserId();
  return useQuery({
    queryKey: estimateKeys.user(userId ?? 'signed-out'),
    queryFn: fetchHistory,
    enabled: userId !== null,
  });
}

/** Asks the `estimates` Edge Function for a price range (a Maintenance task or free text). */
export function useRequestEstimate() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: string; taskCode?: string | null; query?: string | null }) =>
      invokeFunction('estimates', input, estimateResponse),
    onSuccess: () => {
      if (userId) return queryClient.invalidateQueries({ queryKey: estimateKeys.user(userId) });
    },
  });
}
