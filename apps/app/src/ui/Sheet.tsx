import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import { cx } from './cx'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Full-height sheet for long forms. */
  tall?: boolean
  /** Panel surface. Defaults to the app background. */
  panelClassName?: string
  /** Seibi v3 sheet: white panel, v3 palette, light title, softer scrim. */
  look?: 'v3'
}

/**
 * Bottom sheet. Rendered into #root so it stays inside the phone frame on
 * desktop. Closes on backdrop tap, Escape, or dragging the handle down.
 */
export function Sheet({ open, onClose, title, description, children, footer, tall, panelClassName, look }: SheetProps) {
  const v3 = look === 'v3'
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useDragControls()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => panelRef.current?.focus(), 30)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
      previous?.focus?.()
    }
  }, [open, onClose])

  const host = typeof document !== 'undefined' ? document.getElementById('root') : null
  if (!host) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="presentation">
          <motion.div
            className={cx('absolute inset-0', v3 ? 'bg-[rgb(14_15_17/32%)]' : 'bg-black/45 backdrop-blur-[2px]')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cx(
              'relative flex w-full flex-col rounded-t-[1.75rem] shadow-float outline-none',
              panelClassName ?? (v3 ? 'v3 bg-surface' : 'bg-bg'),
              tall ? 'h-[94%]' : 'max-h-[92%]',
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
          >
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5"
              onPointerDown={(e) => drag.start(e)}
            >
              <span
                className={cx('rounded-full', v3 ? 'h-[5px] w-9 bg-[#d4d4d7]' : 'h-1.5 w-10 bg-surface-3')}
                aria-hidden
              />
            </div>
            <header className="flex items-start gap-3 px-5 pb-3 pt-1">
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className={
                    v3
                      ? 'pt-2 font-sans text-[26px] font-light leading-[28px] tracking-[-0.025em]'
                      : 'text-[1.3rem] leading-tight'
                  }
                >
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-[0.88rem] text-muted">{description}</p>
                ) : null}
              </div>
              <IconButton icon={X} label="Cerrar" onClick={onClose} className="-mr-2 -mt-1" />
            </header>
            <div className="scroll-area min-h-0 flex-1 px-5 pb-4">{children}</div>
            {footer ? (
              <div className="border-t border-line bg-bg px-5 pb-safe pt-3">{footer}</div>
            ) : (
              <div className="pb-safe" />
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    host,
  )
}
