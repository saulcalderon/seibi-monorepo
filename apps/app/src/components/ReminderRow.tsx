import type { Reminder } from '@seibi/maintenance-engine/reminders'
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer'
import { ChevronRight } from 'lucide-react'
import { knowledgeProfile, taskLabel, type KnowledgeLevel } from '../lib/knowledge'
import { reminderDueText } from '../lib/reminderText'
import { taskIcon, type MaintenanceTask } from '../lib/tasks'
import { IconTile } from '../ui/Card'
import { ProgressBar } from '../ui/feedback'
import { cx } from '../ui/cx'

export function ReminderRow({
  reminder,
  task,
  measure,
  level,
  vehicleLabel,
  onClick,
}: {
  reminder: Reminder
  task: MaintenanceTask | undefined
  measure: OdometerMeasure
  level: KnowledgeLevel | null | undefined
  vehicleLabel?: string
  onClick: () => void
}) {
  const k = knowledgeProfile(level)
  const tone = reminder.snoozed ? 'unknown' : reminder.status
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2"
    >
      <IconTile icon={taskIcon(reminder.taskCode)} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[0.95rem] font-semibold">
            {taskLabel(task, reminder.taskCode, k)}
          </span>
          {reminder.source === 'general' && k.detailed ? (
            <span className="shrink-0 rounded-md bg-surface-3 px-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
              General
            </span>
          ) : null}
        </div>
        <div
          className={cx(
            'mt-0.5 truncate text-[0.82rem]',
            reminder.status === 'overdue' && !reminder.snoozed ? 'font-semibold text-overdue' : 'text-muted',
          )}
        >
          {vehicleLabel ? `${vehicleLabel} · ` : ''}
          {reminder.snoozed ? 'Pospuesto' : reminderDueText(reminder, measure)}
        </div>
        {reminder.status !== 'unknown' ? (
          <div className="mt-2">
            <ProgressBar value={reminder.used} status={reminder.snoozed ? 'unknown' : reminder.status} />
          </div>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
    </button>
  )
}
