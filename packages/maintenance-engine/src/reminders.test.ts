import { describe, expect, it } from 'vitest'
import { addMonths, daysBetween } from './days.ts'
import { mileagePrompt } from './mileagePrompt.ts'
import { currentOdometer, isSevereUse, usageRate } from './odometer.ts'
import {
  computeReminders,
  effectiveSchedule,
  nextReminder,
  pendingCount,
  vehicleHealth,
  type TaskInterval,
} from './reminders.ts'

const OIL: TaskInterval = { taskCode: 'engine_oil', distanceKm: 5000, months: 6 }
const BATTERY: TaskInterval = { taskCode: 'battery', distanceKm: null, months: 36 }

describe('days', () => {
  it('adds months and clamps to the month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-08-15', 6)).toBe('2027-02-15')
  })
  it('counts calendar days', () => {
    expect(daysBetween('2026-01-01', '2026-03-01')).toBe(59)
  })
})

describe('currentOdometer (ADR-0005)', () => {
  it('uses the latest date, then the highest number', () => {
    expect(
      currentOdometer([
        { reading: 50000, recordedOn: '2026-01-01' },
        { reading: 48000, recordedOn: '2026-02-01' },
        { reading: 48500, recordedOn: '2026-02-01' },
      ]),
    ).toEqual({ reading: 48500, recordedOn: '2026-02-01' })
  })
  it('is null with no readings', () => {
    expect(currentOdometer([])).toBeNull()
  })
})

describe('usageRate', () => {
  it('comes from readings a week or more apart', () => {
    const rate = usageRate(
      [
        { reading: 10000, recordedOn: '2026-09-01' },
        { reading: 10400, recordedOn: '2026-09-21' },
      ],
      [],
      '2026-09-26',
    )
    expect(rate).toEqual({ perDay: 20, source: 'readings' })
  })
  it('falls back to Routines when readings are too close', () => {
    const rate = usageRate(
      [
        { reading: 10000, recordedOn: '2026-09-24' },
        { reading: 10050, recordedOn: '2026-09-26' },
      ],
      [{ roundTripDistance: 30, daysPerWeek: 5 }],
      '2026-09-26',
    )
    expect(rate?.source).toBe('routines')
    expect(rate?.perDay).toBeCloseTo(150 / 7)
  })
  it('ignores readings older than the usage window', () => {
    expect(
      usageRate(
        [
          { reading: 1000, recordedOn: '2025-01-01' },
          { reading: 9000, recordedOn: '2025-03-01' },
        ],
        [],
        '2026-09-26',
      ),
    ).toBeNull()
  })
  it('is null with nothing to go on', () => {
    expect(usageRate([], [], '2026-09-26')).toBeNull()
  })
})

describe('isSevereUse', () => {
  it('is severe for heavy daily use', () => {
    expect(isSevereUse({ perDay: 100, source: 'readings' }, [], 'km')).toBe(true)
  })
  it('is severe for mostly short trips', () => {
    expect(isSevereUse(null, [{ roundTripDistance: 8, daysPerWeek: 5 }], 'km')).toBe(true)
  })
  it('converts miles before comparing', () => {
    // 60 mi/day ≈ 97 km/day
    expect(isSevereUse({ perDay: 60, source: 'readings' }, [], 'mi')).toBe(true)
    expect(isSevereUse({ perDay: 40, source: 'readings' }, [], 'mi')).toBe(false)
  })
  it('is normal for ordinary commuting', () => {
    expect(
      isSevereUse({ perDay: 30, source: 'routines' }, [{ roundTripDistance: 40, daysPerWeek: 5 }], 'km'),
    ).toBe(false)
  })
})

describe('computeReminders', () => {
  const base = {
    measure: 'km' as const,
    schedule: [OIL, BATTERY],
    routines: [],
    today: '2026-09-26',
  }

  it('asks when there is no last Service for a task', () => {
    const { reminders } = computeReminders({
      ...base,
      readings: [{ reading: 40000, recordedOn: '2026-09-26' }],
      events: [],
    })
    expect(reminders.map((r) => [r.taskCode, r.status, r.unknownReason])).toEqual([
      ['engine_oil', 'unknown', 'ask'],
      ['battery', 'unknown', 'ask'],
    ])
  })

  it('records that the user does not know the last Service', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [],
      events: [],
      states: [{ taskCode: 'engine_oil', lastUnknown: true, snoozedUntil: null }],
    })
    expect(reminders[0].unknownReason).toBe('dont_know')
  })

  it('uses a remembered last time when there is no Service', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 40000, recordedOn: '2026-09-26' }],
      events: [],
      states: [{ taskCode: 'engine_oil', lastUnknown: false, snoozedUntil: null, rememberedOn: '2026-01-01' }],
    })
    expect(reminders[0].status).toBe('overdue')
    expect(reminders[0].lastDone).toEqual({ performedOn: '2026-01-01', reading: null, remembered: true })
    expect(reminders[0].remainingDistance).toBeNull()
  })

  it('prefers a recorded Service over a remembered date', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 40500, recordedOn: '2026-09-26' }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-09-01', reading: 40000 }],
      states: [{ taskCode: 'engine_oil', lastUnknown: false, snoozedUntil: null, rememberedOn: '2025-01-01' }],
    })
    expect(reminders[0].lastDone?.remembered).toBe(false)
    expect(reminders[0].status).toBe('ok')
  })

  it('is ok well inside both intervals', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [
        { reading: 40000, recordedOn: '2026-09-01' },
        { reading: 40500, recordedOn: '2026-09-26' },
      ],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-09-01', reading: 40000 }],
    })
    expect(reminders[0].status).toBe('ok')
    expect(reminders[0].remainingDistance).toBe(4500)
    expect(reminders[0].dueOn).toBe('2027-03-01')
  })

  it('is overdue by distance', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 45200, recordedOn: '2026-09-26' }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-08-01', reading: 40000 }],
    })
    expect(reminders[0].status).toBe('overdue')
    expect(reminders[0].remainingDistance).toBe(-200)
  })

  it('is overdue by time even with little distance', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 41000, recordedOn: '2026-09-26' }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-01-10', reading: 40000 }],
    })
    expect(reminders[0].status).toBe('overdue')
  })

  it('is soon within 10% of the distance interval', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 44600, recordedOn: '2026-09-26' }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-08-01', reading: 40000 }],
    })
    expect(reminders[0].status).toBe('soon')
  })

  it('is soon when the Usage rate reaches the distance within 30 days', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [
        { reading: 40000, recordedOn: '2026-08-27' },
        { reading: 43000, recordedOn: '2026-09-26' },
      ],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-08-27', reading: 40000 }],
    })
    // 100 km/day, 2,000 km left → 20 days.
    expect(reminders[0].status).toBe('soon')
    expect(reminders[0].remainingDays).toBe(20)
  })

  it('projects the odometer forward from the last reading', () => {
    const { odometer, reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 40000, recordedOn: '2026-09-16' }],
      routines: [{ roundTripDistance: 70, daysPerWeek: 7 }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-09-01', reading: 39000 }],
    })
    expect(odometer).toBe(40700)
    expect(reminders[0].remainingDistance).toBe(3300)
  })

  it('uses the severe interval for heavy use when the schedule has one', () => {
    const { reminders, severe } = computeReminders({
      ...base,
      schedule: [{ ...OIL, severeDistanceKm: 3000, severeMonths: 3 }],
      readings: [
        { reading: 40000, recordedOn: '2026-09-01' },
        { reading: 42500, recordedOn: '2026-09-26' },
      ],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-09-01', reading: 40000 }],
    })
    expect(severe).toBe(true)
    expect(reminders[0].severe).toBe(true)
    expect(reminders[0].interval).toEqual({ distance: 3000, months: 3 })
  })

  it('converts km intervals to miles for a Vehicle in miles', () => {
    const { reminders } = computeReminders({
      ...base,
      measure: 'mi',
      schedule: [OIL],
      readings: [{ reading: 30000, recordedOn: '2026-09-26' }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-09-01', reading: 29000 }],
    })
    expect(reminders[0].interval.distance).toBe(3107)
  })

  it('takes the latest Service for a task', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [OIL],
      readings: [{ reading: 46000, recordedOn: '2026-09-26' }],
      events: [
        { taskCode: 'engine_oil', performedOn: '2026-03-01', reading: 40000 },
        { taskCode: 'engine_oil', performedOn: '2026-09-10', reading: 45800 },
      ],
    })
    expect(reminders[0].lastDone?.performedOn).toBe('2026-09-10')
    expect(reminders[0].status).toBe('ok')
  })

  it('sorts overdue first and snoozed last', () => {
    const { reminders } = computeReminders({
      ...base,
      readings: [{ reading: 46000, recordedOn: '2026-09-26' }],
      events: [
        { taskCode: 'engine_oil', performedOn: '2026-08-01', reading: 40000 },
        { taskCode: 'battery', performedOn: '2023-01-01', reading: 10000 },
      ],
      states: [{ taskCode: 'battery', lastUnknown: false, snoozedUntil: '2026-10-10' }],
    })
    expect(reminders.map((r) => r.taskCode)).toEqual(['engine_oil', 'battery'])
    expect(reminders[1].snoozed).toBe(true)
  })

  it('skips tasks with no interval', () => {
    const { reminders } = computeReminders({
      ...base,
      schedule: [{ taskCode: 'tires', distanceKm: null, months: null }],
      readings: [],
      events: [],
    })
    expect(reminders).toEqual([])
  })
})

describe('vehicle summary', () => {
  const { reminders } = computeReminders({
    measure: 'km',
    schedule: [OIL, BATTERY],
    readings: [{ reading: 45200, recordedOn: '2026-09-26' }],
    events: [
      { taskCode: 'engine_oil', performedOn: '2026-08-01', reading: 40000 },
      { taskCode: 'battery', performedOn: '2025-01-01', reading: 20000 },
    ],
    routines: [],
    today: '2026-09-26',
  })

  it('health is the worst status', () => {
    expect(vehicleHealth(reminders)).toBe('overdue')
  })
  it('health is unknown with no Reminders', () => {
    expect(vehicleHealth([])).toBe('unknown')
  })
  it('health ignores tasks with no known last Service', () => {
    const { reminders: mixed } = computeReminders({
      measure: 'km',
      schedule: [OIL, BATTERY],
      readings: [{ reading: 41000, recordedOn: '2026-09-26' }],
      events: [{ taskCode: 'engine_oil', performedOn: '2026-09-01', reading: 40000 }],
      routines: [],
      today: '2026-09-26',
    })
    expect(mixed.find((r) => r.taskCode === 'battery')?.status).toBe('unknown')
    expect(vehicleHealth(mixed)).toBe('ok')
  })
  it('counts pending Reminders', () => {
    expect(pendingCount(reminders)).toBe(1)
  })
  it('picks the next Reminder', () => {
    expect(nextReminder(reminders)?.taskCode).toBe('engine_oil')
  })
})

describe('mileagePrompt', () => {
  it('asks when there are no readings', () => {
    expect(mileagePrompt([], null, 'km', '2026-09-26')).toEqual({
      due: true,
      reason: 'no_readings',
      daysSinceLast: null,
    })
  })
  it('asks every 14 days by default', () => {
    const readings = [{ reading: 1000, recordedOn: '2026-09-10' }]
    const usage = { perDay: 20, source: 'readings' as const }
    expect(mileagePrompt(readings, usage, 'km', '2026-09-23').due).toBe(false)
    expect(mileagePrompt(readings, usage, 'km', '2026-09-24')).toMatchObject({
      due: true,
      reason: 'stale',
    })
  })
  it('asks weekly for heavy use', () => {
    const readings = [{ reading: 1000, recordedOn: '2026-09-19' }]
    const usage = { perDay: 60, source: 'readings' as const }
    expect(mileagePrompt(readings, usage, 'km', '2026-09-26')).toMatchObject({ due: true })
  })
  it('asks for usage after a week with no rate', () => {
    const readings = [{ reading: 1000, recordedOn: '2026-09-19' }]
    expect(mileagePrompt(readings, null, 'km', '2026-09-26')).toMatchObject({
      due: true,
      reason: 'no_usage',
    })
  })
})

describe('effectiveSchedule', () => {
  const general = [
    { code: 'engine_oil', generalDistanceKm: 5000, generalMonths: 6 },
    { code: 'tire_rotation', generalDistanceKm: 10000, generalMonths: 6 },
    { code: 'tires', generalDistanceKm: null, generalMonths: null },
  ]
  it('uses the general schedule with no cited schedule', () => {
    expect(effectiveSchedule(null, general).map((i) => [i.taskCode, i.source])).toEqual([
      ['engine_oil', 'general'],
      ['tire_rotation', 'general'],
    ])
  })
  it('prefers the cited interval and fills gaps with general ones', () => {
    const merged = effectiveSchedule(
      [{ taskCode: 'engine_oil', distanceKm: 8000, months: 12 }],
      general,
    )
    expect(merged.map((i) => [i.taskCode, i.distanceKm, i.source])).toEqual([
      ['engine_oil', 8000, 'model'],
      ['tire_rotation', 10000, 'general'],
    ])
  })
})
