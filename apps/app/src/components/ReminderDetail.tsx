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
import { STATUS_META, useToast } from '../ui/feedback'
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
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={vehicleName(vehicle)}
      panelClassName="bg-[#f7f2ee]"
    >
      {reminder ? (
        <div className="flex flex-col gap-3 pb-2 text-ink">
          <div className="rounded-[1.35rem] bg-surface px-3.5 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-3 text-ink">
                <Icon className="size-6" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex h-8 items-center rounded-full bg-surface-2 px-3 text-[0.75rem] font-semibold">
                  {STATUS_META[reminder.status].label}
                </span>
                <p className="mt-0.5 text-[0.8rem] opacity-70">
                  {reminderDueText(reminder, vehicle.measure)}
                </p>
              </div>
            </div>
            {reminder.status !== 'unknown' ? (
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(4, Math.min(100, Math.round(reminder.used * 100)))}
                aria-label="Intervalo usado"
              >
                <div
                  className="h-full rounded-full bg-ink/30"
                  style={{ width: `${Math.max(4, Math.min(100, Math.round(reminder.used * 100)))}%` }}
                />
              </div>
            ) : null}
          </div>

          {task && (k.explain || reminder.status === 'unknown') ? (
            <p className="flex gap-2 rounded-[1.35rem] bg-surface px-3.5 py-3 text-[0.86rem]">
              <Info className="mt-0.5 size-4 shrink-0 opacity-70" aria-hidden />
              {task.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-1 gap-3 rounded-[1.35rem] bg-surface p-4 text-[0.88rem]">
            {intervalText(reminder, vehicle.measure) ? (
              <div>
                <dt className="text-[0.8rem] opacity-70">Frecuencia</dt>
                <dd className="font-semibold">
                  {intervalText(reminder, vehicle.measure)}
                  {reminder.severe ? ' (uso severo)' : ''}
                </dd>
              </div>
            ) : null}
            {reminder.lastDone ? (
              <div>
                <dt className="text-[0.8rem] opacity-70">Última vez</dt>
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
                <dt className="text-[0.8rem] opacity-70">Toca a los</dt>
                <dd className="font-semibold tabular">
                  {formatNumber(reminder.dueReading)} {vehicle.measure}
                  {reminder.dueOn ? ` o el ${formatDay(reminder.dueOn, 'long')}` : ''}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[0.8rem] opacity-70">Fuente</dt>
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
                        className="inline-flex items-center gap-1 text-[0.82rem] font-semibold"
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
            <Button variant="secondary" size="lg" icon={CircleCheck} block onClick={onDone}>
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
