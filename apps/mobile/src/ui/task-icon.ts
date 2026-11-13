import type { IconName } from './icon';

/** Each Maintenance task's icon, from the PWA's `taskIcon` (apps/app/src/lib/tasks.ts). */
const TASK_ICONS: Record<string, IconName> = {
  engine_oil: 'engineOil',
  oil_filter: 'oilFilter',
  air_filter: 'airFilter',
  cabin_filter: 'cabinFilter',
  fuel_filter: 'fuelFilter',
  spark_plugs: 'sparkPlugs',
  brake_inspection: 'brakeInspection',
  brake_pads_front: 'brakePads',
  brake_pads_rear: 'brakePads',
  brake_fluid: 'fluid',
  coolant: 'coolant',
  transmission_fluid: 'transmission',
  differential_fluid: 'transmission',
  power_steering_fluid: 'fluid',
  timing_belt: 'timingBelt',
  drive_belt: 'driveBelt',
  tire_rotation: 'tireRotation',
  wheel_alignment: 'alignment',
  tires: 'tires',
  battery: 'battery',
  wiper_blades: 'wipers',
  ac_service: 'airConditioning',
  suspension_inspection: 'suspension',
  general_inspection: 'inspection',
};

/** A line with no task (a part or job of the person's own) is a wrench; an unknown task, a refresh. */
export function taskIcon(code: string | null | undefined): IconName {
  if (!code) return 'service';
  return TASK_ICONS[code] ?? 'refresh';
}
