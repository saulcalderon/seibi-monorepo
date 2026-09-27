import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { ReminderStatus } from '@seibi/maintenance-engine/reminders'
import { Button } from './Button'
import { cx } from './cx'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-2xl', className)} aria-hidden />
}

export function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-52 w-full rounded-[1.5rem]" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-16 items-center justify-center rounded-[1.4rem] bg-radiant-soft text-radiant">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="text-[1.15rem]">{title}</h3>
      <p className="mt-1.5 max-w-[18rem] text-[0.9rem] text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'No pudimos cargar tus datos',
  body = 'Revisa tu conexión a internet e intenta de nuevo.',
  onRetry,
}: {
  title?: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-16 items-center justify-center rounded-[1.4rem] bg-overdue-soft text-overdue">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h3 className="text-[1.15rem]">{title}</h3>
      <p className="mt-1.5 max-w-[18rem] text-[0.9rem] text-muted">{body}</p>
      {onRetry ? (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} className="mt-5">
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}

export const STATUS_META: Record<
  ReminderStatus,
  { label: string; icon: LucideIcon; text: string; bg: string; bar: string }
> = {
  overdue: { label: 'Vencido', icon: CircleAlert, text: 'text-overdue', bg: 'bg-overdue-soft', bar: 'bg-overdue' },
  soon: { label: 'Pronto', icon: Clock, text: 'text-soon', bg: 'bg-soon-soft', bar: 'bg-soon' },
  unknown: { label: 'Revisar', icon: CircleHelp, text: 'text-unknown', bg: 'bg-unknown-soft', bar: 'bg-unknown' },
  ok: { label: 'Al día', icon: CircleCheck, text: 'text-ok', bg: 'bg-ok-soft', bar: 'bg-ok' },
}

export function StatusBadge({ status, label }: { status: ReminderStatus; label?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cx(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-bold',
        meta.bg,
        meta.text,
      )}
    >
      <Icon className="size-3.5" aria-hidden strokeWidth={2.4} />
      {label ?? meta.label}
    </span>
  )
}

export function ProgressBar({ value, status }: { value: number; status: ReminderStatus }) {
  const pct = Math.max(4, Math.min(100, Math.round(value * 100)))
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Intervalo usado"
    >
      <motion.div
        className={cx('h-full rounded-full', STATUS_META[status].bar)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

type Toast = { id: number; message: string; tone: 'ok' | 'error' }
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  const host = typeof document !== 'undefined' ? document.getElementById('root') : null
  return (
    <ToastContext.Provider value={show}>
      {children}
      {host
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-safe"
              aria-live="polite"
            >
              <AnimatePresence>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={cx(
                      'pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 text-[0.9rem] font-semibold shadow-float',
                      t.tone === 'ok' ? 'bg-inverse text-on-inverse' : 'bg-overdue text-white',
                    )}
                    role={t.tone === 'error' ? 'alert' : 'status'}
                  >
                    {t.tone === 'ok' ? (
                      <CircleCheck className="size-4.5 shrink-0" aria-hidden />
                    ) : (
                      <CircleAlert className="size-4.5 shrink-0" aria-hidden />
                    )}
                    {t.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>,
            host,
          )
        : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
