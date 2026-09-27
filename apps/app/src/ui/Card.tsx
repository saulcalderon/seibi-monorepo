import type { HTMLAttributes, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cx } from './cx'

export function Card({
  className,
  children,
  as: As = 'div',
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'li' }) {
  return (
    <As className={cx('rounded-[1.5rem] bg-surface shadow-card', className)} {...rest}>
      {children}
    </As>
  )
}

export function SectionHeader({
  title,
  action,
  onAction,
  className,
}: {
  title: string
  action?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cx('flex items-end justify-between px-1', className)}>
      <h2 className="text-[1.05rem] text-ink">{title}</h2>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="-mr-1 inline-flex min-h-11 items-center gap-0.5 px-1 text-[0.85rem] font-semibold text-radiant"
        >
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/** A tappable row inside a Card list. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  chevron = Boolean(onClick),
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  chevron?: boolean
  className?: string
}) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.95rem] font-semibold text-ink">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[0.82rem] text-muted">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
      {chevron ? <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden /> : null}
    </>
  )
  const base = 'flex w-full items-center gap-3 px-4 py-3.5 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(base, 'min-h-14 transition-colors active:bg-surface-2', className)}>
      {content}
    </button>
  ) : (
    <div className={cx(base, className)}>{content}</div>
  )
}

export function IconTile({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>
  tone?: 'neutral' | 'radiant' | 'ok' | 'soon' | 'overdue' | 'unknown'
  size?: 'sm' | 'md'
}) {
  const tones = {
    neutral: 'bg-surface-3 text-ink',
    radiant: 'bg-radiant-soft text-radiant',
    ok: 'bg-ok-soft text-ok',
    soon: 'bg-soon-soft text-soon',
    overdue: 'bg-overdue-soft text-overdue',
    unknown: 'bg-unknown-soft text-unknown',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-2xl',
        size === 'md' ? 'size-11' : 'size-9 rounded-xl',
        tones[tone],
      )}
    >
      <Icon className={size === 'md' ? 'size-5' : 'size-4'} strokeWidth={2.1} aria-hidden />
    </span>
  )
}
