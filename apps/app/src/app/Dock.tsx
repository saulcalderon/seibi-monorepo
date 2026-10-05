import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Bell, Calculator, CarFront, House, Plus, type LucideIcon } from 'lucide-react'
import { useGarage } from '../lib/garage'
import { cx } from '../ui/cx'
import { useActions } from './Actions'

const TABS: Array<{ to: '/home' | '/flota' | '/avisos' | '/estimados'; label: string; icon: LucideIcon }> = [
  { to: '/home', label: 'Inicio', icon: House },
  { to: '/flota', label: 'Mi flota', icon: CarFront },
  { to: '/avisos', label: 'Avisos', icon: Bell },
  { to: '/estimados', label: 'Estimados', icon: Calculator },
]

export function Dock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { openQuick } = useActions()
  const { vehicles } = useGarage()
  const alerts = vehicles.reduce((n, v) => n + v.pending, 0)

  const tab = (t: (typeof TABS)[number]) => {
    const active = pathname === t.to || pathname.startsWith(`${t.to}/`)
    const Icon = t.icon
    return (
      <Link
        key={t.to}
        to={t.to}
        aria-current={active ? 'page' : undefined}
        className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl"
      >
        {active ? (
          <motion.span
            layoutId="dock-pill"
            className="absolute inset-x-1.5 inset-y-1 -z-10 rounded-2xl bg-surface-3"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        ) : null}
        <span className="relative">
          <Icon
            className={cx('size-[1.35rem]', active ? 'text-ink' : 'text-subtle')}
            strokeWidth={active ? 2.4 : 2}
            aria-hidden
          />
          {t.to === '/avisos' && alerts > 0 ? (
            <span className="absolute -right-2 -top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-overdue px-1 text-[0.65rem] font-bold text-white tabular">
              {alerts > 9 ? '9+' : alerts}
            </span>
          ) : null}
        </span>
        <span className={cx('text-[0.68rem] font-semibold', active ? 'text-ink' : 'text-subtle')}>
          {t.label}
        </span>
      </Link>
    )
  }

  return (
    <nav
      aria-label="Principal"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: 'max(var(--safe-bottom), 0.6rem)' }}
    >
      <div className="pointer-events-auto relative isolate mx-auto flex h-[var(--dock-height)] max-w-md items-center rounded-[1.35rem] bg-surface px-1.5 shadow-card ring-1 ring-line">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <div className="flex flex-1 justify-center">
          <motion.button
            type="button"
            onClick={openQuick}
            aria-label="Acciones rápidas"
            whileTap={{ scale: 0.92 }}
            className="relative inline-flex size-15 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full bg-surface-3" aria-hidden />
            <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-radiant text-white">
              <Plus className="size-6" strokeWidth={2.6} aria-hidden />
            </span>
          </motion.button>
        </div>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  )
}
