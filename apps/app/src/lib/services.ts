import {
  formatVehicleLabel,
  type VehicleProfile,
} from './vehicleProfile'

export type ServiceIcon = 'oil' | 'brakes' | 'tires' | 'filter' | 'battery' | 'alignment'

export type ServiceItem = {
  id: string
  name: string
  meta: string
  cost: string
  icon: ServiceIcon
}

function money(amount: number) {
  return `$${amount.toLocaleString('es-MX')}`
}

/** Preview Servicios for the active Vehículo until real data exists. */
export function servicesForVehicle(vehicle: VehicleProfile | null): ServiceItem[] {
  if (!vehicle) {
    return [
      {
        id: 'oil',
        name: 'Cambio de aceite',
        meta: '12 Mar, 10:20 AM',
        cost: '$850',
        icon: 'oil',
      },
      {
        id: 'brakes',
        name: 'Frenos delanteros',
        meta: '28 Feb, 04:15 PM',
        cost: '$2,400',
        icon: 'brakes',
      },
      {
        id: 'tires',
        name: 'Rotación de llantas',
        meta: '10 Ene, 11:40 AM',
        cost: '$650',
        icon: 'tires',
      },
      {
        id: 'filter',
        name: 'Filtro de aire',
        meta: '02 Dic, 03:10 PM',
        cost: '$480',
        icon: 'filter',
      },
      {
        id: 'alignment',
        name: 'Alineación',
        meta: '18 Nov, 09:45 AM',
        cost: '$900',
        icon: 'alignment',
      },
      {
        id: 'battery',
        name: 'Prueba de batería',
        meta: '05 Oct, 02:30 PM',
        cost: '$320',
        icon: 'battery',
      },
    ]
  }

  const km = Number(vehicle.mileage.replace(/,/g, '')) || 0
  const seed = km % 900

  return [
    {
      id: 'oil',
      name: 'Cambio de aceite',
      meta: '12 Mar, 10:20 AM',
      cost: money(850 + (seed % 120)),
      icon: 'oil',
    },
    {
      id: 'brakes',
      name: 'Frenos delanteros',
      meta: '28 Feb, 04:15 PM',
      cost: money(2_200 + (seed % 500)),
      icon: 'brakes',
    },
    {
      id: 'tires',
      name: 'Rotación de llantas',
      meta: '10 Ene, 11:40 AM',
      cost: money(600 + (seed % 90)),
      icon: 'tires',
    },
    {
      id: 'filter',
      name: 'Filtro de aire',
      meta: '02 Dic, 03:10 PM',
      cost: money(420 + (seed % 80)),
      icon: 'filter',
    },
    {
      id: 'alignment',
      name: 'Alineación',
      meta: '18 Nov, 09:45 AM',
      cost: money(850 + (seed % 150)),
      icon: 'alignment',
    },
    {
      id: 'battery',
      name: 'Prueba de batería',
      meta: '05 Oct, 02:30 PM',
      cost: money(280 + (seed % 60)),
      icon: 'battery',
    },
  ]
}

export function recentServicesForVehicle(
  vehicle: VehicleProfile | null,
  limit = 3,
): ServiceItem[] {
  return servicesForVehicle(vehicle).slice(0, limit)
}

export function serviceVehicleLabel(vehicle: VehicleProfile | null) {
  return vehicle ? formatVehicleLabel(vehicle) : null
}
