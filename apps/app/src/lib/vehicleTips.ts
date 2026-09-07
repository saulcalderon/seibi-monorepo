import type { VehicleProfile } from './vehicleProfile'

export type VehicleTipKind =
  | 'curious'
  | 'common_fault'
  | 'engine_care'
  | 'long_trip'
  | 'weekly'

export type VehicleTip = {
  id: string
  kind: VehicleTipKind
  title: string
  body: string
}

function vehicleLabel(vehicle: VehicleProfile | null) {
  if (!vehicle) return 'tu vehículo'
  return `${vehicle.brand} ${vehicle.model}`.trim() || 'tu vehículo'
}

function hashSeed(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickRotated<T>(items: T[], seed: number, count: number): T[] {
  if (items.length === 0) return []
  const start = seed % items.length
  const result: T[] = []
  for (let i = 0; i < Math.min(count, items.length); i += 1) {
    result.push(items[(start + i) % items.length])
  }
  return result
}

/** Tips y cuidados orientados al Vehículo activo (no avisos de mantenimiento). */
export function tipsForVehicle(
  vehicle: VehicleProfile | null,
  limit = 4,
): VehicleTip[] {
  const label = vehicleLabel(vehicle)
  const brand = vehicle?.brand?.trim() || 'tu marca'
  const year = vehicle?.year ? String(vehicle.year) : null
  const daySeed = Math.floor(Date.now() / 86_400_000)
  const seed = hashSeed(`${vehicle?.id ?? 'none'}:${daySeed}`)

  const pool: VehicleTip[] = [
    {
      id: 'curious-oil',
      kind: 'curious',
      title: `Dato curioso de ${label}`,
      body: year
        ? `Un ${label} ${year} suele rendir mejor si el aceite se cambia antes de que el motor acumule suciedad fina en trayectos cortos.`
        : `En un ${label}, los trayectos cortos ensucian el aceite más rápido de lo que parece: conviene no alargar demasiado el intervalo.`,
    },
    {
      id: 'curious-tires',
      kind: 'curious',
      title: 'Presión y consumo',
      body: `Bajar 0.3 bar en las llantas de ${label} puede subir el consumo y el desgaste irregular. Revísalas en frío una vez a la semana.`,
    },
    {
      id: 'fault-brakes',
      kind: 'common_fault',
      title: 'Fallo común: frenos',
      body: `En ${brand}, un chirrido al frenar en frío suele ser pastilla gastada o disco vidriado. Si vibra el pedal, revisa discos antes de un viaje.`,
    },
    {
      id: 'fault-battery',
      kind: 'common_fault',
      title: 'Fallo común: batería',
      body: `Arranques lentos o luces que bajan al encender el aire en ${label} apuntan a batería débil. En clima caliente dura menos de lo esperado.`,
    },
    {
      id: 'fault-cooling',
      kind: 'common_fault',
      title: 'Fallo común: refrigerante',
      body: `Si el indicador de temperatura sube en tráfico, revisa nivel de refrigerante y fugas en mangueras. No abras el depósito en caliente.`,
    },
    {
      id: 'engine-oil',
      kind: 'engine_care',
      title: 'Alargar la vida del motor',
      body: `Usa el grado de aceite correcto y evita acelerones en frío. Los primeros 2–3 minutos, el motor de ${label} necesita lubricación completa.`,
    },
    {
      id: 'engine-idle',
      kind: 'engine_care',
      title: 'Cuidado del motor en vacío',
      body: `Dejar ${label} en ralentí mucho tiempo ensucia bujías y catalizador. Si esperas más de un minuto, apaga y vuelve a arrancar.`,
    },
    {
      id: 'engine-filter',
      kind: 'engine_care',
      title: 'Filtro de aire limpio',
      body: `Un filtro obstruido hace que ${label} gaste más y responda peor. Revísalo cada servicio o si circulas por polvo con frecuencia.`,
    },
    {
      id: 'trip-checklist',
      kind: 'long_trip',
      title: 'Antes de un viaje largo',
      body: `Revisa en ${label}: llantas (presión y desgaste), niveles (aceite, refrigerante, limpiaparabrisas), luces y escobillas. Lleva gato y reflejante.`,
    },
    {
      id: 'trip-brakes-cool',
      kind: 'long_trip',
      title: 'Frenos en carretera',
      body: `En bajadas largas, usa motor-freno (marcha corta) para no sobrecalentar pastillas. Si hueles a quemado, detente y deja enfriar.`,
    },
    {
      id: 'trip-load',
      kind: 'long_trip',
      title: 'Carga y presión',
      body: `Si vas cargado o con portaequipaje, sube un poco la presión según el manual de ${label} y revisa el estado de la llanta de refacción.`,
    },
    {
      id: 'weekly-wash-check',
      kind: 'weekly',
      title: 'Rutina semanal rápida',
      body: `En 5 minutos: presión de llantas, nivel de limpiaparabrisas, luces y ruidos raros al arrancar. Así atrapas fallos de ${label} a tiempo.`,
    },
    {
      id: 'weekly-fluid',
      kind: 'weekly',
      title: 'Niveles de la semana',
      body: `Mira aceite y refrigerante con el motor frío. Una baja constante sin charco visible puede ser microfuga: anótalo para el próximo servicio.`,
    },
    {
      id: 'weekly-cabin',
      kind: 'weekly',
      title: 'Habitáculo y visibilidad',
      body: `Limpia el parabrisas por dentro (empaña menos) y revisa que no haya testigos encendidos al arrancar ${label}.`,
    },
  ]

  return pickRotated(pool, seed, limit)
}
