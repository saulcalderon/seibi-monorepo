import type { ReactNode } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from '../ui/Button'
import { cx } from '../ui/cx'

/** A tab screen: large title, optional actions, scrolling body above the dock. */
export function Screen({
  title,
  subtitle,
  actions,
  back,
  children,
  className,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: boolean
  children: ReactNode
  className?: string
}) {
  const router = useRouter()
  const navigate = useNavigate()
  return (
    <main className="scroll-area relative flex-1">
      <div className={cx('pb-dock pt-safe', className)}>
        {title || back || actions ? (
          <header className="flex items-start gap-2 px-5 pb-4 pt-2">
            {back ? (
              <IconButton
                icon={ChevronLeft}
                label="Volver"
                variant="secondary"
                onClick={() =>
                  window.history.length > 1 ? router.history.back() : void navigate({ to: '/flota' })
                }
                className="-ml-1 mr-1"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              {title ? <h1 className="truncate text-[1.75rem] leading-tight">{title}</h1> : null}
              {subtitle ? <p className="mt-0.5 text-[0.9rem] text-muted">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
          </header>
        ) : null}
        {children}
      </div>
    </main>
  )
}
