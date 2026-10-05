import type { Reminder } from '@seibi/maintenance-engine/reminders'
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer'
import { ChevronRight } from 'lucide-react'
import { formatDay } from '../lib/format'
import { knowledgeProfile, taskLabel, type KnowledgeLevel } from '../lib/knowledge'
import { reminderDueText } from '../lib/reminderText'
import { taskIcon, type MaintenanceTask } from '../lib/tasks'
import { IconTile } from '../ui/Card'
import { ProgressBar, STATUS_META } from '../ui/feedback'
import { cx } from '../ui/cx'

export function ReminderRow({
  reminder,
  task,
  measure,
  level,
  vehicleLabel,
  compact = false,
  stacked = false,
  onClick,
}: {
  reminder: Reminder
  task: MaintenanceTask | undefined
  measure: OdometerMeasure
  level: KnowledgeLevel | null | undefined
  vehicleLabel?: string
  /** One line of status, no progress bar. For dense lists. */
  compact?: boolean
  /** Inicio: timeline row with status pill. */
  stacked?: boolean
  onClick: () => void
}) {
  const k = knowledgeProfile(level)
  const tone = reminder.snoozed ? 'unknown' : reminder.status
  const due = reminder.snoozed ? 'Pospuesto' : reminderDueText(reminder, measure)
  const showBar = reminder.status !== 'unknown' && !compact
  const Icon = taskIcon(reminder.taskCode)
  const dueOn = reminder.dueOn ?? reminder.expectedOn

  if (stacked) {
    const meta = STATUS_META[tone]
    const urgent = tone === 'overdue' || tone === 'soon'
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
      >
        <span
          className={cx(
            'relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full',
            urgent ? cx(meta.bg, meta.text) : 'bg-surface-3 text-muted',
          )}
        >
          <Icon className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-[1.02rem] font-semibold">
              {taskLabel(task, reminder.taskCode, k)}
            </span>
            <span
              className={cx(
                'shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold',
                tone === 'ok' || urgent ? cx(meta.bg, meta.text) : 'bg-surface-3 text-muted',
              )}
            >
              {reminder.snoozed ? 'Pospuesto' : meta.label}
            </span>
          </span>
          {dueOn || vehicleLabel ? (
            <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">
              {vehicleLabel ? `${vehicleLabel} · ` : ''}
              {dueOn ? <span className="tabular">{formatDay(dueOn)}</span> : null}
            </span>
          ) : (
            <span className={cx('mt-0.5 block truncate text-[0.76rem]', urgent ? cx('font-semibold', meta.text) : 'text-muted')}>
              {due}
            </span>
          )}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 px-4 text-left transition-colors active:bg-surface-2',
        compact ? 'py-3' : 'py-3.5',
      )}
    >
      <IconTile icon={Icon} tone="neutral" size={compact ? 'sm' : 'md'} />
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
            'mt-0.5 truncate text-[0.82rem] opacity-70',
          )}
        >
          {vehicleLabel ? `${vehicleLabel} · ` : ''}
          {due}
        </div>
        {showBar ? (
          <div className="mt-2">
            <ProgressBar value={reminder.used} status={tone} />
          </div>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
    </button>
  )
}
