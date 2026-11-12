import { createFileRoute } from '@tanstack/react-router'
import { VehicleDetail, type DetailTab } from '../screens/VehicleDetail'

const TABS: DetailTab[] = ['mantenimiento', 'historial', 'uso', 'datos']

export const Route = createFileRoute('/_app/flota/$vehicleId')({
  validateSearch: (search: Record<string, unknown>): { tab?: DetailTab; focus?: 'overdue' | 'soon' } => ({
    tab: TABS.includes(search.tab as DetailTab) ? (search.tab as DetailTab) : undefined,
    focus: search.focus === 'overdue' || search.focus === 'soon' ? search.focus : undefined,
  }),
  component: VehicleDetailRoute,
})

function VehicleDetailRoute() {
  const { vehicleId } = Route.useParams()
  const { tab, focus } = Route.useSearch()
  return <VehicleDetail vehicleId={vehicleId} tab={tab ?? 'mantenimiento'} focus={focus} />
}
