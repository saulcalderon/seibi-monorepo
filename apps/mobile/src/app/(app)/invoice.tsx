import { useLocalSearchParams } from 'expo-router';

import { InvoiceViewer } from '@/service/invoice-viewer';

/**
 * A Service's invoice photo (S12), a modal over the tabs. Param: `serviceId`,
 * from the «Factura» button on the Service's card in the Vehicle's Historial.
 */
export default function InvoiceScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  return <InvoiceViewer serviceId={serviceId} />;
}
