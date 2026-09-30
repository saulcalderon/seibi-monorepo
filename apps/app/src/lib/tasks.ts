import { useQuery } from '@tanstack/react-query'
import {
  AirVent,
  ArrowDownUp,
  BatteryMedium,
  Cable,
  CircleDot,
  ClipboardCheck,
  CloudRain,
  Cog,
  Crosshair,
  Disc3,
  Droplet,
  Droplets,
  Filter,
  Fuel,
  RefreshCw,
  RotateCw,
  ScanSearch,
  Snowflake,
  Thermometer,
  Timer,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from './supabase'

export type MaintenanceTask = {
  code: string
  name: string
  plainName: string
  description: string
  sortOrder: number
  generalDistanceKm: number | null
  generalMonths: number | null
}

export const TASKS_QUERY_KEY = ['maintenance-tasks'] as const

async function fetchTasks(): Promise<MaintenanceTask[]> {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((t) => ({
    code: t.code,
    name: t.name,
    plainName: t.plain_name,
    description: t.description,
    sortOrder: t.sort_order,
    generalDistanceKm: t.general_distance_km,
    generalMonths: t.general_months,
  }))
}

/** The fixed Maintenance task catalog. Changes only with a migration. */
export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function taskMap(tasks: readonly MaintenanceTask[] | undefined) {
  return new Map((tasks ?? []).map((t) => [t.code, t]))
}

const ICONS: Record<string, LucideIcon> = {
  engine_oil: Droplet,
  oil_filter: Filter,
  air_filter: Wind,
  cabin_filter: AirVent,
  fuel_filter: Fuel,
  spark_plugs: Zap,
  brake_inspection: ScanSearch,
  brake_pads_front: Disc3,
  brake_pads_rear: Disc3,
  brake_fluid: Droplets,
  coolant: Thermometer,
  transmission_fluid: Cog,
  differential_fluid: Cog,
  power_steering_fluid: Droplets,
  timing_belt: Timer,
  drive_belt: Cable,
  tire_rotation: RotateCw,
  wheel_alignment: Crosshair,
  tires: CircleDot,
  battery: BatteryMedium,
  wiper_blades: CloudRain,
  ac_service: Snowflake,
  suspension_inspection: ArrowDownUp,
  general_inspection: ClipboardCheck,
}

export function taskIcon(code: string | null | undefined): LucideIcon {
  if (!code) return Wrench
  return ICONS[code] ?? RefreshCw
}

/** The tasks people log most, shown first in pickers. */
export const COMMON_TASKS = [
  'engine_oil',
  'oil_filter',
  'tire_rotation',
  'wheel_alignment',
  'brake_pads_front',
  'battery',
  'air_filter',
  'cabin_filter',
  'tires',
  'spark_plugs',
  'coolant',
  'brake_fluid',
  'ac_service',
  'general_inspection',
]

/** Pending tasks first, then the common ones, then the rest of the catalog. */
export function orderedTaskCodes(pending: readonly string[], tasks: readonly MaintenanceTask[]) {
  const all = tasks.map((t) => t.code)
  return [...pending, ...COMMON_TASKS, ...all].filter(
    (c, i, list) => list.indexOf(c) === i && all.includes(c),
  )
}
