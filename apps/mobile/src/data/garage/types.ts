// What the garage query returns, ported from the PWA's lib/garage.ts. A
// VehicleRecord is the stored data; a VehicleView adds what the shared
// engine derives from it (current odometer, Reminders, health).
import type { MileagePrompt } from '@seibi/maintenance-engine/mileage-prompt';
import type { OdometerMeasure, UsageRate } from '@seibi/maintenance-engine/odometer';
import type { Reminder, TaskInterval, VehicleHealth } from '@seibi/maintenance-engine/reminders';

import type { Database } from '@/lib/database.types';

export type BodyType = Database['public']['Enums']['body_type'];
export type ServiceType = Database['public']['Enums']['service_type'];

export type MileageRecord = { id: string; reading: number; recordedOn: string };

export type ServiceItem = {
  id: string;
  taskCode: string | null;
  name: string;
  cost: number | null;
  partBrand: string | null;
  partNumber: string | null;
};

export type ServiceRecord = {
  id: string;
  type: ServiceType;
  performedOn: string;
  shop: string | null;
  notes: string | null;
  totalCost: number | null;
  invoicePath: string | null;
  readingId: string;
  reading: number | null;
  items: ServiceItem[];
};

export type Appointment = {
  id: string;
  scheduledOn: string;
  shop: string | null;
  notes: string | null;
  taskCodes: string[];
  serviceId: string | null;
  canceledAt: string | null;
};

export type ManualReminder = {
  id: string;
  title: string;
  notes: string | null;
  dueOn: string;
  doneAt: string | null;
};

export type RoutineRecord = {
  id: string;
  name: string;
  roundTripDistance: number;
  daysPerWeek: number;
};

export type ReminderStateRecord = {
  taskCode: string;
  lastUnknown: boolean;
  snoozedUntil: string | null;
  rememberedOn: string | null;
  rememberedReading: number | null;
};

export type ScheduleSource = { title: string; url: string };

export type ScheduleInfo = {
  id: string;
  status: Database['public']['Enums']['schedule_status'];
  hasSevere: boolean;
  summary: string | null;
  sources: ScheduleSource[];
  items: TaskInterval[];
};

export type RenderInfo = {
  status: Database['public']['Enums']['render_status'];
  posterUrl: string | null;
  /** fal is still drawing the poster: the Vehicle shows its body-type silhouette. */
  generating: boolean;
};

export type VehicleRecord = {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string | null;
  engine: string | null;
  trimLevel: string | null;
  color: string | null;
  bodyType: BodyType | null;
  measure: OdometerMeasure;
  withdrawnAt: string | null;
  createdAt: string;
  readings: MileageRecord[];
  services: ServiceRecord[];
  routines: RoutineRecord[];
  states: ReminderStateRecord[];
  manualReminders: ManualReminder[];
  appointments: Appointment[];
  schedule: ScheduleInfo | null;
  render: RenderInfo | null;
};

export type VehicleView = VehicleRecord & {
  /** Current odometer (CONTEXT.md), not projected. */
  odometer: number | null;
  odometerOn: string | null;
  /** Odometer projected to today with the Usage rate. */
  projectedOdometer: number | null;
  usage: UsageRate | null;
  severe: boolean;
  reminders: Reminder[];
  health: VehicleHealth;
  next: Reminder | null;
  pending: number;
  mileagePrompt: MileagePrompt;
  /** Hand-written Reminders not done, soonest first. */
  openManualReminders: ManualReminder[];
  /** Appointments from today on, not canceled or completed. */
  upcomingAppointments: Appointment[];
  /** Whether Reminders run on a cited schedule for this model. */
  scheduleSource: 'model' | 'general' | 'pending';
};
