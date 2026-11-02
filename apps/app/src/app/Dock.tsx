import type { CSSProperties } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Bell, Calculator, CarFront, House, Plus, type LucideIcon } from 'lucide-react'
import { useActiveVehicle } from '../lib/activeVehicle'
import { useGarage } from '../lib/garage'
import { paintAccent, paintHex } from '../lib/paint'
import { cx } from '../ui/cx'
import { useActions } from './Actions'

const TABS: Array<{ to: '/home' | '/flota' | '/avisos' | '/estimados'; label: string; icon: LucideIcon }> = [
  { to: '/home', label: 'Inicio', icon: House },
  { to: '/flota', label: 'Mi flota', icon: CarFront },
  { to: '/avisos', label: 'Avisos', icon: Bell },
  { to: '/estimados', label: 'Estimados', icon: Calculator },
]

const PRESS = 'transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] active:scale-[0.97]'

/**
 * Seibi v3 dock: a floating pill with four destinations and the create
 * action in the middle. The active item takes the active Vehicle's paint
 * accent, so it changes with the car on Inicio.
 */
export function Dock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { openQuick } = useActions()
  const { vehicles } = useGarage()
  const { active } = useActiveVehicle(vehicles)
  const alerts = vehicles.reduce((n, v) => n + v.pending, 0)
  const accent = active ? paintAccent(paintHex(active.color)) : null

  const tab = (t: (typeof TABS)[number]) => {
    const on = pathname === t.to || pathname.startsWith(`${t.to}/`)
    const Icon = t.icon
    return (
      <Link
        key={t.to}
        to={t.to}
        aria-current={on ? 'page' : undefined}
        className={cx(
          'flex min-h-13 w-[58px] flex-col items-center justify-center gap-[3px] text-[11px] font-medium leading-none',
          on ? 'text-[var(--dock-accent)]' : 'text-muted',
          PRESS,
        )}
      >
        <span className="relative">
          <Icon className="size-[21px]" strokeWidth={on ? 2.2 : 1.9} aria-hidden />
          {t.to === '/avisos' && alerts > 0 ? (
            <span className="absolute -right-2 -top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-overdue px-1 text-[0.65rem] font-semibold text-white tabular">
              {alerts > 9 ? '9+' : alerts}
            </span>
          ) : null}
        </span>
        {t.label}
        <span
          className={cx('h-[3px] w-3.5 rounded-sm', on ? 'bg-[var(--dock-accent)]' : 'bg-transparent')}
          aria-hidden
        />
      </Link>
    )
  }

  return (
    <nav
      aria-label="Principal"
      className="v3 dock-v3 pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4"
      style={{
        paddingBottom: 'max(var(--safe-bottom), 1rem)',
        ...(accent ? ({ '--accent': accent } as CSSProperties) : null),
      }}
    >
      <div className="pointer-events-auto mx-auto flex h-[68px] max-w-md items-center justify-around rounded-full bg-surface/86 shadow-[inset_0_0_0_1px_var(--app-line),0_12px_30px_rgb(14_15_17/8%)] backdrop-blur-[18px]">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <button
          type="button"
          onClick={openQuick}
          aria-label="Acciones rápidas"
          className={cx(
            'inline-flex size-13 items-center justify-center rounded-full bg-inverse text-on-inverse shadow-[0_8px_20px_rgb(14_15_17/24%)]',
            PRESS,
          )}
        >
          <Plus className="size-6" strokeWidth={2.2} aria-hidden />
        </button>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  )
}
