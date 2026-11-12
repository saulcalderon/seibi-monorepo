import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { MaintenanceTask } from './catalog';
import { taskKeys } from './keys';

async function fetchTasks(): Promise<MaintenanceTask[]> {
  const { data, error } = await supabase.from('maintenance_tasks').select('*').order('sort_order');
  if (error) throw error;
  return (data ?? []).map((t) => ({
    code: t.code,
    name: t.name,
    plainName: t.plain_name,
    description: t.description,
    sortOrder: t.sort_order,
    generalDistanceKm: t.general_distance_km,
    generalMonths: t.general_months,
  }));
}

/** The fixed Maintenance task catalog. Changes only with a migration, so it never goes stale. */
export function useTasks() {
  return useQuery({
    queryKey: taskKeys.catalog,
    queryFn: fetchTasks,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
