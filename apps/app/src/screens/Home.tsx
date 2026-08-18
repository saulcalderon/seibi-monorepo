import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { VehicleHero } from '../components/VehicleHero'
import {
  getTutorialStep,
  isSectionUnlocked,
  setTutorialStep,
  TUTORIAL_TOTAL_STEPS,
  type AppSection,
} from '../lib/tutorialProgress'
import { getActiveVehicle, getGarage, formatVehicleLabel, type VehicleProfile } from '../lib/vehicleProfile'
import { recentServicesForVehicle } from '../lib/services'
import { remindersForVehicle } from '../lib/reminders'
import { Avisos, ReminderCard, recentRemindersForVehicle } from './Avisos'
import { Estimados } from './Estimados'
import { Perfil } from './Perfil'
import { ServiceIconGlyph, Servicios } from './Servicios'
import * as m from '../paraglide/messages.js'

const SECTION_ORDER: AppSection[] = [
  'vehiculo',
  'kilometraje',
  'servicios',
  'recordatorios',
  'estimados',
]

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className="dash-icon-btn" aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

function TutorialCoach({
  step,
  onNext,
  onSkip,
}: {
  step: number
  onNext: () => void
  onSkip: () => void
}) {
  const copy = [
    { title: m.tutorial_0_title(), desc: m.tutorial_0_desc() },
    { title: m.tutorial_1_title(), desc: m.tutorial_1_desc() },
    { title: m.tutorial_2_title(), desc: m.tutorial_2_desc() },
    { title: m.tutorial_3_title(), desc: m.tutorial_3_desc() },
    { title: m.tutorial_4_title(), desc: m.tutorial_4_desc() },
    { title: m.tutorial_5_title(), desc: m.tutorial_5_desc() },
  ][step]

  if (!copy) return null
  const isLast = step >= TUTORIAL_TOTAL_STEPS - 1

  return (
    <div className="tutorial-coach">
      <div className="tutorial-coach-card">
        <div className="tutorial-coach-top">
          <span className="tutorial-coach-step">
            {m.tutorial_progress({
              current: String(step + 1),
              total: String(TUTORIAL_TOTAL_STEPS),
            })}
          </span>
          <button type="button" className="tutorial-coach-skip" onClick={onSkip}>
            {m.tutorial_skip()}
          </button>
        </div>
        <h2 className="tutorial-coach-title">{copy.title}</h2>
        <p className="tutorial-coach-desc">{copy.desc}</p>
        <button type="button" className="tutorial-coach-cta" onClick={onNext}>
          {isLast ? m.tutorial_finish() : m.tutorial_next()}
        </button>
      </div>
    </div>
  )
}

type AppNotification = {
  id: string
  kind: 'aviso' | 'servicio' | 'recomendacion'
  title: string
  body: string
  target: 'avisos' | 'servicios' | 'estimados'
  reminderId?: string
  serviceId?: string
}

function notificationsForVehicle(vehicle: VehicleProfile | null): AppNotification[] {
  const items: AppNotification[] = []

  for (const reminder of remindersForVehicle(vehicle)) {
    if (reminder.tone === 'ok') continue
    items.push({
      id: `aviso-${reminder.id}`,
      kind: 'aviso',
      title: reminder.name,
      body: `${reminder.due} · ${reminder.meta}`,
      target: 'avisos',
      reminderId: reminder.id,
    })
  }

  const recent = recentServicesForVehicle(vehicle, 1)[0]
  if (recent) {
    items.push({
      id: `servicio-${recent.id}`,
      kind: 'servicio',
      title: recent.name,
      body: `${recent.meta} · ${recent.cost}`,
      target: 'servicios',
      serviceId: recent.id,
    })
  }

  if (vehicle) {
    items.push({
      id: 'rec-estimate',
      kind: 'recomendacion',
      title: m.home_notifications_rec_title(),
      body: m.home_notifications_rec_body(),
      target: 'estimados',
    })
  }

  return items
}

function kindLabel(kind: AppNotification['kind']) {
  switch (kind) {
    case 'aviso':
      return m.home_notifications_kind_aviso()
    case 'servicio':
      return m.home_notifications_kind_servicio()
    case 'recomendacion':
      return m.home_notifications_kind_recomendacion()
  }
}

function NotificationsSheet({
  items,
  onClose,
  onSelect,
}: {
  items: AppNotification[]
  onClose: () => void
  onSelect: (item: AppNotification) => void
}) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      className="vehicle-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-sheet-title"
    >
      <button
        type="button"
        className="vehicle-sheet-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="vehicle-sheet-panel">
        <div className="vehicle-sheet-handle" aria-hidden="true" />
        <header className="vehicle-sheet-header">
          <button type="button" className="vehicle-setup-back" onClick={onClose}>
            {m.home_vehicle_sheet_close()}
          </button>
          <p className="vehicle-setup-progress">{m.home_notifications()}</p>
          <span aria-hidden="true" />
        </header>

        <h2 id="notifications-sheet-title" className="vehicle-setup-title">
          {m.home_notifications_title()}
        </h2>
        <p className="notif-sheet-desc">{m.home_notifications_desc()}</p>

        {items.length === 0 ? (
          <p className="notif-sheet-empty">{m.home_notifications_empty()}</p>
        ) : (
          <ul className="notif-sheet-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`notif-sheet-item kind-${item.kind}`}
                  onClick={() => onSelect(item)}
                >
                  <span className="notif-sheet-kind">{kindLabel(item.kind)}</span>
                  <span className="notif-sheet-title">{item.title}</span>
                  <span className="notif-sheet-body">{item.body}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function HeaderActions({
  onOpenFleet,
  onOpenNotifications,
  hasNotifications,
}: {
  onOpenFleet: () => void
  onOpenNotifications: () => void
  hasNotifications: boolean
}) {
  return (
    <>
      <IconButton label={m.home_fleet_open()} onClick={onOpenFleet}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 13l1.2-3.6A2 2 0 018.1 8h7.8a2 2 0 011.9 1.4L19 13"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path
            d="M4 16.5h16v2a1 1 0 01-1 1h-1.2a2 2 0 01-3.6 0H9.8a2 2 0 01-3.6 0H5a1 1 0 01-1-1v-2z"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M5 13h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </IconButton>
      <IconButton label={m.home_notifications()} onClick={onOpenNotifications}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9a6 6 0 0112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"
            stroke="currentColor"
            strokeWidth="2.15"
            strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
        </svg>
        {hasNotifications ? <span className="dash-dot" /> : null}
      </IconButton>
    </>
  )
}

const NAV_TABS = ['home', 'servicios', 'estimados', 'recordatorios', 'perfil'] as const
type NavTab = (typeof NAV_TABS)[number]

function DashNav({
  nav,
  hidden = false,
  notificationCount = 0,
  onHome,
  onServicios,
  onEstimados,
  onAvisos,
  onPerfil,
}: {
  nav: NavTab
  hidden?: boolean
  notificationCount?: number
  onHome: () => void
  onServicios: () => void
  onEstimados: () => void
  onAvisos: () => void
  onPerfil: () => void
}) {
  const navRef = useRef<HTMLElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ready: false,
  })

  useLayoutEffect(() => {
    function placeIndicator() {
      const root = navRef.current
      const index = NAV_TABS.indexOf(nav)
      const button = buttonRefs.current[index]
      if (!root || !button || index < 0) return

      const hit = button.querySelector<HTMLElement>('.dash-nav-hit') ?? button
      const rootBox = root.getBoundingClientRect()
      const hitBox = hit.getBoundingClientRect()
      setIndicator({
        x: hitBox.left - rootBox.left,
        y: hitBox.top - rootBox.top,
        width: hitBox.width,
        height: hitBox.height,
        ready: true,
      })
    }

    placeIndicator()
    window.addEventListener('resize', placeIndicator)
    return () => window.removeEventListener('resize', placeIndicator)
  }, [nav])

  const items = [
    {
      id: 'home' as const,
      label: m.home_nav_home(),
      onClick: onHome,
      badge: null as number | null,
      icon: (
        <path
          d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      ),
    },
    {
      id: 'servicios' as const,
      label: m.home_nav_services(),
      onClick: onServicios,
      badge: null as number | null,
      icon: (
        <path
          d="M5 7h14M5 12h14M5 17h10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ),
    },
    {
      id: 'estimados' as const,
      label: m.home_nav_estimates(),
      onClick: onEstimados,
      badge: null as number | null,
      icon: (
        <>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ),
    },
    {
      id: 'recordatorios' as const,
      label: m.home_nav_reminders(),
      onClick: onAvisos,
      badge: notificationCount > 0 ? notificationCount : null,
      icon: (
        <>
          <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 10v3l2 2M9 4h6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ),
    },
    {
      id: 'perfil' as const,
      label: m.home_nav_profile(),
      onClick: onPerfil,
      badge: null as number | null,
      icon: (
        <>
          <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M5.5 19c1.5-3 4-4.5 6.5-4.5S17 16 18.5 19"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ),
    },
  ]

  return (
    <nav
      ref={navRef}
      className={`dash-nav${hidden ? ' is-scroll-hidden' : ''}`}
      aria-label="Principal"
      aria-hidden={hidden}
    >
      <span
        className={`dash-nav-indicator${indicator.ready ? ' is-ready' : ''}`}
        style={{
          width: indicator.width,
          height: indicator.height,
          transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
        }}
        aria-hidden="true"
      />
      {items.map((item, index) => {
        const active = nav === item.id
        const badge = item.badge
        const badgeLabel =
          badge != null
            ? `${item.label}, ${badge > 9 ? '9+' : badge} notificaciones`
            : item.label
        return (
          <button
            key={item.id}
            type="button"
            ref={(node) => {
              buttonRefs.current[index] = node
            }}
            className={active ? 'is-active' : ''}
            aria-label={badgeLabel}
            aria-current={active ? 'page' : undefined}
            aria-pressed={item.id === 'estimados' ? active : undefined}
            onClick={item.onClick}
          >
            <span className="dash-nav-hit">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {item.icon}
              </svg>
              {badge != null ? (
                <span className="dash-nav-badge" aria-hidden="true">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export function Home() {
  const [step, setStep] = useState(() => getTutorialStep())
  const [hasVehicle, setHasVehicle] = useState(() => getGarage().vehicles.length > 0)
  const [activeVehicle, setActiveVehicle] = useState<VehicleProfile | null>(() =>
    getActiveVehicle(getGarage()),
  )
  const [fleetListOpen, setFleetListOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [nav, setNav] = useState<NavTab>(() => {
    if (typeof window === 'undefined') return 'home'
    const tab = new URLSearchParams(window.location.search).get('nav')
    if (
      tab === 'servicios' ||
      tab === 'estimados' ||
      tab === 'recordatorios' ||
      tab === 'perfil'
    ) {
      return tab
    }
    return 'home'
  })
  const [focusReminderId, setFocusReminderId] = useState<string | null>(null)
  const [focusServiceId, setFocusServiceId] = useState<string | null>(null)
  const [serviciosPreferAll, setServiciosPreferAll] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const homeRootRef = useRef<HTMLDivElement>(null)
  const navRevealTimer = useRef<number | null>(null)
  const skipNavHideOnMount = useRef(true)
  const tutorialActive = step < TUTORIAL_TOTAL_STEPS
  const highlightedSection =
    tutorialActive && step >= 1 ? SECTION_ORDER[step - 1] : null

  function concealNav(ms = 420) {
    setNavHidden(true)
    if (navRevealTimer.current != null) {
      window.clearTimeout(navRevealTimer.current)
    }
    navRevealTimer.current = window.setTimeout(() => {
      setNavHidden(false)
      navRevealTimer.current = null
    }, ms)
  }

  useEffect(() => {
    const root = homeRootRef.current
    if (!root) return

    function onMove() {
      concealNav()
    }

    root.addEventListener('scroll', onMove, { capture: true, passive: true })
    return () => {
      root.removeEventListener('scroll', onMove, { capture: true })
      if (navRevealTimer.current != null) {
        window.clearTimeout(navRevealTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (skipNavHideOnMount.current) {
      skipNavHideOnMount.current = false
      return
    }
    concealNav(360)
  }, [nav])

  function openAvisos(reminderId?: string) {
    setFocusReminderId(reminderId ?? null)
    setFocusServiceId(null)
    setServiciosPreferAll(false)
    setNav('recordatorios')
  }

  function openServicios(serviceId?: string, preferAll = false) {
    setFocusReminderId(null)
    setFocusServiceId(serviceId ?? null)
    setServiciosPreferAll(preferAll)
    setNav('servicios')
  }

  function openEstimados() {
    setFocusReminderId(null)
    setFocusServiceId(null)
    setServiciosPreferAll(false)
    setNav('estimados')
  }

  function unlockThrough(nextStep: number) {
    setTutorialStep(nextStep)
    setStep(nextStep)
  }

  useEffect(() => {
    if (!highlightedSection) return
    const node = document.querySelector(`[data-section="${highlightedSection}"]`)
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedSection])

  return (
    <div
      ref={homeRootRef}
      className={`dash-home is-toolbar-settled${tutorialActive ? ' is-tutoring' : ''}`}
    >
      {nav === 'recordatorios' ? (
        <div className="dash-scroll avisos-scroll">
          <Avisos
            vehicle={activeVehicle}
            focusReminderId={focusReminderId}
            onBack={() => {
              setFocusReminderId(null)
              setNav('home')
            }}
            onFocusHandled={() => setFocusReminderId(null)}
          />
        </div>
      ) : nav === 'servicios' ? (
        <div className="dash-scroll avisos-scroll">
          <Servicios
            vehicle={activeVehicle}
            focusServiceId={focusServiceId}
            preferAll={serviciosPreferAll}
            onFocusHandled={() => setFocusServiceId(null)}
          />
        </div>
      ) : nav === 'estimados' ? (
        <div className="dash-scroll avisos-scroll estimados-scroll">
          <Estimados vehicle={activeVehicle} />
        </div>
      ) : nav === 'perfil' ? (
        <div className="dash-scroll avisos-scroll">
          <Perfil vehicle={activeVehicle} />
        </div>
      ) : (
        <div className="dash-scroll">
          <VehicleHero
            unlocked={hasVehicle ? isSectionUnlocked('vehiculo', step) : true}
            kmUnlocked={hasVehicle ? isSectionUnlocked('kilometraje', step) : true}
            kmHighlighted={highlightedSection === 'kilometraje'}
            highlighted={
              highlightedSection === 'vehiculo' || highlightedSection === 'kilometraje'
            }
            toolbarExtras={
              <HeaderActions
                onOpenFleet={() => setFleetListOpen(true)}
                onOpenNotifications={() => setNotificationsOpen(true)}
                hasNotifications={notificationsForVehicle(activeVehicle).length > 0}
              />
            }
            fleetListOpen={fleetListOpen}
            onFleetListOpenChange={setFleetListOpen}
            onActiveChange={(vehicle) => {
              setActiveVehicle(vehicle)
            }}
            onFleetVehicleSelect={() => {
              setFleetListOpen(false)
              openServicios(undefined, true)
            }}
            onServiceFocus={() => openAvisos()}
            onSaved={() => {
              setHasVehicle(true)
              if (step < 2) unlockThrough(2)
            }}
          />

          <section
            data-section="recordatorios"
            className={`dash-block${
              highlightedSection === 'recordatorios' ? ' is-highlighted' : ''
            }`}
            aria-label={m.home_upcoming_title()}
          >
            <div className="dash-block-head">
              <div>
                <h2>{m.home_upcoming_title()}</h2>
                <p className="dash-block-context">
                  {activeVehicle
                    ? m.home_vehicle_context({
                        vehicle: formatVehicleLabel(activeVehicle),
                      })
                    : m.home_vehicle_context_empty()}
                </p>
              </div>
              {activeVehicle ? (
                <button type="button" onClick={() => openAvisos()}>
                  {m.home_see_all()}
                </button>
              ) : null}
            </div>
            {activeVehicle ? (
              (() => {
                const proximos = recentRemindersForVehicle(activeVehicle)
                if (proximos.length === 0) {
                  return <p className="dash-tx-empty">{m.home_recent_empty()}</p>
                }
                return (
                  <div
                    className="aviso-live-list"
                    key={`avisos-${activeVehicle.id}`}
                  >
                    {proximos.map((item) => (
                      <ReminderCard
                        key={item.id}
                        item={item}
                        focused={false}
                        onOpen={() => openAvisos(item.id)}
                      />
                    ))}
                  </div>
                )
              })()
            ) : (
              <p className="dash-tx-empty">{m.home_recent_empty()}</p>
            )}
          </section>

          <section
            data-section="servicios"
            className={`dash-block${
              highlightedSection === 'servicios' ? ' is-highlighted' : ''
            }`}
            aria-label={m.home_recent_title()}
          >
            <div className="dash-block-head">
              <div>
                <h2>{m.home_recent_title()}</h2>
                <p className="dash-block-context">
                  {activeVehicle
                    ? m.home_vehicle_context({
                        vehicle: formatVehicleLabel(activeVehicle),
                      })
                    : m.home_vehicle_context_empty()}
                </p>
              </div>
              {activeVehicle ? (
                <button type="button" onClick={() => openServicios()}>
                  {m.home_see_all()}
                </button>
              ) : null}
            </div>
            {activeVehicle ? (
              <ul className="dash-tx-list" key={`services-${activeVehicle.id}`}>
                {recentServicesForVehicle(activeVehicle).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="dash-tx dash-tx--button"
                      onClick={() => openServicios(item.id)}
                    >
                      <span className="dash-tx-icon" aria-hidden="true">
                        <ServiceIconGlyph icon={item.icon} />
                      </span>
                      <div>
                        <p className="dash-tx-name">{item.name}</p>
                        <p className="dash-tx-meta">{item.meta}</p>
                      </div>
                      <strong>{item.cost}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-tx-empty">{m.home_recent_empty()}</p>
            )}
          </section>
        </div>
      )}

      {notificationsOpen
        ? createPortal(
            <NotificationsSheet
              items={notificationsForVehicle(activeVehicle)}
              onClose={() => setNotificationsOpen(false)}
              onSelect={(item) => {
                setNotificationsOpen(false)
                if (item.target === 'avisos') {
                  openAvisos(item.reminderId)
                  return
                }
                if (item.target === 'servicios') {
                  openServicios(item.serviceId)
                  return
                }
                openEstimados()
              }}
            />,
            document.body,
          )
        : null}

      {createPortal(
        <DashNav
          nav={nav}
          hidden={navHidden}
          notificationCount={notificationsForVehicle(activeVehicle).length}
          onHome={() => {
            setFocusReminderId(null)
            setFocusServiceId(null)
            setServiciosPreferAll(false)
            setNav('home')
          }}
          onServicios={() => openServicios()}
          onEstimados={() => openEstimados()}
          onAvisos={() => {
            setFocusReminderId(null)
            setFocusServiceId(null)
            setNav('recordatorios')
          }}
          onPerfil={() => setNav('perfil')}
        />,
        document.getElementById('root') ?? document.body,
      )}

      {tutorialActive ? (
        <TutorialCoach
          step={step}
          onNext={() => unlockThrough(Math.min(TUTORIAL_TOTAL_STEPS, step + 1))}
          onSkip={() => unlockThrough(TUTORIAL_TOTAL_STEPS)}
        />
      ) : null}
    </div>
  )
}
