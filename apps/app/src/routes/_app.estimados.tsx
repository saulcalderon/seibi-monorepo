import { createFileRoute } from '@tanstack/react-router'
import { Estimados } from '../screens/Estimados'

export const Route = createFileRoute('/_app/estimados')({
  validateSearch: (search: Record<string, unknown>): { vehicle?: string; task?: string } => ({
    vehicle: typeof search.vehicle === 'string' ? search.vehicle : undefined,
    task: typeof search.task === 'string' ? search.task : undefined,
  }),
  component: EstimadosRoute,
})

function EstimadosRoute() {
  const { vehicle, task } = Route.useSearch()
  return <Estimados key={`${vehicle ?? ''}:${task ?? ''}`} vehicleParam={vehicle} taskParam={task} />
}
