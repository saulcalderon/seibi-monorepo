// The fixed Maintenance task catalog (`maintenance_tasks`): codes, names and
// general intervals. Changes only with a migration. The icons per task come
// with the UI kit's icon map (SEI-54).

export type MaintenanceTask = {
  code: string;
  name: string;
  plainName: string;
  description: string;
  sortOrder: number;
  generalDistanceKm: number | null;
  generalMonths: number | null;
};

export function taskMap(tasks: readonly MaintenanceTask[] | undefined) {
  return new Map((tasks ?? []).map((t) => [t.code, t]));
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
];

/** Pending tasks first, then the common ones, then the rest of the catalog. */
export function orderedTaskCodes(pending: readonly string[], tasks: readonly MaintenanceTask[]) {
  const all = tasks.map((t) => t.code);
  return [...pending, ...COMMON_TASKS, ...all].filter((c, i, list) => list.indexOf(c) === i && all.includes(c));
}
