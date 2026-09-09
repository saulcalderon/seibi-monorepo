import { useEffect, useRef, useState, type AnimationEvent, type TransitionEvent } from 'react'
import { createPortal } from 'react-dom'
import { authIdentityFromUser, initialsFromName } from '../lib/authIdentity'
import { useAuthSession, useSignOutToLogin } from '../lib/authSession'
import {
  formatMileage,
  formatVehicleLabel,
  getGarage,
  removeVehicle,
  type GarageState,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import { getTheme, setTheme } from '../lib/theme'
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '../lib/notificationsPref'
import * as m from '../paraglide/messages.js'

function IdentityAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl: string | null
}) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [avatarUrl])

  const showPhoto = Boolean(avatarUrl) && !imageFailed

  return (
    <span className="perfil-avatar" aria-hidden="true">
      {showPhoto ? (
        <img
          className="profile-avatar-image"
          src={avatarUrl ?? undefined}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        initialsFromName(name)
      )}
    </span>
  )
}

function SwitchRow({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="perfil-night"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
    >
      <span className="perfil-night-label">{label}</span>
      <span className={`perfil-night-track${on ? ' is-on' : ''}`} aria-hidden="true">
        <span className="perfil-night-knob" />
      </span>
    </button>
  )
}

function Row({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button type="button" className="perfil-row" onClick={onClick}>
      <span className="perfil-row-label">{label}</span>
      {value ? <span className="perfil-row-value">{value}</span> : null}
      <span className="perfil-row-chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}

type PerfilView = 'account' | 'plans'
type PaneMotion = 'enter' | 'leave'
type PlanId = 'comun' | 'plus' | 'premium' | 'diamond'

function prefersReduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function PlanIcon({ id }: { id: PlanId }) {
  if (id === 'comun') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.5 14.2l1.1-3.2A2.4 2.4 0 017.9 9.2h8.2a2.4 2.4 0 012.3 1.8l1.1 3.2M3.8 14.2h16.4v2.6a1.1 1.1 0 01-1.1 1.1H4.9a1.1 1.1 0 01-1.1-1.1v-2.6z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="7.4" cy="16.8" r="1.15" fill="currentColor" />
        <circle cx="16.6" cy="16.8" r="1.15" fill="currentColor" />
      </svg>
    )
  }
  if (id === 'plus') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4.4l2.05 6.32h6.65l-5.38 3.91 2.06 6.33L12 17.05l-5.38 3.91 2.06-6.33-5.38-3.91h6.65L12 4.4z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (id === 'premium') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.8 9.2l3.1 2.2L12 5.8l4.1 5.6 3.1-2.2-.9 9H5.7l-.9-9z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.2L18.4 12 12 19.8 5.6 12 12 4.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GarageSheet({
  vehicles,
  activeId,
  onClose,
  onRemoved,
}: {
  vehicles: VehicleProfile[]
  activeId: string | null
  onClose: () => void
  onRemoved: (next: GarageState) => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [open, setOpen] = useState(() => prefersReduceMotion())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (prefersReduceMotion()) return
    const outer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setOpen(true))
    })
    return () => window.cancelAnimationFrame(outer)
  }, [])

  function requestClose() {
    if (leaving) return
    if (prefersReduceMotion()) {
      onClose()
      return
    }
    setLeaving(true)
    setOpen(false)
  }

  function onSheetEnd(event: TransitionEvent<HTMLDivElement>) {
    if (!leaving) return
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'transform') return
    onClose()
  }

  function askOrRemove(id: string) {
    if (leaving) return
    if (pendingId === id) {
      const next = removeVehicle(id)
      onRemoved(next)
      setPendingId(null)
      if (next.vehicles.length === 0) requestClose()
      return
    }
    setPendingId(id)
  }

  const host = document.getElementById('root') ?? document.body
  const countLabel =
    vehicles.length === 1
      ? m.home_fleet_count_one()
      : m.home_fleet_count_many({ count: String(vehicles.length) })

  return createPortal(
    <div
      className={`perfil-garage-screen${open ? ' is-open' : ''}${leaving ? ' is-leave' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-garage-title"
      onTransitionEnd={onSheetEnd}
    >
      <header className="avisos-header">
        <button type="button" className="avisos-back" onClick={requestClose}>
          {m.setup_back()}
        </button>
        <p className="avisos-eyebrow">{countLabel}</p>
        <h1 id="perfil-garage-title" className="avisos-title">
          {m.home_fleet_title()}
        </h1>
        <p className="avisos-context">{m.perfil_garage_sheet_desc()}</p>
      </header>
      {vehicles.length === 0 ? (
        <p className="perfil-garage-empty">{m.perfil_garage_empty()}</p>
      ) : (
        <ul className="perfil-garage-list">
          {vehicles.map((item) => {
            const active = item.id === activeId
            const asking = pendingId === item.id
            return (
              <li key={item.id} className={`perfil-garage-item${active ? ' is-active' : ''}`}>
                <div className="perfil-garage-item-copy">
                  <p className="perfil-garage-item-name">{formatVehicleLabel(item)}</p>
                  <p className="perfil-garage-item-meta">
                    {item.placa ? `${item.placa} · ` : ''}
                    {m.perfil_active_km({ km: formatMileage(item.mileage, item.mileageUnit) })}
                  </p>
                </div>
                {active ? (
                  <span className="perfil-garage-pill">{m.home_fleet_active()}</span>
                ) : null}
                <button
                  type="button"
                  className={`perfil-garage-remove${asking ? ' is-ask' : ''}`}
                  onClick={() => askOrRemove(item.id)}
                >
                  {asking ? m.perfil_garage_remove_ask() : m.perfil_garage_remove()}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>,
    host,
  )
}

function CheckIcon() {
  return (
    <span className="perfil-plan-check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M6.5 12.2l3.4 3.4 7.6-7.8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

const PLANS: Array<{
  id: PlanId
  current?: boolean
  featured?: boolean
  name: () => string
  tag: () => string
  price: () => string
  period: () => string
  features: Array<() => string>
}> = [
  {
    id: 'comun',
    current: true,
    name: () => m.perfil_plan_comun(),
    tag: () => m.perfil_plan_comun_tag(),
    price: () => m.perfil_plan_comun_price(),
    period: () => m.perfil_plan_comun_period(),
    features: [
      () => m.perfil_plan_comun_f1(),
      () => m.perfil_plan_comun_f2(),
      () => m.perfil_plan_comun_f3(),
      () => m.perfil_plan_comun_f4(),
    ],
  },
  {
    id: 'plus',
    featured: true,
    name: () => m.perfil_plan_plus(),
    tag: () => m.perfil_plan_plus_tag(),
    price: () => m.perfil_plan_plus_price(),
    period: () => m.perfil_plan_plus_period(),
    features: [
      () => m.perfil_plan_plus_f1(),
      () => m.perfil_plan_plus_f2(),
      () => m.perfil_plan_plus_f3(),
      () => m.perfil_plan_plus_f4(),
    ],
  },
  {
    id: 'premium',
    name: () => m.perfil_plan_premium(),
    tag: () => m.perfil_plan_premium_tag(),
    price: () => m.perfil_plan_premium_price(),
    period: () => m.perfil_plan_premium_period(),
    features: [
      () => m.perfil_plan_premium_f1(),
      () => m.perfil_plan_premium_f2(),
      () => m.perfil_plan_premium_f3(),
      () => m.perfil_plan_premium_f4(),
    ],
  },
  {
    id: 'diamond',
    name: () => m.perfil_plan_diamond(),
    tag: () => m.perfil_plan_diamond_tag(),
    price: () => m.perfil_plan_diamond_price(),
    period: () => m.perfil_plan_diamond_period(),
    features: [
      () => m.perfil_plan_diamond_f1(),
      () => m.perfil_plan_diamond_f2(),
      () => m.perfil_plan_diamond_f3(),
      () => m.perfil_plan_diamond_f4(),
    ],
  },
]

export function Perfil({ vehicle }: { vehicle: VehicleProfile | null }) {
  const signOutToLogin = useSignOutToLogin()
  const { user, status } = useAuthSession()
  const identity = authIdentityFromUser(user)
  const sessionResolved = status !== 'resolving_initial_session'
  const displayName = identity.displayName ?? m.profile_guest_name()
  const showNoSessionCue = import.meta.env.DEV && status === 'signed_out'
  const [garage, setGarage] = useState(() => getGarage())
  const [garageOpen, setGarageOpen] = useState(false)
  const fleetCount = garage.vehicles.length
  const label = vehicle ? formatVehicleLabel(vehicle) : null
  const [night, setNight] = useState(() => getTheme() === 'night')
  const [notifs, setNotifs] = useState(() => getNotificationsEnabled())
  const [view, setView] = useState<PerfilView>('account')
  const [paneMotion, setPaneMotion] = useState<PaneMotion | null>(null)
  const plansTrackRef = useRef<HTMLDivElement>(null)
  const [planIndex, setPlanIndex] = useState(0)
  const coinDelay = useRef(0)
  const lastPulse = useRef(0)
  const scrollRaf = useRef(0)
  const scrollingTo = useRef<number | null>(null)
  const [pulseIndex, setPulseIndex] = useState(-1)
  const cardPress = useRef({ x: 0, y: 0, dragged: false })

  useEffect(() => {
    return () => {
      window.clearTimeout(coinDelay.current)
      window.cancelAnimationFrame(scrollRaf.current)
    }
  }, [])

  useEffect(() => {
    const sync = () => setGarage(getGarage())
    window.addEventListener('seibi-garage-change', sync)
    return () => window.removeEventListener('seibi-garage-change', sync)
  }, [])

  function nearestPlanIndex() {
    const track = plansTrackRef.current
    if (!track) return 0
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2
    const cards = track.querySelectorAll<HTMLElement>('.perfil-plan')
    let best = 0
    let bestDist = Infinity
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect()
      const dist = Math.abs(rect.left + rect.width / 2 - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = index
      }
    })
    return best
  }

  function playSelectPulse(index: number) {
    if (lastPulse.current === index) return
    lastPulse.current = index
    setPulseIndex(-1)
    window.requestAnimationFrame(() => {
      setPulseIndex(index)
    })
  }

  function onPlansScroll() {
    const best = nearestPlanIndex()
    setPlanIndex(best)
    if (scrollingTo.current !== null) return
    window.clearTimeout(coinDelay.current)
    coinDelay.current = window.setTimeout(() => playSelectPulse(best), 90)
  }

  function onPlansScrollEnd() {
    const index = nearestPlanIndex()
    setPlanIndex(index)
    if (scrollingTo.current !== null) return
    window.clearTimeout(coinDelay.current)
    coinDelay.current = window.setTimeout(() => playSelectPulse(index), 40)
  }

  function scrollToPlan(index: number) {
    const track = plansTrackRef.current
    const card = track?.querySelectorAll<HTMLElement>('.perfil-plan')[index]
    if (!track || !card) return
    const target = Math.max(0, card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2)
    const start = track.scrollLeft
    const delta = target - start
    window.cancelAnimationFrame(scrollRaf.current)
    window.clearTimeout(coinDelay.current)
    scrollingTo.current = index

    const finish = () => {
      scrollingTo.current = null
      track.style.scrollSnapType = ''
      setPlanIndex(index)
      playSelectPulse(index)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || Math.abs(delta) < 2) {
      track.scrollLeft = target
      finish()
      return
    }

    track.style.scrollSnapType = 'none'
    const duration = 560
    const origin = performance.now()
    const ease = (t: number) => 1 - (1 - t) ** 3
    const step = (now: number) => {
      const t = Math.min(1, (now - origin) / duration)
      track.scrollLeft = start + delta * ease(t)
      if (t < 1) {
        scrollRaf.current = window.requestAnimationFrame(step)
        return
      }
      finish()
    }
    scrollRaf.current = window.requestAnimationFrame(step)
  }

  function onTrackPointerDown(event: { clientX: number; clientY: number }) {
    cardPress.current = { x: event.clientX, y: event.clientY, dragged: false }
    if (scrollRaf.current) {
      window.cancelAnimationFrame(scrollRaf.current)
      scrollRaf.current = 0
      scrollingTo.current = null
      const track = plansTrackRef.current
      if (track) track.style.scrollSnapType = ''
    }
  }

  function onTrackPointerMove(event: { clientX: number; clientY: number }) {
    if (
      Math.abs(event.clientX - cardPress.current.x) > 10 ||
      Math.abs(event.clientY - cardPress.current.y) > 10
    ) {
      cardPress.current.dragged = true
    }
  }

  function focusPlan(index: number) {
    if (cardPress.current.dragged) return false
    if (index === planIndex) return true
    scrollToPlan(index)
    return false
  }

  function toggleNight() {
    const next = !night
    setNight(next)
    setTheme(next ? 'night' : 'day')
  }

  function toggleNotifs() {
    const next = !notifs
    setNotifs(next)
    setNotificationsEnabled(next)
  }

  function openPlans() {
    setView('plans')
    setPaneMotion(prefersReduceMotion() ? null : 'enter')
  }

  function closePlans() {
    if (prefersReduceMotion()) {
      setView('account')
      setPaneMotion(null)
      return
    }
    setPaneMotion('leave')
  }

  function onPaneEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (paneMotion === 'leave') {
      setView('account')
      setPaneMotion('enter')
      return
    }
    if (paneMotion === 'enter') setPaneMotion(null)
  }

  return (
    <div
      className={`perfil-screen${paneMotion === 'enter' ? ' is-enter' : ''}${paneMotion === 'leave' ? ' is-leave' : ''}`}
      onAnimationEnd={onPaneEnd}
    >
      {view === 'account' ? (
        <>
        <header className="avisos-header">
          <h1 className="avisos-eyebrow">{m.perfil_eyebrow()}</h1>
        </header>

        <section className="perfil-identity" aria-label={m.perfil_account()}>
          <IdentityAvatar name={displayName} avatarUrl={identity.avatarUrl} />
          <div>
            <p className="perfil-name">{sessionResolved ? displayName : '\u00a0'}</p>
            {identity.email ? <p className="perfil-email">{identity.email}</p> : null}
            {showNoSessionCue ? (
              <p className="profile-session-cue">{m.profile_no_session()}</p>
            ) : null}
          </div>
        </section>

        <button
          type="button"
          className="perfil-card"
          aria-label={m.perfil_garage()}
          aria-expanded={garageOpen}
          onClick={() => setGarageOpen(true)}
        >
          <span className="perfil-card-head">
            <span className="perfil-card-label">{m.perfil_garage()}</span>
            <span className="perfil-card-chevron">
              <ChevronIcon />
            </span>
          </span>
          <span className="perfil-card-body">
            {vehicle && label ? (
              <>
                <span className="perfil-card-title">{label}</span>
                <span className="perfil-card-meta">
                  {m.perfil_active_km({ km: formatMileage(vehicle.mileage, vehicle.mileageUnit) })}
                </span>
              </>
            ) : (
              <span className="perfil-card-title">{m.perfil_garage_empty()}</span>
            )}
          </span>
          <span className="perfil-card-foot">
            {fleetCount === 1
              ? m.perfil_fleet_one()
              : m.perfil_fleet_many({ count: String(fleetCount) })}
          </span>
        </button>

        {garageOpen ? (
          <GarageSheet
            vehicles={garage.vehicles}
            activeId={garage.activeId}
            onClose={() => setGarageOpen(false)}
            onRemoved={(next) => setGarage(next)}
          />
        ) : null}

        <SwitchRow label={m.perfil_night_mode()} on={night} onToggle={toggleNight} />
        <SwitchRow label={m.perfil_notifications()} on={notifs} onToggle={toggleNotifs} />

        <section className="perfil-list" aria-label={m.perfil_settings()}>
          <Row label={m.perfil_subscriptions()} onClick={openPlans} />
          <Row label={m.perfil_preferences()} />
          <Row label={m.perfil_support()} />
        </section>

        <button type="button" className="perfil-logout" onClick={() => void signOutToLogin()}>
          {m.home_logout()}
        </button>
        </>
      ) : (
        <>
        <header className="avisos-header">
          <button type="button" className="avisos-back" onClick={closePlans}>
            {m.setup_back()}
          </button>
          <p className="avisos-eyebrow">{m.perfil_eyebrow()}</p>
          <h1 className="avisos-title">{m.perfil_subscriptions()}</h1>
          <p className="avisos-context">{m.perfil_subscriptions_context()}</p>
        </header>

        <div
          ref={plansTrackRef}
          className="perfil-plans"
          onScroll={onPlansScroll}
          onScrollEnd={onPlansScrollEnd}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
        >
          {PLANS.map((plan, index) => (
            <article
              key={plan.id}
              className={`perfil-plan${plan.current ? ' is-current' : ''}${plan.featured ? ' is-featured' : ''}${index === planIndex ? ' is-active' : ''}${index === pulseIndex ? ' is-pulse' : ''}`}
              onClick={() => {
                focusPlan(index)
              }}
            >
              <span className="perfil-plan-icon">
                <PlanIcon id={plan.id} />
              </span>
              {plan.featured ? (
                <span className="perfil-plan-badge">{m.perfil_plan_recommended()}</span>
              ) : plan.current ? (
                <span className="perfil-plan-badge">{m.perfil_plan_current()}</span>
              ) : (
                <span className="perfil-plan-badge is-quiet" />
              )}
              <h2 className="perfil-plan-name">{plan.name()}</h2>
              <p className="perfil-plan-tag">{plan.tag()}</p>
              <p className="perfil-plan-price">
                {plan.id === 'comun' ? null : <span className="perfil-plan-currency">$</span>}
                <span className="perfil-plan-amount">{plan.price()}</span>
                {plan.period() ? (
                  <span className="perfil-plan-period">{plan.period()}</span>
                ) : null}
              </p>
              <ul className="perfil-plan-features">
                {plan.features.map((feature) => {
                  const text = feature()
                  return (
                    <li key={text}>
                      <CheckIcon />
                      <span>{text}</span>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="perfil-plan-cta"
                disabled={plan.current}
                onClick={(event) => {
                  event.stopPropagation()
                  focusPlan(index)
                }}
              >
                {plan.current
                  ? m.perfil_plan_current()
                  : m.perfil_plan_choose({ name: plan.name() })}
              </button>
            </article>
          ))}
        </div>
        <div className="perfil-plan-dots" role="tablist" aria-label={m.perfil_subscriptions()}>
          {PLANS.map((plan, index) => (
            <button
              key={plan.id}
              type="button"
              role="tab"
              aria-selected={planIndex === index}
              aria-label={plan.name()}
              className={`perfil-plan-dot${planIndex === index ? ' is-on' : ''}`}
              onClick={() => scrollToPlan(index)}
            />
          ))}
        </div>
        </>
      )}
    </div>
  )
}
