/**
 * The garage: every Vehicle the person owns with its readings, Services,
 * Routines, Reminders, Appointments, schedule and render, in one query
 * (`useGarage`). Vehicle, Service, Mileage, Reminder, Routine and Appointment
 * screens all read it, and every write to them invalidates it.
 */
export const garageKeys = {
  all: ['garage'] as const,
  user: (userId: string) => ['garage', userId] as const,
};
