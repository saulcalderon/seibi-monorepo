import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  Calculator,
  CalendarClock,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Gauge,
  PartyPopper,
  Plus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { UnknownTasks } from '../components/UnknownTasks'
import { VehicleHero } from '../components/VehicleHero'
import { useActiveVehicle } from '../lib/activeVehicle'
import { useAuthSession } from '../lib/authSession'
import { formatDay, formatNumber, formatUsd, relativeDays, vehicleName } from '../lib/format'
import { useGarage, type ServiceRecord, type VehicleView } from '../lib/garage'
import { identityFromUser, initials } from '../lib/identity'
import { knowledgeProfile, taskLabel, type KnowledgeLevel } from '../lib/knowledge'
import { useProfile } from '../lib/profile'
import { reminderDueText } from '../lib/reminderText'
import { taskIcon, taskMap } from '../lib/tasks'
import { daysBetween } from '@seibi/maintenance-engine/days'
import type { Reminder } from '@seibi/maintenance-engine/reminders'
import { todayIso } from '../lib/format'
import { Button } from '../ui/Button'
import { Card, IconTile } from '../ui/Card'
import { cx } from '../ui/cx'
import { ErrorState, ScreenSkeleton, STATUS_META } from '../ui/feedback'

const TONE_TEXT = 'text-ink'
const TONE_SOFT = 'bg-surface-3'
const TONE_CARD = 'bg-surface'
const TONE_BAR = 'bg-surface'

export function Home() {
  const { user } = useAuthSession()
  const profile = useProfile()
  const garage = useGarage()
  const { active, select } = useActiveVehicle(garage.vehicles)
  const actions = useActions()
  const identity = identityFromUser(user)
  const name = profile.data?.displayName ?? identity.fullName?.split(' ')[0] ?? null

  const header = (
    <header className="flex items-center gap-3 px-5 pb-3 pt-2">
      <h1 className={cx('min-w-0 flex-1 truncate font-sans text-[1.7rem] font-semibold leading-none tracking-tight', TONE_TEXT)}>
        Seibi
      </h1>
      <Link
        to="/perfil"
        aria-label="Perfil"
        className={cx(
          'inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.9rem] font-bold ring-1 ring-line',
          TONE_BAR,
          TONE_TEXT,
        )}
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
    <Screen className="min-h-full bg-[#f7f2ee]">
      {header}
      <div className={cx('flex flex-col gap-5 px-5', TONE_TEXT)}>
        <VehicleStage vehicle={active} vehicles={garage.vehicles} onSelect={select} />
        <motion.div
          key={active.id}
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <HomeBody vehicle={active} />
        </motion.div>
      </div>
    </Screen>
  )
}

const EASE = [0.33, 1, 0.68, 1] as const

function ToneIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className={cx('inline-flex size-12 shrink-0 items-center justify-center rounded-2xl', TONE_SOFT, TONE_TEXT)}>
      <Icon className="size-6" strokeWidth={1.75} aria-hidden />
    </span>
  )
}

function SectionLink({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('inline-flex items-center gap-0.5 px-0.5 py-1 text-[1.02rem] font-semibold', TONE_TEXT)}
    >
      {title}
      <ChevronRight className="size-4" aria-hidden />
    </button>
  )
}

function SuggestionList({
  reminders,
  measure,
  level,
  tasks,
  onOpen,
}: {
  reminders: Reminder[]
  measure: VehicleView['measure']
  level: KnowledgeLevel | null | undefined
  tasks: ReturnType<typeof taskMap>
  onOpen: (taskCode: string) => void
}) {
  const k = knowledgeProfile(level)
  return (
    <div className={cx('overflow-hidden rounded-[1.35rem]', TONE_CARD)}>
      {reminders.map((r, index) => {
        const dueOn = r.dueOn ?? r.expectedOn
        const description = reminderDueText(r, measure)
        return (
          <button
            key={r.taskCode}
            type="button"
            onClick={() => onOpen(r.taskCode)}
            className={cx(
              'flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2',
              index > 0 && 'border-t border-line',
            )}
          >
            <ToneIcon icon={taskIcon(r.taskCode)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.98rem] font-semibold leading-tight">
                {taskLabel(tasks.get(r.taskCode), r.taskCode, k)}
              </span>
              <span className="mt-0.5 block truncate text-[0.8rem] opacity-70">{description}</span>
              {dueOn ? <span className="mt-0.5 block text-[0.8rem] opacity-70 tabular">{formatDay(dueOn)}</span> : null}
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-surface-2 px-3 text-[0.75rem] font-semibold">
              {STATUS_META[r.status].label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function OkGrid({
  reminders,
  level,
  tasks,
  onOpen,
}: {
  reminders: Reminder[]
  level: KnowledgeLevel | null | undefined
  tasks: ReturnType<typeof taskMap>
  onOpen: (taskCode: string) => void
}) {
  const k = knowledgeProfile(level)
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {reminders.map((r) => {
        const dueOn = r.dueOn ?? r.expectedOn
        return (
          <button
            key={r.taskCode}
            type="button"
            onClick={() => onOpen(r.taskCode)}
            className={cx('flex items-center gap-2.5 rounded-[1.25rem] px-3 py-3 text-left active:bg-surface-2', TONE_CARD)}
          >
            <ToneIcon icon={taskIcon(r.taskCode)} />
            <span className="min-w-0">
              <span className="block text-balance text-[0.86rem] font-semibold leading-tight">
                {taskLabel(tasks.get(r.taskCode), r.taskCode, k)}
              </span>
              {dueOn ? <span className="mt-0.5 block text-[0.75rem] opacity-70 tabular">{formatDay(dueOn)}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function RecentServices({
  services,
  tasks,
  level,
}: {
  services: ServiceRecord[]
  tasks: ReturnType<typeof taskMap>
  level: KnowledgeLevel | null | undefined
}) {
  const k = knowledgeProfile(level)
  return (
    <div className={cx('overflow-hidden rounded-[1.35rem]', TONE_CARD)}>
      {services.map((s, index) => {
        const name = s.items
          .map((i) => (i.taskCode ? taskLabel(tasks.get(i.taskCode), i.taskCode, k) : i.name))
          .join(', ')
        const meta = [s.shop, formatDay(s.performedOn)].filter(Boolean).join(' · ')
        return (
          <div
            key={s.id}
            className={cx('flex items-center gap-3 px-3.5 py-3', index > 0 && 'border-t border-line')}
          >
            <ToneIcon icon={taskIcon(s.items.find((i) => i.taskCode)?.taskCode)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.98rem] font-semibold leading-tight">{name}</p>
              {meta ? <p className="mt-0.5 truncate text-[0.8rem] opacity-70">{meta}</p> : null}
            </div>
            {s.totalCost != null ? (
              <span className="shrink-0 text-[1.02rem] font-semibold tabular">{formatUsd(s.totalCost)}</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function VehicleStage({
  vehicle,
  vehicles,
  onSelect,
}: {
  vehicle: VehicleView
  vehicles: VehicleView[]
  onSelect: (id: string) => void
}) {
  const navigate = useNavigate()
  const actions = useActions()
  const openDetail = () => void navigate({ to: '/flota/$vehicleId', params: { vehicleId: vehicle.id } })
  const index = Math.max(0, vehicles.findIndex((v) => v.id === vehicle.id))
  const step = (delta: number) => {
    const next = vehicles[(index + delta + vehicles.length) % vehicles.length]
    if (next && next.id !== vehicle.id) onSelect(next.id)
  }

  return (
    <section className="flex flex-col gap-2.5" aria-label={vehicleName(vehicle)}>
      <div className={cx('flex h-12 items-center rounded-2xl px-1', TONE_BAR)}>
        {vehicles.length > 1 ? (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Vehículo anterior"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl active:bg-surface-2"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <span className="size-10 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={openDetail}
          aria-label={`Ver ${vehicleName(vehicle)}`}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2.5 px-2"
        >
          <span className="truncate text-[0.78rem] font-semibold tracking-[0.12em]">
            {vehicle.brand.toUpperCase()}
          </span>
          <span className="h-4 w-px shrink-0 bg-ink/20" aria-hidden />
          <span className="truncate text-[0.92rem] font-semibold">
            {vehicle.model} {vehicle.year}
            {vehicle.plate ? ` · ${vehicle.plate}` : ''}
          </span>
        </button>
        <button
          type="button"
          onClick={vehicles.length > 1 ? () => step(1) : openDetail}
          aria-label={vehicles.length > 1 ? 'Vehículo siguiente' : `Abrir ${vehicleName(vehicle)}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl active:bg-surface-2"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className={cx('overflow-hidden rounded-[1.35rem]', TONE_CARD)}>
        <div className="relative h-36">
          <motion.div
            key={vehicle.id}
            className="absolute inset-0"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <VehicleHero
              vehicle={vehicle}
              fitMargin={0.68}
              cameraPosition={[-5.2, 0.22, 1.15]}
              className="h-full [&>div.-z-10]:hidden [&>span]:bottom-2"
            />
          </motion.div>
        </div>
        <button
          type="button"
          onClick={() => actions.updateMileage(vehicle.id)}
          aria-label={
            vehicle.odometer != null
              ? `Odómetro, ${formatNumber(vehicle.odometer)} ${vehicle.measure}`
              : 'Odómetro, sin lectura'
          }
          className="flex w-full items-center justify-center gap-2 border-t border-line py-3.5 active:bg-surface-2"
        >
          <Gauge className="size-5" strokeWidth={1.75} aria-hidden />
          <span className="text-[1.2rem] font-semibold leading-tight tracking-tight tabular">
            {vehicle.odometer != null ? `${formatNumber(vehicle.odometer)} ${vehicle.measure}` : 'Sin lectura'}
          </span>
        </button>
      </div>
    </section>
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
  const upcoming = vehicle.reminders.filter((r) => !r.snoozed && r.status === 'ok').slice(0, 4)
  const today = todayIso()

  return (
    <>
      <UnknownTasks
        vehicleId={vehicle.id}
        reminders={vehicle.reminders.filter((r) => r.status === 'unknown')}
        tasks={byCode}
        level={profile.data?.knowledgeLevel}
      />

      {vehicle.mileagePrompt.due ? (
        <button
          type="button"
          onClick={() => actions.updateMileage(vehicle.id)}
          className={cx('flex items-center gap-3 rounded-[1.35rem] p-3.5 text-left', TONE_CARD)}
        >
          <ToneIcon icon={Gauge} />
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

      <section className="flex flex-col gap-1.5">
        <SectionLink title="Sugerencias" onClick={() => void navigate({ to: '/avisos' })} />
        {attention.length === 0 ? (
          <div className={cx('flex items-center gap-3 rounded-[1.35rem] px-3.5 py-3.5', TONE_CARD)}>
            <ToneIcon icon={PartyPopper} />
            <p className="text-[0.9rem] leading-snug opacity-80">
              {unknown.length > 0
                ? 'Cuéntanos cuándo hiciste los últimos Servicios para calcular los próximos.'
                : 'Todo está al día. Te avisaremos cuando algo se acerque.'}
            </p>
          </div>
        ) : (
          <SuggestionList
            reminders={attention}
            measure={vehicle.measure}
            level={profile.data?.knowledgeLevel}
            tasks={byCode}
            onOpen={(taskCode) => actions.openReminder(vehicle.id, taskCode)}
          />
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <SectionLink title="Al día" onClick={() => void navigate({ to: '/avisos' })} />
          <OkGrid
            reminders={upcoming}
            level={profile.data?.knowledgeLevel}
            tasks={byCode}
            onOpen={(taskCode) => actions.openReminder(vehicle.id, taskCode)}
          />
        </section>
      ) : null}

      {vehicle.upcomingAppointments.length > 0 || vehicle.openManualReminders.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-0.5 text-[1.02rem] font-semibold">En tu calendario</h2>
          <Card className="divide-y divide-line overflow-hidden rounded-[1.6rem]">
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

      <section className="flex flex-col gap-1.5">
        <SectionLink
          title="Último servicio"
          onClick={() =>
            void navigate({
              to: '/flota/$vehicleId',
              params: { vehicleId: vehicle.id },
              search: { tab: 'historial' },
            })
          }
        />
        {vehicle.services.length === 0 ? (
          <p className="px-0.5 text-[0.88rem] opacity-70">
            Registra lo que le hagas a tu Vehículo y tendrás su historial completo.
          </p>
        ) : (
          <RecentServices
            services={vehicle.services.slice(0, 2)}
            tasks={byCode}
            level={profile.data?.knowledgeLevel}
          />
        )}
        <button
          type="button"
          onClick={() => actions.logService({ vehicleId: vehicle.id })}
          className={cx(
            'mx-auto inline-flex w-fit items-center justify-center gap-1.5 self-center rounded-2xl px-5 py-2.5 text-[0.95rem] font-semibold shadow-card active:bg-surface-2',
            TONE_BAR,
          )}
        >
          <Plus className="size-4" aria-hidden />
          Registrar Servicio
        </button>
      </section>
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
