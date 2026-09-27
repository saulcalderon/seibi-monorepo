import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from './authSession'
import { invokeFunction } from './functions'
import { supabase } from './supabase'

export type UsdRange = { min: number; max: number } | null

export type EstimateResult = {
  found: boolean
  title: string
  summary: string
  parts_economy: UsdRange
  parts_oem: UsdRange
  labor: UsdRange
  total_independent: UsdRange
  total_dealership: UsdRange
  includes: string[]
  factors: string[]
  confidence: 'low' | 'medium' | 'high'
  sources: Array<{ title: string; url: string }>
}

export type Estimate = {
  id: string
  query: string
  taskCode: string | null
  city: string
  country: 'SV' | 'US'
  createdAt: string
  vehicleId: string | null
  result: EstimateResult
}

export function estimatesQueryKey(userId: string) {
  return ['estimates', userId] as const
}

export function useEstimateHistory() {
  const { user } = useAuthSession()
  return useQuery({
    queryKey: estimatesQueryKey(user?.id ?? 'signed-out'),
    enabled: Boolean(user),
    queryFn: async (): Promise<Estimate[]> => {
      const { data, error } = await supabase
        .from('estimate_requests')
        .select('id, vehicle_id, created_at, estimate:estimates(id, query, task_code, city, country, created_at, result)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      const seen = new Set<string>()
      const out: Estimate[] = []
      for (const row of data ?? []) {
        const e = row.estimate as unknown as {
          id: string
          query: string
          task_code: string | null
          city: string
          country: 'SV' | 'US'
          created_at: string
          result: EstimateResult
        } | null
        if (!e || seen.has(`${e.id}:${row.vehicle_id}`)) continue
        seen.add(`${e.id}:${row.vehicle_id}`)
        out.push({
          id: e.id,
          query: e.query,
          taskCode: e.task_code,
          city: e.city,
          country: e.country,
          createdAt: row.created_at,
          vehicleId: row.vehicle_id,
          result: e.result,
        })
      }
      return out
    },
  })
}

export function useRequestEstimate() {
  const { user } = useAuthSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { vehicleId: string; taskCode?: string | null; query?: string | null }) =>
      invokeFunction<Omit<Estimate, 'vehicleId'>>('estimates', input),
    onSuccess: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: estimatesQueryKey(user.id) })
    },
  })
}
