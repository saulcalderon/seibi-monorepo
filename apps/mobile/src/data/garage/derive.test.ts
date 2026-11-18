import { describe, expect, it } from 'vitest';

import { deriveVehicle, splitGarage } from './derive';
import type { VehicleRecord } from './types';

const TODAY = '2026-11-12';

function vehicle(overrides: Partial<VehicleRecord> = {}): VehicleRecord {
  return {
    id: 'v1',
    brand: 'Toyota',
    model: 'Yaris',
    year: 2015,
    plate: null,
    engine: null,
    trimLevel: null,
    color: 'black',
    bodyType: 'hatchback',
    measure: 'km',
    withdrawnAt: null,
    createdAt: '2026-11-01T00:00:00Z',
    readings: [],
    services: [],
    routines: [],
    states: [],
    manualReminders: [],
    appointments: [],
    schedule: null,
    render: null,
    ...overrides,
  };
}

describe('the current odometer shown for a Vehicle', () => {
  it('is the reading for the latest calendar date, then the highest number', () => {
    const view = deriveVehicle(
      vehicle({
        readings: [
          { id: 'a', reading: 50000, recordedOn: '2026-01-01' },
          { id: 'b', reading: 48000, recordedOn: '2026-02-01' },
          { id: 'c', reading: 48500, recordedOn: '2026-02-01' },
        ],
      }),
      [],
      TODAY,
    );
    expect(view.odometer).toBe(48500);
    expect(view.odometerOn).toBe('2026-02-01');
  });

  it('does not exist without readings', () => {
    const view = deriveVehicle(vehicle(), [], TODAY);
    expect(view.odometer).toBeNull();
    expect(view.odometerOn).toBeNull();
  });
});

describe('the garage', () => {
  it('lists withdrawn Vehicles apart, only while they can be restored (30 days)', () => {
    const now = Date.parse('2026-11-12T12:00:00Z');
    const { vehicles, withdrawn } = splitGarage(
      [
        vehicle({ id: 'active' }),
        vehicle({ id: 'recent', withdrawnAt: '2026-11-01T12:00:00Z' }),
        vehicle({ id: 'gone', withdrawnAt: '2026-10-01T12:00:00Z' }),
      ],
      [],
      TODAY,
      now,
    );
    expect(vehicles.map((v) => v.id)).toEqual(['active']);
    expect(withdrawn.map((v) => v.id)).toEqual(['recent']);
  });
});

describe('the upcoming Appointments of a Vehicle', () => {
  const appointment = (id: string, scheduledOn: string, extra: { serviceId?: string; canceledAt?: string } = {}) => ({
    id,
    scheduledOn,
    shop: null,
    notes: null,
    taskCodes: [],
    serviceId: extra.serviceId ?? null,
    canceledAt: extra.canceledAt ?? null,
  });

  it('are today on, soonest first, without the canceled or completed ones', () => {
    const view = deriveVehicle(
      vehicle({
        appointments: [
          appointment('later', '2026-12-01'),
          appointment('past', '2026-11-11'),
          appointment('today', TODAY),
          appointment('canceled', '2026-11-20', { canceledAt: '2026-11-12T10:00:00Z' }),
          appointment('done', '2026-11-13', { serviceId: 's1' }),
          appointment('soon', '2026-11-14'),
        ],
      }),
      [],
      TODAY,
    );
    expect(view.upcomingAppointments.map((a) => a.id)).toEqual(['today', 'soon', 'later']);
  });
});
