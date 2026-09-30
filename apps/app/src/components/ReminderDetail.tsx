import { useNavigate } from '@tanstack/react-router'
import {
  BellOff,
  Calculator,
  CalendarPlus,
  CircleCheck,
  ExternalLink,
  History,
  Info,
  RotateCcw,
} from 'lucide-react'
import type { VehicleView } from '../lib/garage'
import { formatDay, formatNumber, todayIso, vehicleName } from '../lib/format'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import { useReminderState } from '../lib/mutations'
import { useProfile } from '../lib/profile'
import { intervalText, reminderDueText } from '../lib/reminderText'
import { taskIcon, taskMap, useTasks } from '../lib/tasks'
import { Button } from '../ui/Button'
import { IconTile } from '../ui/Card'
import { ProgressBar, StatusBadge, useToast } from '../ui/feedback'
import { Sheet } from '../ui/Sheet'

function addDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return todayIso(d)
}

export function ReminderDetail({
  open,
  onClose,
  vehicle,
  taskCode,
  onDone,
  onPlan,
  onAskLast,
}: {
  open: boolean
  onClose: () => void
  vehicle: VehicleView | null
  taskCode: string | null
  onDone: () => void
  onPlan: () => void
  onAskLast: () => void
}) {
  const { data: tasks } = useTasks()
  const profile = useProfile()
  const k = knowledgeProfile(profile.data?.knowledgeLevel)
  const task = taskCode ? taskMap(tasks).get(taskCode) : undefined
  const reminder = vehicle?.reminders.find((r) => r.taskCode === taskCode) ?? null
  const setState = useReminderState()
  const toast = useToast()
  const navigate = useNavigate()

  if (!vehicle || !taskCode) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>
  const Icon = taskIcon(taskCode)
  const title = taskLabel(task, taskCode, k)

  async function snooze(days: number | null) {
    await setState.mutateAsync({
      vehicleId: vehicle!.id,
      taskCode: taskCode!,
      patch: { snoozed_until: days == null ? null : addDaysIso(days) },
    })
    toast(days == null ? 'Aviso reactivado' : `Pospuesto ${days} días`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} description={vehicleName(vehicle)}>
      {reminder ? (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-4 shadow-card">
            <IconTile icon={Icon} tone={reminder.status} />
            <div className="min-w-0 flex-1">
              <StatusBadge status={reminder.status} />
              <p className="mt-1.5 text-[0.95rem] font-semibold">
                {reminderDueText(reminder, vehicle.measure)}
              </p>
            </div>
          </div>

          {reminder.status !== 'unknown' ? (
            <ProgressBar value={reminder.used} status={reminder.status} />
          ) : null}

          {task && (k.explain || reminder.status === 'unknown') ? (
            <p className="flex gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-[0.86rem] text-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {task.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-1 gap-3 rounded-[1.25rem] bg-surface p-4 text-[0.88rem] shadow-card">
            {intervalText(reminder, vehicle.measure) ? (
              <div>
                <dt className="text-muted">Frecuencia</dt>
                <dd className="font-semibold">
                  {intervalText(reminder, vehicle.measure)}
                  {reminder.severe ? ' (uso severo)' : ''}
                </dd>
              </div>
            ) : null}
            {reminder.lastDone ? (
              <div>
                <dt className="text-muted">Última vez</dt>
                <dd className="font-semibold">
                  {formatDay(reminder.lastDone.performedOn, 'long')}
                  {reminder.lastDone.reading != null
                    ? ` · ${formatNumber(reminder.lastDone.reading)} ${vehicle.measure}`
                    : ''}
                  {reminder.lastDone.remembered ? ' (aproximado)' : ''}
                </dd>
              </div>
            ) : null}
            {reminder.dueReading != null ? (
              <div>
                <dt className="text-muted">Toca a los</dt>
                <dd className="font-semibold tabular">
                  {formatNumber(reminder.dueReading)} {vehicle.measure}
                  {reminder.dueOn ? ` o el ${formatDay(reminder.dueOn, 'long')}` : ''}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">Fuente</dt>
              <dd className="font-semibold">
                {reminder.source === 'model'
                  ? `Plan del fabricante para tu ${vehicle.brand} ${vehicle.model}`
                  : 'Recomendación general, no específica de tu modelo'}
              </dd>
              {reminder.source === 'model' && vehicle.schedule?.sources.length ? (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {vehicle.schedule.sources.slice(0, 3).map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-radiant"
                      >
                        {s.title.length > 48 ? `${s.title.slice(0, 48)}…` : s.title}
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <Button size="lg" icon={CircleCheck} block onClick={onDone}>
              Ya lo hice: registrar Servicio
            </Button>
            {reminder.status === 'unknown' ? (
              <Button variant="secondary" icon={History} block onClick={onAskLast}>
                Decir cuándo fue la última vez
              </Button>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={CalendarPlus} onClick={onPlan}>
                Agendar
              </Button>
              <Button
                variant="secondary"
                icon={Calculator}
                onClick={() => {
                  onClose()
                  void navigate({ to: '/estimados', search: { vehicle: vehicle.id, task: taskCode } })
                }}
              >
                ¿Cuánto cuesta?
              </Button>
            </div>
            {reminder.snoozed ? (
              <Button variant="ghost" icon={RotateCcw} block onClick={() => void snooze(null)}>
                Reactivar aviso
              </Button>
            ) : reminder.status === 'overdue' || reminder.status === 'soon' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" icon={BellOff} onClick={() => void snooze(7)} loading={setState.isPending}>
                  Posponer 7 días
                </Button>
                <Button variant="ghost" onClick={() => void snooze(30)} disabled={setState.isPending}>
                  Posponer 30 días
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="pb-4 text-muted">Este aviso ya no aplica.</p>
      )}
    </Sheet>
  )
}
