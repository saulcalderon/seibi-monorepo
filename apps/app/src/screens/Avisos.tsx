import { useEffect, useState } from 'react'
import { BellPlus, BellRing, CalendarClock, CarFront, ChevronDown, History, PartyPopper, Plus } from 'lucide-react'
import type { Reminder } from '@seibi/maintenance-engine/reminders'
import { daysBetween } from '@seibi/maintenance-engine/days'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { ReminderRow } from '../components/ReminderRow'
import { UnknownTasks } from '../components/UnknownTasks'
import { VehicleVisual } from '../components/VehicleVisual'
import { useActiveVehicle } from '../lib/activeVehicle'
import { useAuthSession } from '../lib/authSession'
import { formatDay, formatDistance, relativeDays, todayIso, vehicleChoiceLabel, vehicleName } from '../lib/format'
import { byUrgency, useGarage, type VehicleView } from '../lib/garage'
import { useCompleteManualReminder } from '../lib/mutations'
import { useProfile, useUpdateProfile } from '../lib/profile'
import { enablePush, pushPermission, pushSupported } from '../lib/push'
import { taskMap, type MaintenanceTask } from '../lib/tasks'
import type { KnowledgeLevel } from '../lib/knowledge'
import { Button, IconButton } from '../ui/Button'
import { Card, IconTile } from '../ui/Card'
import { cx } from '../ui/cx'
import { EmptyState, ErrorState, ScreenSkeleton, useToast } from '../ui/feedback'

const byExpected = (a: Reminder, b: Reminder) => ((a.expectedOn ?? '9999') < (b.expectedOn ?? '9999') ? -1 : 1)

export function Avisos() {
  const garage = useGarage()
  const actions = useActions()
  const profile = useProfile()
  const { active, select } = useActiveVehicle(garage.vehicles)
  const byCode = taskMap(garage.tasks)
  const [showOthers, setShowOthers] = useState(false)

  useEffect(() => {
    setShowOthers(false)
    document.querySelector('main.scroll-area')?.scrollTo({ top: 0 })
  }, [active?.id])

  if (garage.isLoading) {
    return (
      <Screen title="Avisos" className="min-h-full bg-[#f7f2ee]">
        <ScreenSkeleton />
      </Screen>
    )
  }
  if (garage.isError) {
    return (
      <Screen title="Avisos" className="min-h-full bg-[#f7f2ee]">
        <ErrorState onRetry={garage.refetch} />
      </Screen>
    )
  }
  if (garage.vehicles.length === 0 || !active) {
    return (
      <Screen title="Avisos" className="min-h-full bg-[#f7f2ee]">
        <EmptyState
          icon={CarFront}
          title="Aún no hay avisos"
          body="Agrega un Vehículo y te diremos qué mantenimiento le toca y cuándo."
          action={
            <Button icon={Plus} onClick={actions.addVehicle}>
              Agregar Vehículo
            </Button>
          }
        />
      </Screen>
    )
  }

  const others = garage.vehicles.filter((v) => v.id !== active.id).sort(byUrgency)
  const pendingOthers = others.filter((v) => v.pending > 0)
  const lead = pendingOthers[0]

  return (
    <Screen
      className="min-h-full bg-[#f7f2ee]"
      title="Avisos"
      actions={
        <IconButton icon={BellPlus} label="Nuevo Recordatorio" variant="secondary" onClick={() => actions.addReminder()} />
      }
    >
      <div className="flex flex-col gap-5 px-5">
        {lead ? (
          <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            <button
              type="button"
              aria-expanded={showOthers}
              onClick={() => setShowOthers((open) => !open)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors active:bg-surface-2"
            >
              <span
                className="size-2 shrink-0 rounded-full bg-ink/30"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[0.82rem] text-muted">
                <span className="font-semibold text-ink">{vehicleChoiceLabel(lead, garage.vehicles)}</span>
                {` · ${lead.pending} por atender`}
                {pendingOthers.length > 1 ? ` · y ${pendingOthers.length - 1} más` : ''}
              </span>
              <ChevronDown
                className={cx('size-4 shrink-0 text-subtle transition-transform', showOthers && 'rotate-180')}
                aria-hidden
              />
            </button>
            {showOthers ? (
              <div className="divide-y divide-line border-t border-line">
                {others.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => select(v.id)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors active:bg-surface-2"
                  >
                    <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-b from-surface-2 to-surface-3">
                      <VehicleVisual
                        render={v.render}
                        bodyType={v.bodyType}
                        color={v.color}
                        alt=""
                        crop
                        className="size-full"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.84rem] font-semibold">
                        {vehicleChoiceLabel(v, garage.vehicles)}
                      </span>
                      <span className="block truncate text-[0.75rem] text-muted">
                        {v.year} · {identity(v)}
                      </span>
                    </span>
                    <span
                      className={cx(
                        'shrink-0 text-[0.75rem] font-semibold',
                        'text-ink',
                      )}
                    >
                      {v.pending > 0 ? `${v.pending} por atender` : 'Al día'}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <PushBanner />
        <VehicleAvisos
          key={active.id}
          vehicle={active}
          tasks={byCode}
          level={profile.data?.knowledgeLevel}
        />
      </div>
    </Screen>
  )
}

/** Plate if any, then the odometer: tells twins of the same model and year apart. */
function identity(v: VehicleView) {
  const km = v.odometer != null ? formatDistance(v.odometer, v.measure) : null
  return [v.plate, km].filter(Boolean).join(' · ') || 'Sin Kilometraje'
}

function VehicleAvisos({
  vehicle,
  tasks,
  level,
}: {
  vehicle: VehicleView
  tasks: Map<string, MaintenanceTask>
  level: KnowledgeLevel | null | undefined
}) {
  const actions = useActions()
  const complete = useCompleteManualReminder()
  const toast = useToast()
  const [showUnknown, setShowUnknown] = useState(false)
  const [showSoon, setShowSoon] = useState(false)
  const [showOk, setShowOk] = useState(false)
  const [showSnoozed, setShowSnoozed] = useState(false)
  const today = todayIso()

  const overdue = vehicle.reminders
    .filter((r) => !r.snoozed && r.status === 'overdue')
    .sort(byExpected)
  const soon = vehicle.reminders.filter((r) => !r.snoozed && r.status === 'soon').sort(byExpected)
  const unknown = vehicle.reminders.filter((r) => r.status === 'unknown')
  const snoozed = vehicle.reminders.filter((r) => r.snoozed && r.status !== 'unknown').sort(byExpected)
  const ok = vehicle.reminders.filter((r) => !r.snoozed && r.status === 'ok').sort(byExpected)
  const appointments = [...vehicle.upcomingAppointments].sort((a, b) => (a.scheduledOn < b.scheduledOn ? -1 : 1))
  const manual = [...vehicle.openManualReminders].sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1))

  const row = (reminder: Reminder) => (
    <ReminderRow
      key={reminder.taskCode}
      compact
      reminder={reminder}
      task={tasks.get(reminder.taskCode)}
      measure={vehicle.measure}
      level={level}
      onClick={() => actions.openReminder(vehicle.id, reminder.taskCode)}
    />
  )

  return (
    <section className="flex flex-col gap-3" aria-label={`${vehicleName(vehicle)} ${vehicle.year}`}>
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-b from-surface-2 to-surface-3 ring-1 ring-line">
          <VehicleVisual
            render={vehicle.render}
            bodyType={vehicle.bodyType}
            color={vehicle.color}
            alt=""
            crop
            className="size-full"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.02rem]">{vehicleName(vehicle)}</h2>
          <p className="truncate text-[0.78rem] text-muted">
            {vehicle.year} · {identity(vehicle)}
          </p>
        </div>
        <span className="shrink-0">
          <span className="inline-flex h-7 items-center rounded-full bg-surface-2 px-2.5 text-[0.72rem] font-semibold">
            {overdue.length > 0
              ? `${overdue.length} por atender`
              : vehicle.health === 'unknown'
                ? 'Sin datos'
                : 'Al día'}
          </span>
        </span>
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {overdue.length === 0 && soon.length === 0 && appointments.length + manual.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconTile icon={PartyPopper} tone="neutral" size="sm" />
            <p className="text-[0.86rem] text-muted">Nada pendiente. Te avisaremos cuando se acerque el próximo.</p>
          </div>
        ) : null}

        {overdue.map(row)}

        {appointments.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
            <IconTile icon={CalendarClock} tone="neutral" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.92rem] font-semibold">
                Cita{a.shop ? ` · ${a.shop}` : ''}
              </p>
              <p className="truncate text-[0.8rem] text-muted">
                {formatDay(a.scheduledOn, 'long')} · {relativeDays(daysBetween(today, a.scheduledOn))}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                actions.logService({ vehicleId: vehicle.id, taskCodes: a.taskCodes, appointmentId: a.id, shop: a.shop })
              }
            >
              Hecho
            </Button>
          </div>
        ))}

        {manual.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <IconTile icon={BellRing} tone="neutral" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.92rem] font-semibold">{m.title}</p>
              <p className="truncate text-[0.8rem] text-muted">
                {formatDay(m.dueOn, 'long')} · {relativeDays(daysBetween(today, m.dueOn))}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await complete.mutateAsync({ id: m.id, done: true })
                toast('Hecho')
              }}
            >
              Hecho
            </Button>
          </div>
        ))}

        {unknown.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowUnknown((s) => !s)}
            aria-expanded={showUnknown}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
          >
            <IconTile icon={History} tone="neutral" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.92rem] font-semibold">
                {unknown.length} {unknown.length === 1 ? 'tarea sin fecha' : 'tareas sin fecha'}
              </p>
              <p className="truncate text-[0.8rem] text-muted">Dinos cuándo fue la última vez</p>
            </div>
            <ChevronDown
              className={cx('size-4 shrink-0 text-subtle transition-transform', showUnknown && 'rotate-180')}
              aria-hidden
            />
          </button>
        ) : null}

      </Card>

      <Card className="divide-y divide-line overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSoon((s) => !s)}
          aria-expanded={showSoon}
          className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left"
        >
          <span className="text-[0.95rem] font-semibold">Por vencer</span>
          <span className="flex items-center gap-1 text-[0.84rem] font-semibold text-muted">
            {soon.length}
            <ChevronDown className={cx('size-4 transition-transform', showSoon && 'rotate-180')} aria-hidden />
          </span>
        </button>
        {showSoon ? (
          soon.length > 0 ? (
            soon.map(row)
          ) : (
            <p className="px-4 py-3 text-[0.84rem] text-muted">Nada por vencer. Te avisaremos cuando se acerque.</p>
          )
        ) : null}
      </Card>

      {ok.length > 0 ? (
        <Card className="divide-y divide-line overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOk((s) => !s)}
            aria-expanded={showOk}
            className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left"
          >
            <span className="text-[0.95rem] font-semibold">Al día</span>
            <span className="flex items-center gap-1 text-[0.84rem] font-semibold text-muted">
              {ok.length}
              <ChevronDown className={cx('size-4 transition-transform', showOk && 'rotate-180')} aria-hidden />
            </span>
          </button>
          {showOk ? ok.map(row) : null}
        </Card>
      ) : null}

      {snoozed.length > 0 ? (
        <Card className="divide-y divide-line overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSnoozed((s) => !s)}
            aria-expanded={showSnoozed}
            className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left"
          >
            <span className="text-[0.95rem] font-semibold">Pospuestos</span>
            <span className="flex items-center gap-1 text-[0.84rem] font-semibold text-muted">
              {snoozed.length}
              <ChevronDown className={cx('size-4 transition-transform', showSnoozed && 'rotate-180')} aria-hidden />
            </span>
          </button>
          {showSnoozed ? snoozed.map(row) : null}
        </Card>
      ) : null}

      {showUnknown ? (
        <UnknownTasks vehicleId={vehicle.id} reminders={unknown} tasks={tasks} level={level} initial={4} />
      ) : null}
    </section>
  )
}

function PushBanner() {
  const { user } = useAuthSession()
  const profile = useProfile()
  const update = useUpdateProfile()
  const toast = useToast()
  const [permission, setPermission] = useState(pushPermission())
  const [busy, setBusy] = useState(false)

  if (!pushSupported() || permission === 'granted' || permission === 'denied') return null
  if (profile.data && !profile.data.notificationsEnabled) return null

  return (
    <Card className="flex items-center gap-3 p-4">
      <IconTile icon={BellRing} tone="neutral" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem] font-bold">Recibe los avisos en tu teléfono</p>
        <p className="text-[0.8rem] text-muted">Una notificación cuando algo se acerque. Nada más.</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        loading={busy}
        onClick={async () => {
          if (!user) return
          setBusy(true)
          try {
            const ok = await enablePush(user.id)
            setPermission(pushPermission())
            if (ok) {
              update.mutate({ notificationsEnabled: true })
              toast('Notificaciones activadas')
            }
          } catch {
            toast('No pudimos activar las notificaciones', 'error')
          } finally {
            setBusy(false)
          }
        }}
      >
        Activar
      </Button>
    </Card>
  )
}
