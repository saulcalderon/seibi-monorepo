import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { VehicleHero, VehicleSetupScreen } from '../components/VehicleHero'
import {
  getTutorialStep,
  isSectionUnlocked,
  setTutorialStep,
  TUTORIAL_TOTAL_STEPS,
  type AppSection,
} from '../lib/tutorialProgress'
import { useRequireProductionSession } from '../lib/authSession'
import { getActiveVehicle, getGarage, setActiveVehicle as persistActiveVehicle, type VehicleProfile } from '../lib/vehicleProfile'
import { recentServicesForVehicle } from '../lib/services'
import { remindersForVehicle } from '../lib/reminders'
import { Avisos } from './Avisos'
import { Estimados } from './Estimados'
import { HomeDashboard } from './HomeDashboard'
import { Perfil } from './Perfil'
import { Servicios } from './Servicios'
import * as m from '../paraglide/messages.js'

const SECTION_ORDER: AppSection[] = [
  'animacion',
  'vehiculo',
  'agregar',
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
    { title: m.tutorial_6_title(), desc: m.tutorial_6_desc() },
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

const DISMISSED_NOTIF_KEY = 'seibi-dismissed-notifications'

function readDismissedNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIF_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeDismissedNotificationIds(ids: string[]) {
  localStorage.setItem(DISMISSED_NOTIF_KEY, JSON.stringify(ids))
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

function NotificationsScreen({
  items,
  onBack,
  onSelect,
  onClear,
}: {
  items: AppNotification[]
  onBack: () => void
  onSelect: (item: AppNotification) => void
  onClear: () => void
}) {
  return (
    <div className="avisos-screen notif-screen">
      <header className="avisos-header">
        <button type="button" className="avisos-back" onClick={onBack}>
          {m.setup_back()}
        </button>
        <p className="avisos-eyebrow">{m.home_notifications()}</p>
        <h1 className="avisos-title">{m.home_notifications_title()}</h1>
        <p className="avisos-context">{m.home_notifications_desc()}</p>
      </header>

      {items.length === 0 ? (
        <p className="notif-sheet-empty">{m.home_notifications_empty()}</p>
      ) : (
        <>
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
          <button type="button" className="notif-clear" onClick={onClear}>
            {m.home_notifications_clear()}
          </button>
        </>
      )}
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

type NavTab = 'home' | 'garaje' | 'recordatorios' | 'perfil' | 'servicios' | 'estimados' | 'notificaciones' | 'agregar'

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
          d="M14.5 5.5l4 4M4 20l1.2-4.2L15.7 5.3a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L8.2 18.8 4 20z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      id: 'recordatorios' as const,
      label: m.home_nav_reminders(),
      onClick: onAvisos,
      badge: notificationCount > 0 ? notificationCount : null,
      icon: (
        <path
          d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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

  const left = items.slice(0, 2)
  const right = items.slice(2)
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const [indicatorReady, setIndicatorReady] = useState(false)

  useLayoutEffect(() => {
    const root = navRef.current
    const indicator = indicatorRef.current
    if (!root || !indicator) return

    function place() {
      if (!root || !indicator) return
      const active = root.querySelector('button.is-active')
      if (!(active instanceof HTMLElement)) {
        setIndicatorReady(false)
        return
      }
      const hit = active.querySelector('.dash-nav-hit')
      const target = hit instanceof HTMLElement ? hit : active
      const navBox = root.getBoundingClientRect()
      const box = target.getBoundingClientRect()
      indicator.style.width = `${box.width}px`
      indicator.style.height = `${box.height}px`
      indicator.style.transform = `translate3d(${box.left - navBox.left}px, ${box.top - navBox.top}px, 0)`
      setIndicatorReady(true)
    }

    place()
    const observer = new ResizeObserver(place)
    observer.observe(root)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [nav, hidden])

  return (
    <nav
      ref={navRef}
      className={`dash-nav dash-nav--seibi${hidden ? ' is-scroll-hidden' : ''}`}
      aria-label="Principal"
      aria-hidden={hidden}
    >
      <span
        ref={indicatorRef}
        className={`dash-nav-indicator${indicatorReady ? ' is-ready' : ''}`}
        aria-hidden="true"
      />
      {left.map((item) => {
        const active = nav === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={active ? 'is-active' : ''}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={item.onClick}
          >
            <span className="dash-nav-hit">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {item.icon}
              </svg>
            </span>
          </button>
        )
      })}
      <button
        type="button"
        className={nav === 'estimados' ? 'is-active' : ''}
        aria-label={m.home_nav_estimates()}
        aria-current={nav === 'estimados' ? 'page' : undefined}
        onClick={onEstimados}
      >
        <span className="dash-nav-hit">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6.8A2.8 2.8 0 018.8 4h6.4A2.8 2.8 0 0118 6.8v6.4A2.8 2.8 0 0115.2 16H11l-4 3v-3H8.8A2.8 2.8 0 016 13.2V6.8z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M9 8.5h6M9 12h4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {right.map((item) => {
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
            className={active ? 'is-active' : ''}
            aria-label={badgeLabel}
            aria-current={active ? 'page' : undefined}
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
  useRequireProductionSession()
  const [step, setStep] = useState(() => getTutorialStep())
  const [hasVehicle, setHasVehicle] = useState(() => getGarage().vehicles.length > 0)
  const [activeVehicle, setActiveVehicle] = useState<VehicleProfile | null>(() =>
    getActiveVehicle(getGarage()),
  )
  const [fleetListOpen, setFleetListOpen] = useState(false)
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(readDismissedNotificationIds)
  const [nav, setNav] = useState<NavTab>(() => {
    if (typeof window === 'undefined') return 'home'
    const tab = new URLSearchParams(window.location.search).get('nav')
    if (
      tab === 'servicios' ||
      tab === 'estimados' ||
      tab === 'recordatorios' ||
      tab === 'perfil' ||
      tab === 'garaje' ||
      tab === 'notificaciones' ||
      tab === 'agregar'
    ) {
      return tab
    }
    return 'home'
  })
  const [focusReminderId, setFocusReminderId] = useState<string | null>(null)
  const [focusServiceId, setFocusServiceId] = useState<string | null>(null)
  const [serviciosPreferAll, setServiciosPreferAll] = useState(false)
  const [editOpenNonce, setEditOpenNonce] = useState(0)
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null)
  const [mileageOpenNonce, setMileageOpenNonce] = useState(0)
  const homeRootRef = useRef<HTMLDivElement>(null)
  const tutorialActive = step < TUTORIAL_TOTAL_STEPS
  const highlightedSection =
    tutorialActive && step >= 1 ? SECTION_ORDER[step - 1] : null
  const inbox = notificationsForVehicle(activeVehicle).filter(
    (item) => !dismissedNotificationIds.includes(item.id),
  )
  const notificationCount = inbox.length

  function goHome() {
    setFocusReminderId(null)
    setFocusServiceId(null)
    setServiciosPreferAll(false)
    setFleetListOpen(false)
    setNav('home')
    window.requestAnimationFrame(() => {
      homeRootRef.current
        ?.querySelector('.dash-scroll')
        ?.scrollTo({ top: 0, behavior: 'auto' })
    })
  }

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

  function openNotifications() {
    setFocusReminderId(null)
    setFocusServiceId(null)
    setServiciosPreferAll(false)
    setNav('notificaciones')
  }

  function openAddVehicle() {
    setFocusReminderId(null)
    setFocusServiceId(null)
    setServiciosPreferAll(false)
    setNav('agregar')
  }

  function clearNotifications() {
    const visible = notificationsForVehicle(activeVehicle).map((item) => item.id)
    const next = [...new Set([...dismissedNotificationIds, ...visible])]
    writeDismissedNotificationIds(next)
    setDismissedNotificationIds(next)
  }

  function openNotificationTarget(item: AppNotification) {
    if (item.target === 'avisos') {
      openAvisos(item.reminderId)
      return
    }
    if (item.target === 'servicios') {
      openServicios(item.serviceId)
      return
    }
    openEstimados()
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

  function renderVehicleHero(showChrome: boolean) {
    return (
      <VehicleHero
        showChrome={showChrome}
        onAddVehicle={openAddVehicle}
        editOpenNonce={editOpenNonce}
        editVehicleId={editVehicleId}
        mileageOpenNonce={mileageOpenNonce}
        unlocked={hasVehicle ? isSectionUnlocked('vehiculo', step) : true}
        kmUnlocked={hasVehicle ? isSectionUnlocked('kilometraje', step) : true}
        kmHighlighted={highlightedSection === 'kilometraje'}
        highlighted={
          highlightedSection === 'vehiculo' || highlightedSection === 'kilometraje'
        }
        toolbarExtras={
          <HeaderActions
            onOpenFleet={() => setFleetListOpen(true)}
            onOpenNotifications={openNotifications}
            hasNotifications={notificationCount > 0}
          />
        }
        fleetListOpen={fleetListOpen}
        onFleetListOpenChange={setFleetListOpen}
        onActiveChange={(vehicle) => {
          setActiveVehicle(vehicle)
        }}
        onFleetVehicleSelect={() => {
          setFleetListOpen(false)
          goHome()
        }}
        onServiceFocus={() => openAvisos()}
        onSaved={(profile) => {
          setHasVehicle(true)
          setActiveVehicle(profile)
          if (step < 3) unlockThrough(3)
        }}
      />
    )
  }

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
              goHome()
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
            onOpenReminder={(reminderId) => openAvisos(reminderId)}
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
      ) : nav === 'notificaciones' ? (
        <div className="dash-scroll avisos-scroll">
          <NotificationsScreen
            items={inbox}
            onBack={() => goHome()}
            onSelect={openNotificationTarget}
            onClear={clearNotifications}
          />
        </div>
      ) : nav === 'garaje' ? (
        <div className="dash-scroll">{renderVehicleHero(true)}</div>
      ) : (
        <div className="dash-scroll">
          <HomeDashboard
            vehicle={activeVehicle}
            vehicles={getGarage().vehicles}
            notificationCount={notificationCount}
            highlightedSection={highlightedSection}
            onOpenFleet={() => setFleetListOpen(true)}
            onOpenNotifications={openNotifications}
            onAddVehicle={openAddVehicle}
            onTutorialTarget={() =>
              unlockThrough(Math.min(TUTORIAL_TOTAL_STEPS, step + 1))
            }
            onOpenAvisos={openAvisos}
            onOpenServicios={openServicios}
            onSelectVehicle={(id) => {
              const next = persistActiveVehicle(id)
              setActiveVehicle(getActiveVehicle(next))
            }}
            onEditVehicle={(id) => {
              setEditVehicleId(id)
              setEditOpenNonce((value) => value + 1)
            }}
            onUpdateKm={() => setMileageOpenNonce((value) => value + 1)}
          />
        </div>
      )}

      {nav === 'home' || nav === 'agregar' || nav === 'notificaciones'
        ? renderVehicleHero(false)
        : null}

      {nav === 'agregar' ? (
        <VehicleSetupScreen
          onBack={() => goHome()}
          onSaved={(garage) => {
            const saved = getActiveVehicle(garage)
            setHasVehicle(true)
            setActiveVehicle(saved)
            if (step < 3) unlockThrough(3)
            goHome()
          }}
        />
      ) : null}

      <DashNav
        nav={nav}
        notificationCount={notificationCount}
        onHome={() => goHome()}
        onServicios={() => openServicios()}
        onEstimados={() => openEstimados()}
        onAvisos={() => {
          setFocusReminderId(null)
          setFocusServiceId(null)
          setNav('recordatorios')
        }}
        onPerfil={() => setNav('perfil')}
      />

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
