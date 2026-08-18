import {
  formatVehicleLabel,
  oilKmRemaining,
  vehicleNeedsService,
  type VehicleProfile,
} from './vehicleProfile'

export type ReminderTone = 'danger' | 'warn' | 'ok'

export type ReminderItem = {
  id: string
  name: string
  meta: string
  due: string
  tone: ReminderTone
}

const TONE_ORDER: Record<ReminderTone, number> = {
  danger: 0,
  warn: 1,
  ok: 2,
}

function oilTone(needsService: boolean, kmLeft: number): ReminderTone {
  if (needsService) return 'danger'
  if (kmLeft <= 1_500) return 'warn'
  return 'ok'
}

function timeTone(daysLeft: number): ReminderTone {
  if (daysLeft <= 7) return 'danger'
  if (daysLeft <= 30) return 'warn'
  return 'ok'
}

function formatKmLeft(km: number) {
  return km.toLocaleString('es-MX')
}

/** Most urgent upcoming maintenance for the active Vehículo (preview strip). */
export function upcomingMaintenanceForVehicle(
  vehicle: VehicleProfile | null,
  limit = 2,
): ReminderItem[] {
  const items = remindersForVehicle(vehicle)
  const soon = items.filter((item) => item.tone === 'danger' || item.tone === 'warn')
  const pool = soon.length > 0 ? soon : items
  return pool.slice(0, limit)
}

/** Preview Recordatorios for the active Vehículo until real data exists. */
export function remindersForVehicle(vehicle: VehicleProfile | null): ReminderItem[] {
  if (!vehicle) {
    return [
      {
        id: 'oil',
        name: 'Cambio de aceite',
        meta: 'Cada 5,000 km',
        due: 'Quedan 320 km',
        tone: 'warn',
      },
      {
        id: 'brakes',
        name: 'Revisión de frenos',
        meta: 'Cada 12 meses',
        due: 'En 18 días',
        tone: 'warn',
      },
      {
        id: 'tires',
        name: 'Rotación de llantas',
        meta: 'Cada 10,000 km',
        due: 'Quedan 4,200 km',
        tone: 'ok',
      },
    ]
  }

  const km = Number(vehicle.mileage.replace(/,/g, '')) || 0
  const needsService = vehicleNeedsService(vehicle)
  const oilLeft = oilKmRemaining(vehicle.mileage)
  const brakeDays = 12 + (km % 40)
  const tireLeft = 10_000 - (km % 10_000)
  const alignDays = 40 + (km % 50)
  const filterLeft = 8_000 - (km % 8_000)
  const coolantDays = 90 + (km % 60)
  const sparkLeft = 20_000 - (km % 20_000)
  const batteryDays = 120 + (km % 80)

  const items: ReminderItem[] = [
    {
      id: 'oil',
      name: 'Cambio de aceite',
      meta: 'Cada 5,000 km',
      due: needsService
        ? 'Vencido · haz el cambio de aceite'
        : `Quedan ${formatKmLeft(oilLeft)} km`,
      tone: oilTone(needsService, oilLeft),
    },
    {
      id: 'brakes',
      name: 'Revisión de frenos',
      meta: 'Cada 12 meses',
      due: `En ${brakeDays} días`,
      tone: timeTone(brakeDays),
    },
    {
      id: 'tires',
      name: 'Rotación de llantas',
      meta: 'Cada 10,000 km',
      due: `Quedan ${formatKmLeft(tireLeft)} km`,
      tone: oilTone(false, tireLeft),
    },
    {
      id: 'alignment',
      name: 'Alineación y balanceo',
      meta: 'Cada 12 meses',
      due: `En ${alignDays} días`,
      tone: timeTone(alignDays),
    },
    {
      id: 'air-filter',
      name: 'Filtro de aire',
      meta: 'Cada 15,000 km',
      due: `Quedan ${formatKmLeft(filterLeft)} km`,
      tone: oilTone(false, filterLeft),
    },
    {
      id: 'coolant',
      name: 'Refrigerante',
      meta: 'Cada 24 meses',
      due: `En ${coolantDays} días`,
      tone: timeTone(coolantDays),
    },
    {
      id: 'spark',
      name: 'Cambio de bujías',
      meta: 'Cada 40,000 km',
      due: `Quedan ${formatKmLeft(sparkLeft)} km`,
      tone: oilTone(false, sparkLeft),
    },
    {
      id: 'battery',
      name: 'Revisión de batería',
      meta: 'Cada 24 meses',
      due: `En ${batteryDays} días`,
      tone: timeTone(batteryDays),
    },
  ]

  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}

export function reminderVehicleLabel(vehicle: VehicleProfile | null) {
  return vehicle ? formatVehicleLabel(vehicle) : null
}
