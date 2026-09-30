import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  Calculator,
  CalendarClock,
  CarFront,
  ChevronRight,
  Gauge,
  History,
  PartyPopper,
  Plus,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { ReminderRow } from '../components/ReminderRow'
import { UnknownTasks } from '../components/UnknownTasks'
import { VehicleHero } from '../components/VehicleHero'
import { useActiveVehicle } from '../lib/activeVehicle'
import { useAuthSession } from '../lib/authSession'
import { formatDay, formatNumber, formatUsd, greeting, relativeDays, vehicleName } from '../lib/format'
import { useGarage, type VehicleView } from '../lib/garage'
import { identityFromUser, initials } from '../lib/identity'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import { useProfile } from '../lib/profile'
import { taskIcon, taskMap } from '../lib/tasks'
import { daysBetween } from '@seibi/maintenance-engine/days'
import { todayIso } from '../lib/format'
import { Button } from '../ui/Button'
import { Card, IconTile, SectionHeader } from '../ui/Card'
import { cx } from '../ui/cx'
import { ErrorState, ScreenSkeleton, StatusBadge } from '../ui/feedback'

export function Home() {
  const { user } = useAuthSession()
  const profile = useProfile()
  const garage = useGarage()
  const { active, select } = useActiveVehicle(garage.vehicles)
  const actions = useActions()
  const identity = identityFromUser(user)
  const name = profile.data?.displayName ?? identity.fullName?.split(' ')[0] ?? null

  const header = (
    <header className="flex items-center gap-3 px-5 pb-4 pt-2">
      <div className="min-w-0 flex-1">
        <p className="text-[0.85rem] font-semibold text-muted">{greeting()}</p>
        <h1 className="truncate text-[1.65rem] leading-tight">{name ? `Hola, ${name}` : 'Hola'}</h1>
      </div>
      <Link
        to="/perfil"
        aria-label="Perfil"
        className="inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-inverse text-[0.9rem] font-bold text-on-inverse ring-2 ring-surface"
      >
        {identity.avatarUrl ? (
          <img src={identity.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials(name ?? identity.email ?? 'S')
        )}
      </Link>
    </header>
  )

  if (garage.isLoading) {
    return (
      <Screen>
        {header}
        <ScreenSkeleton />
      </Screen>
    )
  }
  if (garage.isError) {
    return (
      <Screen>
        {header}
        <ErrorState onRetry={garage.refetch} />
      </Screen>
    )
  }
  if (!active) {
    return (
      <Screen>
        {header}
        <FirstVehicle onAdd={actions.addVehicle} />
      </Screen>
    )
  }

  return (
    <Screen>
      {header}
      {garage.vehicles.length > 1 ? (
        <div className="scroll-area -mt-1 mb-3 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Tus Vehículos">
          {garage.vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === active.id}
              onClick={() => select(v.id)}
              className={cx(
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.85rem] font-semibold transition-colors',
                v.id === active.id ? 'bg-inverse text-on-inverse' : 'bg-surface ring-1 ring-line',
              )}
            >
              <span
                className={cx(
                  'size-2 rounded-full',
                  v.health === 'overdue' ? 'bg-overdue' : v.health === 'soon' ? 'bg-soon' : v.health === 'ok' ? 'bg-ok' : 'bg-unknown',
                )}
                aria-hidden
              />
              {v.model}
            </button>
          ))}
        </div>
      ) : null}

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
        className="flex flex-col gap-6 px-5"
      >
        <VehicleSummary vehicle={active} />
        <HomeBody vehicle={active} />
      </motion.div>
    </Screen>
  )
}

function VehicleSummary({ vehicle }: { vehicle: VehicleView }) {
  const navigate = useNavigate()
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => void navigate({ to: '/flota/$vehicleId', params: { vehicleId: vehicle.id } })}
        className="block w-full text-left"
        aria-label={`Ver ${vehicleName(vehicle)}`}
      >
        <div className="flex items-start justify-between gap-2 px-5 pt-5">
          <div className="min-w-0">
            <p className="text-[0.8rem] font-semibold text-muted">
              {vehicle.year}
              {vehicle.plate ? ` · ${vehicle.plate}` : ''}
            </p>
            <h2 className="truncate text-[1.45rem] leading-tight">{vehicleName(vehicle)}</h2>
          </div>
          <StatusBadge
            status={vehicle.health}
            label={
              vehicle.health === 'ok'
                ? 'Al día'
                : vehicle.health === 'unknown'
                  ? 'Completa datos'
                  : `${vehicle.pending} pendiente${vehicle.pending === 1 ? '' : 's'}`
            }
          />
        </div>
      </button>
      <VehicleHero vehicle={vehicle} className="h-48" />
      <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
        <div className="px-5 py-3.5">
          <p className="text-[0.75rem] font-semibold text-muted">Kilometraje</p>
          <p className="text-[1.05rem] font-bold tabular">
            {vehicle.odometer != null ? `${formatNumber(vehicle.odometer)} ${vehicle.measure}` : '—'}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[0.75rem] font-semibold text-muted">Uso estimado</p>
          <p className="text-[1.05rem] font-bold tabular">
            {vehicle.usage
              ? `${formatNumber(vehicle.usage.perDay * 7)} ${vehicle.measure}/sem`
              : '—'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function HomeBody({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const garage = useGarage()
  const profile = useProfile()
  const navigate = useNavigate()
  const k = knowledgeProfile(profile.data?.knowledgeLevel)
  const byCode = taskMap(garage.tasks)

  const attention = vehicle.reminders.filter(
    (r) => !r.snoozed && (r.status === 'overdue' || r.status === 'soon'),
  )
  const unknown = vehicle.reminders.filter((r) => r.status === 'unknown')
  const upcoming = vehicle.reminders.filter((r) => !r.snoozed && r.status === 'ok').slice(0, 2)
  const today = todayIso()

  return (
    <>
      {vehicle.mileagePrompt.due ? (
        <button
          type="button"
          onClick={() => actions.updateMileage(vehicle.id)}
          className="flex items-center gap-3 rounded-[1.25rem] bg-inverse p-4 text-left text-on-inverse shadow-card"
        >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-radiant text-white">
            <Gauge className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.95rem] font-bold">¿Cuánto marca hoy el odómetro?</span>
            <span className="block text-[0.82rem] opacity-70">
              {vehicle.mileagePrompt.reason === 'no_readings'
                ? 'Lo necesitamos para calcular tus próximos mantenimientos.'
                : vehicle.mileagePrompt.reason === 'no_usage'
                  ? 'Con otra lectura sabremos cuánto lo usas.'
                  : `Tu último registro fue ${relativeDays(-(vehicle.mileagePrompt.daysSinceLast ?? 0))}.`}
            </span>
          </span>
          <ChevronRight className="size-5 opacity-60" aria-hidden />
        </button>
      ) : null}

      {vehicle.scheduleSource === 'pending' ? (
        <p className="flex items-center gap-2 rounded-2xl bg-radiant-soft px-4 py-3 text-[0.84rem] font-medium text-radiant">
          <Search className="size-4 shrink-0 animate-pulse" aria-hidden />
          Buscando el plan de mantenimiento del fabricante para tu {vehicle.model}…
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={attention.length > 0 ? 'Necesita atención' : 'Lo próximo'}
          action="Ver todo"
          onAction={() => void navigate({ to: '/avisos' })}
        />
        <Card className="divide-y divide-line overflow-hidden">
          {attention.length === 0 && upcoming.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-4">
              <IconTile icon={PartyPopper} tone="ok" />
              <p className="text-[0.9rem] text-muted">
                {unknown.length > 0
                  ? 'Cuéntanos cuándo hiciste los últimos Servicios para calcular los próximos.'
                  : 'Todo está al día. Te avisaremos cuando algo se acerque.'}
              </p>
            </div>
          ) : (
            [...attention, ...(attention.length < 3 ? upcoming : [])].slice(0, 4).map((r) => (
              <ReminderRow
                key={r.taskCode}
                reminder={r}
                task={byCode.get(r.taskCode)}
                measure={vehicle.measure}
                level={profile.data?.knowledgeLevel}
                onClick={() => actions.openReminder(vehicle.id, r.taskCode)}
              />
            ))
          )}
        </Card>
      </section>

      <UnknownTasks
        vehicleId={vehicle.id}
        reminders={vehicle.reminders.filter((r) => r.status === 'unknown')}
        tasks={byCode}
        level={profile.data?.knowledgeLevel}
      />

      {vehicle.upcomingAppointments.length > 0 || vehicle.openManualReminders.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title="En tu calendario" />
          <Card className="divide-y divide-line overflow-hidden">
            {vehicle.upcomingAppointments.slice(0, 2).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <IconTile icon={CalendarClock} tone="radiant" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] font-semibold">
                    {a.taskCodes.length > 0
                      ? a.taskCodes.map((c) => taskLabel(byCode.get(c), c, k)).join(', ')
                      : 'Cita en el taller'}
                  </p>
                  <p className="text-[0.82rem] text-muted">
                    {formatDay(a.scheduledOn, 'long')} · {relativeDays(daysBetween(today, a.scheduledOn))}
                    {a.shop ? ` · ${a.shop}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    actions.logService({
                      vehicleId: vehicle.id,
                      taskCodes: a.taskCodes,
                      appointmentId: a.id,
                      shop: a.shop,
                    })
                  }
                >
                  Hecho
                </Button>
              </div>
            ))}
            {vehicle.openManualReminders.slice(0, 2).map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <IconTile icon={CalendarClock} tone={m.dueOn < today ? 'overdue' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] font-semibold">{m.title}</p>
                  <p className="text-[0.82rem] text-muted">
                    {formatDay(m.dueOn, 'long')} · {relativeDays(daysBetween(today, m.dueOn))}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Últimos Servicios"
          action={vehicle.services.length > 0 ? 'Historial' : undefined}
          onAction={() =>
            void navigate({ to: '/flota/$vehicleId', params: { vehicleId: vehicle.id }, search: { tab: 'historial' } })
          }
        />
        {vehicle.services.length === 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <IconTile icon={History} />
            <p className="flex-1 text-[0.88rem] text-muted">
              Registra lo que le hagas a tu Vehículo y tendrás su historial completo.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {vehicle.services.slice(0, 3).map((s) => {
              const first = s.items[0]
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                  <IconTile icon={first?.taskCode ? taskIcon(first.taskCode) : Wrench} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.92rem] font-semibold">
                      {s.items.map((i) => (i.taskCode ? taskLabel(byCode.get(i.taskCode), i.taskCode, k) : i.name)).join(', ')}
                    </p>
                    <p className="text-[0.8rem] text-muted">
                      {formatDay(s.performedOn)}
                      {s.reading != null ? ` · ${formatNumber(s.reading)} ${vehicle.measure}` : ''}
                    </p>
                  </div>
                  {s.totalCost != null ? (
                    <span className="text-[0.9rem] font-bold tabular">{formatUsd(s.totalCost)}</span>
                  ) : null}
                </div>
              )
            })}
          </Card>
        )}
        <Button variant="secondary" icon={Plus} onClick={() => actions.logService({ vehicleId: vehicle.id })}>
          Registrar Servicio
        </Button>
      </section>

      <Link
        to="/estimados"
        search={{ vehicle: vehicle.id }}
        className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-4 shadow-card"
      >
        <IconTile icon={Calculator} tone="radiant" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] font-bold">¿Cuánto cuesta un Servicio?</span>
          <span className="block text-[0.82rem] text-muted">Rangos de precio para tu {vehicle.model} en tu ciudad</span>
        </span>
        <ChevronRight className="size-5 text-subtle" aria-hidden />
      </Link>
    </>
  )
}

function FirstVehicle({ onAdd }: { onAdd: () => void }) {
  const points = [
    { icon: Sparkles, title: 'Tu plan de mantenimiento', body: 'Según la marca, el modelo y el año de tu Vehículo.' },
    { icon: Gauge, title: 'Avisos a tiempo', body: 'Calculados con tu kilometraje y cuánto lo usas.' },
    { icon: Calculator, title: 'Precios estimados', body: 'Rangos en tu ciudad antes de ir al taller.' },
  ]
  return (
    <div className="flex flex-col gap-5 px-5">
      <Card className="overflow-hidden p-6 text-center">
        <span className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-[1.4rem] bg-radiant-soft text-radiant">
          <CarFront className="size-8" aria-hidden />
        </span>
        <h2 className="text-[1.35rem]">Agrega tu primer Vehículo</h2>
        <p className="mx-auto mt-2 max-w-[17rem] text-[0.9rem] text-muted">
          Solo necesitamos la marca, el modelo, el año y el kilometraje. Toma menos de un minuto.
        </p>
        <Button size="lg" icon={Plus} block className="mt-5" onClick={onAdd}>
          Agregar Vehículo
        </Button>
      </Card>
      <div className="flex flex-col gap-2.5">
        {points.map(({ icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-4 shadow-card"
          >
            <IconTile icon={icon} tone="radiant" />
            <div>
              <p className="text-[0.95rem] font-bold">{title}</p>
              <p className="text-[0.82rem] text-muted">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
