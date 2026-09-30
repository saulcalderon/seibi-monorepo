import { useState } from 'react'
import type { Reminder } from '@seibi/maintenance-engine/reminders'
import { History } from 'lucide-react'
import { useActions } from '../app/Actions'
import { knowledgeProfile, taskLabel, type KnowledgeLevel } from '../lib/knowledge'
import { COMMON_TASKS, taskIcon, type MaintenanceTask } from '../lib/tasks'
import { Card, IconTile } from '../ui/Card'
import { cx } from '../ui/cx'

/**
 * Tasks with no known last Service, as one compact prompt instead of a row
 * each. Tapping a task asks "¿Cuándo fue la última vez?".
 */
export function UnknownTasks({
  vehicleId,
  vehicleLabel,
  reminders,
  tasks,
  level,
  initial = 5,
}: {
  vehicleId: string
  vehicleLabel?: string
  reminders: Reminder[]
  tasks: Map<string, MaintenanceTask>
  level: KnowledgeLevel | null | undefined
  initial?: number
}) {
  const actions = useActions()
  const [all, setAll] = useState(false)
  const k = knowledgeProfile(level)
  if (reminders.length === 0) return null
  // Ask about the tasks people know best first.
  const rank = (code: string) => {
    const i = COMMON_TASKS.indexOf(code)
    return i === -1 ? COMMON_TASKS.length + (tasks.get(code)?.sortOrder ?? 0) : i
  }
  const ordered = [...reminders].sort((a, b) => rank(a.taskCode) - rank(b.taskCode))
  const shown = all ? ordered : ordered.slice(0, initial)
  const dontKnow = reminders.filter((r) => r.unknownReason === 'dont_know').length

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <IconTile icon={History} tone="unknown" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-bold">
            Completa tu historial{vehicleLabel ? ` · ${vehicleLabel}` : ''}
          </p>
          <p className="mt-0.5 text-[0.84rem] text-muted">
            No sabemos cuándo fue la última vez de {reminders.length}{' '}
            {reminders.length === 1 ? 'tarea' : 'tareas'}. Con una fecha aproximada basta.
            {dontKnow > 0 ? ` En ${dontKnow} dijiste “No sé”: conviene revisarlas en tu próximo Servicio.` : ''}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((r) => {
          const Icon = taskIcon(r.taskCode)
          return (
            <button
              key={r.taskCode}
              type="button"
              onClick={() => actions.askLastDone(vehicleId, r.taskCode)}
              className={cx(
                'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[0.84rem] font-semibold ring-1',
                r.unknownReason === 'dont_know' ? 'bg-unknown-soft ring-transparent' : 'bg-surface-2 ring-line',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {taskLabel(tasks.get(r.taskCode), r.taskCode, k)}
            </button>
          )
        })}
        {reminders.length > initial ? (
          <button
            type="button"
            onClick={() => setAll((a) => !a)}
            className="min-h-10 rounded-full px-3 text-[0.84rem] font-semibold text-radiant"
            aria-expanded={all}
          >
            {all ? 'Ver menos' : `Ver ${reminders.length - initial} más`}
          </button>
        ) : null}
      </div>
    </Card>
  )
}
