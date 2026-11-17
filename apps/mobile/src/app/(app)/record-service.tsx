import { useLocalSearchParams } from 'expo-router';

import { ServiceForm } from '@/service/service-form';

/**
 * Record or edit a Service (S7), as a form sheet over the tabs. Params:
 * - none: the [+] → «Registrar un Servicio», on the active Vehicle;
 * - `vehicleId`: record on that Vehicle (the Vehicle detail);
 * - `serviceId`: edit that Service, which also offers to withdraw it;
 * - `tasks`: Maintenance task codes, comma-separated, to start with a line each.
 */
export default function RecordServiceSheet() {
  const { vehicleId, serviceId, tasks } = useLocalSearchParams<{ vehicleId?: string; serviceId?: string; tasks?: string }>();
  return <ServiceForm vehicleId={vehicleId} serviceId={serviceId} taskCodes={tasks ? tasks.split(',').filter(Boolean) : undefined} />;
}
