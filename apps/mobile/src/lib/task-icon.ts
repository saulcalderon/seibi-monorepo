import type { IconName } from '@/ui/icon';

/** Each Maintenance task's icon, as the PWA's `taskIcon` (apps/app/src/lib/tasks.ts). */
const ICONS: Record<string, IconName> = {
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

/** A task's icon: a wrench for no task, the refresh arrows for a code the app doesn't know (as the PWA). */
export function taskIcon(code: string | null | undefined): IconName {
  if (!code) return 'service';
  return ICONS[code] ?? 'refresh';
}
