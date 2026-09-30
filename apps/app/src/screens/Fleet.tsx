import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArchiveRestore, CarFront, Plus, Search, SearchX, X } from 'lucide-react'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { VehicleVisual } from '../components/VehicleVisual'
import { formatNumber, vehicleName } from '../lib/format'
import { byUrgency, useGarage, type VehicleView } from '../lib/garage'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import { useRestoreVehicle } from '../lib/mutations'
import { useProfile } from '../lib/profile'
import { reminderDueText } from '../lib/reminderText'
import { taskMap, type MaintenanceTask } from '../lib/tasks'
import { Button, IconButton } from '../ui/Button'
import { Card } from '../ui/Card'
import { Chip } from '../ui/fields'
import { EmptyState, ErrorState, Skeleton, StatusBadge, useToast } from '../ui/feedback'

type Filter = 'all' | 'attention' | 'ok'

function fold(v: string) {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function matches(v: VehicleView, query: string) {
  const needle = fold(query.trim())
  if (!needle) return true
  const hay = fold([v.brand, v.model, v.year, v.plate ?? '', v.trimLevel ?? ''].join(' '))
  return needle.split(/\s+/).every((word) => hay.includes(word))
}

export function Fleet() {
  const garage = useGarage()
  const actions = useActions()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showWithdrawn, setShowWithdrawn] = useState(false)

  const sorted = useMemo(() => [...garage.vehicles].sort(byUrgency), [garage.vehicles])
  const attention = sorted.filter((v) => v.health === 'overdue' || v.health === 'soon')
  const visible = sorted
    .filter((v) =>
      filter === 'attention'
        ? v.health === 'overdue' || v.health === 'soon'
        : filter === 'ok'
          ? v.health === 'ok'
          : true,
    )
    .filter((v) => matches(v, query))

  const total = garage.vehicles.length

  return (
    <Screen
      title="Mi flota"
      subtitle={
        total === 0
          ? undefined
          : `${total} ${total === 1 ? 'Vehículo' : 'Vehículos'}${attention.length ? ` · ${attention.length} requiere${attention.length === 1 ? '' : 'n'} atención` : ''}`
      }
      actions={<IconButton icon={Plus} label="Agregar Vehículo" variant="secondary" onClick={actions.addVehicle} />}
    >
      {garage.isLoading ? (
        <div className="flex flex-col gap-3 px-5">
          <Skeleton className="h-12" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
      ) : garage.isError ? (
        <ErrorState onRetry={garage.refetch} />
      ) : total === 0 ? (
        <EmptyState
          icon={CarFront}
          title="Tu flota está vacía"
          body="Agrega tu primer Vehículo para ver su plan de mantenimiento y sus avisos."
          action={
            <Button icon={Plus} onClick={actions.addVehicle}>
              Agregar Vehículo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {total > 1 ? (
            <div className="px-5">
              <label className="relative block">
                <span className="sr-only">Buscar en tu flota</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por marca, modelo, año o placa"
                  className="h-12 w-full rounded-2xl bg-surface pl-11 pr-11 text-[0.95rem] shadow-card ring-1 ring-line placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-radiant"
                />
                {query ? (
                  <IconButton
                    icon={X}
                    label="Borrar búsqueda"
                    onClick={() => setQuery('')}
                    className="absolute right-0.5 top-1/2 size-11 -translate-y-1/2"
                  />
                ) : null}
              </label>
              <div className="scroll-area -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
                <Chip selected={filter === 'all'} onClick={() => setFilter('all')} count={total}>
                  Todos
                </Chip>
                <Chip selected={filter === 'attention'} onClick={() => setFilter('attention')} count={attention.length}>
                  Requiere atención
                </Chip>
                <Chip
                  selected={filter === 'ok'}
                  onClick={() => setFilter('ok')}
                  count={sorted.filter((v) => v.health === 'ok').length}
                >
                  Al día
                </Chip>
              </div>
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              body={query ? `Ningún Vehículo coincide con “${query}”.` : 'Ningún Vehículo en este filtro.'}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                >
                  Ver todos
                </Button>
              }
            />
          ) : (
            <motion.ul layout className="flex flex-col gap-3 px-5">
              <AnimatePresence initial={false}>
                {visible.map((v, i) => (
                  <motion.li
                    key={v.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04 } }}
                    exit={{ opacity: 0, scale: 0.97 }}
                  >
                    <FleetCard vehicle={v} tasks={garage.tasks} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}

        </div>
      )}
      {!garage.isLoading && !garage.isError && garage.withdrawn.length > 0 ? (
        <div className="px-5 pt-2">
          <button
            type="button"
            onClick={() => setShowWithdrawn((s) => !s)}
            className="min-h-11 text-[0.88rem] font-semibold text-muted"
            aria-expanded={showWithdrawn}
          >
            {showWithdrawn ? 'Ocultar' : 'Ver'} Vehículos retirados ({garage.withdrawn.length})
          </button>
          {showWithdrawn ? (
            <div className="mt-2 flex flex-col gap-2">
              {garage.withdrawn.map((v) => (
                <WithdrawnRow key={v.id} vehicle={v} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Screen>
  )
}

function FleetCard({ vehicle, tasks }: { vehicle: VehicleView; tasks: MaintenanceTask[] }) {
  const navigate = useNavigate()
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel)
  const next = vehicle.next
  const task = next ? taskMap(tasks).get(next.taskCode) : undefined
  return (
    <Card>
      <button
        type="button"
        onClick={() => void navigate({ to: '/flota/$vehicleId', params: { vehicleId: vehicle.id } })}
        className="flex w-full flex-col text-left transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 p-4 pb-3">
          <VehicleVisual
            render={vehicle.render}
            bodyType={vehicle.bodyType}
            color={vehicle.color}
            alt={vehicleName(vehicle)}
            className="h-16 w-28 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[1.05rem] font-bold leading-tight">{vehicleName(vehicle)}</p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              {vehicle.year}
              {vehicle.plate ? ` · ${vehicle.plate}` : ''}
              {' · '}
              <span className="font-semibold text-ink tabular">
                {vehicle.odometer != null ? `${formatNumber(vehicle.odometer)} ${vehicle.measure}` : 'Sin kilometraje'}
              </span>
            </p>
            <div className="mt-2">
              <StatusBadge
                status={vehicle.health}
                label={
                  vehicle.health === 'unknown'
                    ? 'Sin datos'
                    : vehicle.pending > 0
                      ? `${vehicle.pending} pendiente${vehicle.pending === 1 ? '' : 's'}`
                      : undefined
                }
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-[0.82rem]">
          <span className="text-muted">Próximo:</span>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {next
              ? `${taskLabel(task, next.taskCode, k)} · ${reminderDueText(next, vehicle.measure)}`
              : 'Sin pendientes'}
          </span>
        </div>
      </button>
    </Card>
  )
}

function WithdrawnRow({ vehicle }: { vehicle: VehicleView }) {
  const restore = useRestoreVehicle()
  const toast = useToast()
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
      <VehicleVisual
        render={vehicle.render}
        bodyType={vehicle.bodyType}
        color={vehicle.color}
        alt={vehicleName(vehicle)}
        className="h-10 w-16 shrink-0 opacity-60"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9rem] font-semibold">{vehicleName(vehicle)}</p>
        <p className="text-[0.78rem] text-muted">{vehicle.year} · Retirado</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        icon={ArchiveRestore}
        loading={restore.isPending}
        onClick={async () => {
          await restore.mutateAsync(vehicle.id)
          toast('Vehículo restaurado')
        }}
      >
        Restaurar
      </Button>
    </div>
  )
}
