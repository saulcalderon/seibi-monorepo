import { useState } from 'react'
import { BellPlus, BellRing, CalendarClock, CarFront, PartyPopper, Plus } from 'lucide-react'
import type { Reminder } from '@seibi/maintenance-engine/reminders'
import { daysBetween } from '@seibi/maintenance-engine/days'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { ReminderRow } from '../components/ReminderRow'
import { UnknownTasks } from '../components/UnknownTasks'
import { useAuthSession } from '../lib/authSession'
import { formatDay, relativeDays, todayIso } from '../lib/format'
import { useGarage, type VehicleView } from '../lib/garage'
import { useCompleteManualReminder } from '../lib/mutations'
import { useProfile, useUpdateProfile } from '../lib/profile'
import { enablePush, pushPermission, pushSupported } from '../lib/push'
import { taskMap } from '../lib/tasks'
import { Button, IconButton } from '../ui/Button'
import { Card, IconTile, SectionHeader } from '../ui/Card'
import { Chip } from '../ui/fields'
import { EmptyState, ErrorState, ScreenSkeleton, useToast } from '../ui/feedback'

type Entry = { vehicle: VehicleView; reminder: Reminder }

export function Avisos() {
  const garage = useGarage()
  const actions = useActions()
  const profile = useProfile()
  const [vehicleFilter, setVehicleFilter] = useState<string | 'all'>('all')
  const [showOk, setShowOk] = useState(false)
  const complete = useCompleteManualReminder()
  const toast = useToast()
  const byCode = taskMap(garage.tasks)
  const today = todayIso()

  if (garage.isLoading) {
    return (
      <Screen title="Avisos">
        <ScreenSkeleton />
      </Screen>
    )
  }
  if (garage.isError) {
    return (
      <Screen title="Avisos">
        <ErrorState onRetry={garage.refetch} />
      </Screen>
    )
  }
  if (garage.vehicles.length === 0) {
    return (
      <Screen title="Avisos">
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

  const vehicles = garage.vehicles.filter((v) => vehicleFilter === 'all' || v.id === vehicleFilter)
  const all: Entry[] = vehicles.flatMap((vehicle) => vehicle.reminders.map((reminder) => ({ vehicle, reminder })))
  const pick = (fn: (r: Reminder) => boolean) =>
    all
      .filter((e) => fn(e.reminder))
      .sort((a, b) => (a.reminder.expectedOn ?? '9999') < (b.reminder.expectedOn ?? '9999') ? -1 : 1)

  const overdue = pick((r) => !r.snoozed && r.status === 'overdue')
  const soon = pick((r) => !r.snoozed && r.status === 'soon')
  const snoozed = pick((r) => r.snoozed && r.status !== 'unknown')
  const ok = pick((r) => !r.snoozed && r.status === 'ok')
  const manual = vehicles
    .flatMap((vehicle) => vehicle.openManualReminders.map((m) => ({ vehicle, m })))
    .sort((a, b) => (a.m.dueOn < b.m.dueOn ? -1 : 1))
  const appointments = vehicles
    .flatMap((vehicle) => vehicle.upcomingAppointments.map((a) => ({ vehicle, a })))
    .sort((a, b) => (a.a.scheduledOn < b.a.scheduledOn ? -1 : 1))
  const multi = garage.vehicles.length > 1

  const list = (entries: Entry[]) => (
    <Card className="divide-y divide-line overflow-hidden">
      {entries.map(({ vehicle, reminder }) => (
        <ReminderRow
          key={`${vehicle.id}:${reminder.taskCode}`}
          reminder={reminder}
          task={byCode.get(reminder.taskCode)}
          measure={vehicle.measure}
          level={profile.data?.knowledgeLevel}
          vehicleLabel={multi ? vehicle.model : undefined}
          onClick={() => actions.openReminder(vehicle.id, reminder.taskCode)}
        />
      ))}
    </Card>
  )

  const group = (title: string, entries: Entry[]) =>
    entries.length > 0 ? (
      <section className="flex flex-col gap-3">
        <SectionHeader title={`${title} (${entries.length})`} />
        {list(entries)}
      </section>
    ) : null

  return (
    <Screen
      title="Avisos"
      subtitle={
        overdue.length + soon.length > 0
          ? `${overdue.length + soon.length} por atender`
          : 'Todo al día'
      }
      actions={
        <IconButton icon={BellPlus} label="Nuevo Recordatorio" variant="secondary" onClick={() => actions.addReminder()} />
      }
    >
      <div className="flex flex-col gap-6">
        {multi ? (
          <div className="scroll-area flex gap-2 overflow-x-auto px-5">
            <Chip selected={vehicleFilter === 'all'} onClick={() => setVehicleFilter('all')}>
              Todos
            </Chip>
            {garage.vehicles.map((v) => (
              <Chip
                key={v.id}
                selected={vehicleFilter === v.id}
                onClick={() => setVehicleFilter(v.id)}
                count={v.pending || undefined}
              >
                {v.model}
              </Chip>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 px-5">
          <PushBanner />

          {overdue.length + soon.length === 0 ? (
            <Card className="flex items-center gap-3 p-4">
              <IconTile icon={PartyPopper} tone="ok" />
              <p className="text-[0.9rem] text-muted">
                No hay nada pendiente. Te avisaremos cuando se acerque el próximo mantenimiento.
              </p>
            </Card>
          ) : null}

          {group('Vencidos', overdue)}
          {group('Pronto', soon)}
          {vehicles.map((v) => (
            <UnknownTasks
              key={v.id}
              vehicleId={v.id}
              vehicleLabel={multi ? v.model : undefined}
              reminders={v.reminders.filter((r) => r.status === 'unknown')}
              tasks={byCode}
              level={profile.data?.knowledgeLevel}
              initial={4}
            />
          ))}

          {appointments.length + manual.length > 0 ? (
            <section className="flex flex-col gap-3">
              <SectionHeader title="Fechas guardadas" />
              <Card className="divide-y divide-line overflow-hidden">
                {appointments.map(({ vehicle, a }) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                    <IconTile icon={CalendarClock} tone="radiant" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.92rem] font-semibold">
                        Cita{multi ? ` · ${vehicle.model}` : ''}
                        {a.shop ? ` · ${a.shop}` : ''}
                      </p>
                      <p className="text-[0.8rem] text-muted">
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
                {manual.map(({ vehicle, m }) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                    <IconTile icon={BellRing} tone={m.dueOn < today ? 'overdue' : 'neutral'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.92rem] font-semibold">
                        {m.title}
                        {multi ? <span className="font-normal text-muted"> · {vehicle.model}</span> : null}
                      </p>
                      <p className="text-[0.8rem] text-muted">
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
              </Card>
            </section>
          ) : null}

          {group('Pospuestos', snoozed)}

          {ok.length > 0 ? (
            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowOk((s) => !s)}
                aria-expanded={showOk}
                className="flex min-h-11 items-center justify-between px-1 text-left"
              >
                <h2 className="text-[1.05rem]">Al día ({ok.length})</h2>
                <span className="text-[0.85rem] font-semibold text-radiant">{showOk ? 'Ocultar' : 'Ver'}</span>
              </button>
              {showOk ? list(ok) : null}
            </section>
          ) : null}
        </div>
      </div>
    </Screen>
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
      <IconTile icon={BellRing} tone="radiant" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem] font-bold">Recibe los avisos en tu teléfono</p>
        <p className="text-[0.8rem] text-muted">Una notificación cuando algo se acerque. Nada más.</p>
      </div>
      <Button
        size="sm"
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
