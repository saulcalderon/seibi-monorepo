import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Bell, CalendarClock, ChevronLeft, ChevronRight, Gauge, Plus } from 'lucide-react'
import type { Reminder } from '@seibi/maintenance-engine/reminders'
import { daysBetween } from '@seibi/maintenance-engine/days'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { Lockup } from '../components/Lockup'
import { Ticker } from '../components/Ticker'
import { UnknownTasks } from '../components/UnknownTasks'
import { Silhouette } from '../components/VehicleVisual'
import { useActiveVehicle } from '../lib/activeVehicle'
import { useAuthSession } from '../lib/authSession'
import { formatDay, formatNumber, measureLabel, relativeDays, todayIso, vehicleName } from '../lib/format'
import { useGarage, type VehicleView } from '../lib/garage'
import { identityFromUser, initials } from '../lib/identity'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import { paintAccent, paintHex, paintLabel } from '../lib/paint'
import { useProfile } from '../lib/profile'
import { taskIcon, taskMap } from '../lib/tasks'
import { cx } from '../ui/cx'
import { ErrorState } from '../ui/feedback'

// Seibi v3 Garage: one stage card for the active Vehicle, the odometer as the
// screen's single hero number, and a 2×2 of the most pressing Reminders.

const EASE = [0.2, 0.7, 0.2, 1] as const
const LABEL = 'text-[13px] font-medium leading-[17px] text-muted'
const DISPLAY = 'font-sans text-[32px] font-light leading-[34px] tracking-[-0.025em]'
const CIRCLE = 'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-card'
const PRESS = 'transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] active:scale-[0.97]'
const STATUS_WORD = { overdue: 'Vencido', soon: 'Pronto', ok: 'Al día' } as const
const RANK = { overdue: 0, soon: 1, ok: 2, unknown: 3 } as const

function paintVars(color: string | null): CSSProperties {
  const paint = paintHex(color)
  return { '--paint': paint, '--accent': paintAccent(paint) } as CSSProperties
}

export function Home() {
  const { user } = useAuthSession()
  const profile = useProfile()
  const garage = useGarage()
  const { active, select } = useActiveVehicle(garage.vehicles)
  const actions = useActions()
  const identity = identityFromUser(user)
  const name = profile.data?.displayName ?? identity.fullName?.split(' ')[0] ?? null

  const header = (
    <header className="flex items-center justify-between px-5 pt-0.5">
      <HeaderLockup />
      <Link to="/perfil" aria-label="Perfil" className={cx(CIRCLE, PRESS, 'overflow-hidden text-[13px] font-semibold')}>
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
      <Screen className="garage v3 min-h-full" style={paintVars(null)}>
        {header}
        <GarageSkeleton />
      </Screen>
    )
  }
  if (garage.isError) {
    return (
      <Screen className="garage v3 min-h-full">
        {header}
        <ErrorState onRetry={garage.refetch} />
      </Screen>
    )
  }
  if (!active) {
    return (
      <Screen className="garage v3 min-h-full" style={paintVars(null)}>
        {header}
        <EmptyGarage onAdd={actions.addVehicle} />
      </Screen>
    )
  }

  return (
    <Screen className="garage v3 min-h-full text-ink" style={paintVars(active.color)}>
      {header}
      <CarStage vehicle={active} vehicles={garage.vehicles} onSelect={select} />
      <motion.div
        key={active.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        <Odometer vehicle={active} />
        <Status vehicle={active} />
        <Agenda vehicle={active} />
      </motion.div>
    </Screen>
  )
}

/** Header lockup, 22 pt. */
function HeaderLockup() {
  return (
    <span role="img" aria-label="Seibi" className="inline-flex">
      <Lockup className="text-[22px]" />
    </span>
  )
}

function CarStage({
  vehicle,
  vehicles,
  onSelect,
}: {
  vehicle: VehicleView
  vehicles: VehicleView[]
  onSelect: (id: string) => void
}) {
  const reduce = useReducedMotion()
  const [direction, setDirection] = useState(1)
  const index = Math.max(0, vehicles.findIndex((v) => v.id === vehicle.id))
  const step = (delta: number) => {
    const next = vehicles[(index + delta + vehicles.length) % vehicles.length]
    if (!next || next.id === vehicle.id) return
    setDirection(delta)
    onSelect(next.id)
  }
  const travel = reduce ? 0 : 70
  const paint = paintLabel(vehicle.color)

  return (
    <motion.section
      className="garage-stage mx-3 mt-2.5 h-[316px] rounded-3xl"
      style={{ touchAction: 'pan-y' }}
      aria-roledescription="carrusel"
      aria-label="Tus Vehículos"
      onPanEnd={(_, info) => {
        const dx = info.offset.x
        if (vehicles.length > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(info.offset.y)) step(dx < 0 ? 1 : -1)
      }}
    >
      <Link
        to="/flota/$vehicleId"
        params={{ vehicleId: vehicle.id }}
        aria-label={`Ver ${vehicleName(vehicle)}`}
        className="absolute inset-x-5 top-[18px] z-[4] block"
      >
        <p className={cx(LABEL, 'truncate')}>{vehicle.brand}</p>
        <h2 className={cx(DISPLAY, 'mt-1 truncate')}>{vehicle.model}</h2>
        <p className={cx(LABEL, 'mt-1.5 truncate tabular')}>{[vehicle.year, paint].filter(Boolean).join(' · ')}</p>
      </Link>

      <div className="garage-glow" aria-hidden />
      {/* The poster carries its own ground shadow. */}
      {vehicle.render?.posterUrl ? null : <div className="garage-contact" aria-hidden />}

      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={vehicle.id}
          custom={direction}
          className="absolute inset-0 z-[2]"
          variants={{
            enter: (d: number) => ({ x: `${travel * d}%`, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: `${-travel * d}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: EASE }}
        >
          <StageCar vehicle={vehicle} />
        </motion.div>
      </AnimatePresence>

      {vehicles.length > 1 ? (
        <div className="absolute inset-x-2.5 bottom-2.5 z-[4] flex items-center justify-between">
          <button type="button" onClick={() => step(-1)} aria-label="Vehículo anterior" className={cx(CIRCLE, PRESS)}>
            <ChevronLeft className="size-[18px]" aria-hidden />
          </button>
          <span className="flex items-center gap-1.5" aria-label={`Vehículo ${index + 1} de ${vehicles.length}`}>
            {vehicles.map((v) => (
              <i
                key={v.id}
                className={cx(
                  'block h-1.5 rounded-[3px] transition-[width,background-color] duration-200',
                  v.id === vehicle.id ? 'w-[18px] bg-[var(--accent)]' : 'w-1.5 bg-[var(--g-dot)]',
                )}
              />
            ))}
          </span>
          <button type="button" onClick={() => step(1)} aria-label="Vehículo siguiente" className={cx(CIRCLE, PRESS)}>
            <ChevronRight className="size-[18px]" aria-hidden />
          </button>
        </div>
      ) : null}
    </motion.section>
  )
}

/**
 * The Vehicle in the stage. The design wants a transparent side-profile
 * cut-out; until the render pipeline makes one, the fal poster sits in a
 * larger feathered box, and without a poster the paint-coloured silhouette
 * stands on the floor with its reflection. No 3D on Inicio.
 */
function StageCar({ vehicle }: { vehicle: VehicleView }) {
  const [failed, setFailed] = useState(false)
  const poster = failed ? null : (vehicle.render?.posterUrl ?? null)
  if (poster) {
    return (
      <div className="garage-car is-poster">
        <img
          src={poster}
          alt={`${vehicleName(vehicle)} ${vehicle.year} (ilustración)`}
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      </div>
    )
  }
  return (
    <>
      <div className="garage-refl" aria-hidden>
        <Silhouette bodyType={vehicle.bodyType} color={vehicle.color} className="h-full w-full" />
      </div>
      <div className="garage-car">
        <Silhouette bodyType={vehicle.bodyType} color={vehicle.color} className="h-full w-full" />
      </div>
    </>
  )
}

function Odometer({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const prompt = vehicle.mileagePrompt
  const hint = !prompt.due
    ? null
    : prompt.reason === 'no_readings'
      ? 'Lo necesitamos para calcular tus próximos mantenimientos.'
      : prompt.reason === 'no_usage'
        ? 'Con otra lectura sabremos cuánto lo usas.'
        : `Tu último registro fue ${relativeDays(-(prompt.daysSinceLast ?? 0))}.`

  return (
    <section className="px-5 pt-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={LABEL}>Kilometraje</p>
          {vehicle.odometer != null ? (
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
              <Ticker
                text={formatNumber(vehicle.odometer)}
                className="whitespace-nowrap text-[52px] font-light leading-[54px] tracking-[-0.03em] tabular"
              />
              <span className="text-[16px] text-muted">{measureLabel(vehicle.measure)}</span>
            </p>
          ) : (
            <p className={cx(DISPLAY, 'mt-1')}>Sin lectura</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => actions.updateMileage(vehicle.id)}
          className={cx(
            'mb-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--g-control)] px-4 text-[14px] font-medium active:bg-[var(--g-control-pressed)]',
            PRESS,
          )}
        >
          <Gauge className="size-[18px]" aria-hidden />
          Actualizar
        </button>
      </div>
      {hint ? <p className="mt-2 text-[13px] leading-[17px] text-muted">{hint}</p> : null}
    </section>
  )
}

function Status({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const navigate = useNavigate()
  const garage = useGarage()
  const profile = useProfile()
  const k = knowledgeProfile(profile.data?.knowledgeLevel)
  const byCode = taskMap(garage.tasks)

  const known = vehicle.reminders
    .filter((r) => r.status !== 'unknown' && !r.snoozed)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.used - a.used)
  const attention = known.filter((r) => r.status !== 'ok')
  const overdue = attention.some((r) => r.status === 'overdue')
  const unknown = vehicle.reminders.filter((r) => r.status === 'unknown')

  return (
    <>
      {known.length > 0 ? (
        <section aria-labelledby="estado">
          <div className="flex items-center justify-between px-5 pb-2.5 pt-[18px]">
            <h2 id="estado" className="font-sans text-[15px] font-medium tracking-normal">
              Estado
            </h2>
            <StatusSummary
              count={attention.length}
              overdue={overdue}
              onOpen={
                attention.length > 0
                  ? () =>
                      void navigate({
                        to: '/flota/$vehicleId',
                        params: { vehicleId: vehicle.id },
                        search: { tab: 'mantenimiento', focus: overdue ? 'overdue' : 'soon' },
                      })
                  : undefined
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 px-5">
            {known.slice(0, 4).map((r) => (
              <StatusCard
                key={r.taskCode}
                reminder={r}
                label={taskLabel(byCode.get(r.taskCode), r.taskCode, k)}
                onOpen={() => actions.openReminder(vehicle.id, r.taskCode)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {unknown.length > 0 ? (
        <div className="px-5 pt-5">
          <UnknownTasks
            vehicleId={vehicle.id}
            reminders={unknown}
            tasks={byCode}
            level={profile.data?.knowledgeLevel}
          />
        </div>
      ) : null}
    </>
  )
}

function Agenda({ vehicle }: { vehicle: VehicleView }) {
  const navigate = useNavigate()
  const today = todayIso()
  const items = [
    ...vehicle.upcomingAppointments.map((appointment) => ({
      id: `cita-${appointment.id}`,
      title: appointment.shop?.trim() || 'Cita en el taller',
      when: appointment.scheduledOn,
      icon: CalendarClock,
    })),
    ...vehicle.openManualReminders.map((reminder) => ({
      id: `aviso-${reminder.id}`,
      title: reminder.title,
      when: reminder.dueOn,
      icon: Bell,
    })),
  ].sort((a, b) => (a.when < b.when ? -1 : 1))

  if (items.length === 0) return null

  return (
    <section className="px-5 pt-5" aria-label="Próximos">
      <h2 className="pb-2.5 font-sans text-[15px] font-medium tracking-normal">Próximos</h2>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void navigate({ to: '/flota/$vehicleId', params: { vehicleId: vehicle.id } })}
              className={cx('flex items-center gap-3 rounded-3xl bg-surface px-3.5 py-3 text-left shadow-card', PRESS)}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--g-control)] text-ink">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-[18px]">
                {item.title} · {formatDay(item.when)}
              </span>
              <span className="shrink-0 text-[13px] font-medium text-muted">
                {relativeDays(daysBetween(today, item.when))}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StatusSummary({
  count,
  overdue,
  onOpen,
}: {
  count: number
  overdue: boolean
  onOpen?: () => void
}) {
  if (count === 0) return <span className="text-[13px] font-medium text-muted">Todo al día</span>
  const className = cx(
    'inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium',
    overdue ? 'text-[var(--g-alert)]' : 'text-muted',
  )
  const content = (
    <>
      {overdue ? <span className="size-1.5 rounded-full bg-[var(--g-alert)]" aria-hidden /> : null}
      {count} por atender
    </>
  )
  if (!onOpen) return <span className={className}>{content}</span>
  return (
    <button type="button" onClick={onOpen} className={className}>
      {content}
    </button>
  )
}

function StatusCard({ reminder, label, onOpen }: { reminder: Reminder; label: string; onOpen: () => void }) {
  const Icon = taskIcon(reminder.taskCode)
  const over = reminder.status === 'overdue'
  const word = STATUS_WORD[reminder.status as keyof typeof STATUS_WORD]
  const used = over ? 100 : Math.round(Math.min(1, Math.max(0, reminder.used)) * 100)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}, ${word}`}
      className={cx('flex flex-col rounded-3xl bg-surface px-3.5 pb-4 pt-3.5 text-left shadow-card', PRESS)}
    >
      <span className="flex items-center justify-between gap-2">
        <Icon className="size-[18px]" aria-hidden />
        <span
          className={cx(
            'inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium',
            over ? 'text-[var(--g-alert)]' : 'text-muted',
          )}
        >
          {over ? <span className="size-1.5 rounded-full bg-[var(--g-alert)]" aria-hidden /> : null}
          {word}
        </span>
      </span>
      <span className="mt-3 line-clamp-2 text-[14px] font-medium leading-[18px]">{label}</span>
      <span className="mt-auto block pt-3" aria-hidden>
        <span className="block h-1 overflow-hidden rounded-sm bg-[var(--g-track)]">
          <motion.span
            className={cx('block h-full rounded-sm', over ? 'bg-[var(--g-alert)]' : 'bg-[var(--accent)]')}
            initial={false}
            animate={{ width: `${used}%` }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </span>
      </span>
    </button>
  )
}

function GarageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="garage-stage mx-3 mt-2.5 h-[316px] rounded-3xl">
        <div className="absolute inset-x-5 top-[18px] z-[4]">
          <span className="skeleton block h-3 w-16 rounded-md" />
          <span className="skeleton mt-3 block h-7 w-40 rounded-md" />
          <span className="skeleton mt-3 block h-3 w-28 rounded-md" />
        </div>
        <div className="garage-glow" aria-hidden />
      </div>
      <div className="px-5 pt-5">
        <span className="skeleton block h-3 w-20 rounded-md" />
        <span className="skeleton mt-2 block h-12 w-48 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-[46px]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col rounded-3xl bg-surface px-3.5 pb-4 pt-3.5 shadow-card">
            <span className="flex items-center justify-between">
              <span className="skeleton block size-[18px] rounded-md" />
              <span className="skeleton block h-3 w-11 rounded-md" />
            </span>
            <span className="skeleton mt-3.5 block h-3 w-3/5 rounded-md" />
            <span className="skeleton mt-3.5 block h-1 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyGarage({ onAdd }: { onAdd: () => void }) {
  return (
    <>
      <div className="garage-stage mx-3 mt-2.5 h-[316px] rounded-3xl">
        <h2 className={cx(DISPLAY, 'absolute inset-x-5 top-[18px] z-[4]')}>Sin Vehículos todavía</h2>
        <div className="garage-glow" aria-hidden />
        <div className="garage-contact opacity-35" aria-hidden />
      </div>
      <p className="mx-5 mt-[22px] text-[15px] leading-[22px] text-muted">
        Agrega tu Vehículo y te avisamos cuándo toca cada Servicio.
      </p>
      <div
        className="absolute inset-x-5"
        style={{ bottom: 'calc(var(--dock-height) + max(var(--safe-bottom), 0.6rem) + 1rem)' }}
      >
        <button
          type="button"
          onClick={onAdd}
          className={cx(
            'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-[22px] text-[16px] font-medium text-bg',
            PRESS,
          )}
        >
          <Plus className="size-[18px]" aria-hidden />
          Agregar mi Vehículo
        </button>
      </div>
    </>
  )
}
