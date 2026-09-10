import { useEffect, useRef, useState, type ReactNode } from 'react'
import { VehicleHero, VehicleSetupScreen } from '../components/VehicleHero'
import { useRequireProductionSession } from '../lib/authSession'
import { getActiveVehicle, getGarage, setActiveVehicle as persistActiveVehicle, type VehicleProfile } from '../lib/vehicleProfile'
import {
  getNotificationsEnabled,
  subscribeNotificationsEnabled,
} from '../lib/notificationsPref'
import { recentServicesForVehicle } from '../lib/services'
import { remindersForVehicle } from '../lib/reminders'
import { Avisos } from './Avisos'
import { HomeDashboard } from './HomeDashboard'
import { Perfil } from './Perfil'
import { Servicios } from './Servicios'
import * as m from '../paraglide/messages.js'

function DashPane({
  variant = 'screen',
  className,
  children,
}: {
  variant?: 'home' | 'screen'
  className?: string
  children: ReactNode
}) {
  const [entering, setEntering] = useState(true)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(() => setEntering(false), reduce ? 0 : 1150)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      className={[
        'dash-scroll',
        'dash-pane',
        entering ? 'dash-pane--enter' : '',
        variant === 'home' ? 'dash-pane--home' : 'dash-pane--screen',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

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
  kind: 'aviso' | 'servicio'
  title: string
  body: string
  target: 'avisos' | 'servicios'
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

  return items
}

function kindLabel(kind: AppNotification['kind']) {
  if (kind === 'aviso') return m.home_notifications_kind_aviso()
  return m.home_notifications_kind_servicio()
}

const NOTIF_SLIDE_MS = 380
const NOTIF_STAGGER_MS = 70

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
  const [clearing, setClearing] = useState(false)
  const clearTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current)
    }
  }, [])

  useEffect(() => {
    if (items.length === 0) setClearing(false)
  }, [items.length])

  function handleClear() {
    if (clearing || items.length === 0) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      onClear()
      return
    }
    setClearing(true)
    const wait = NOTIF_SLIDE_MS + NOTIF_STAGGER_MS * Math.max(0, items.length - 1)
    clearTimer.current = window.setTimeout(() => {
      onClear()
    }, wait)
  }

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
          <ul className={`notif-sheet-list${clearing ? ' is-clearing' : ''}`}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`notif-sheet-item kind-${item.kind}`}
                  onClick={() => {
                    if (clearing) return
                    onSelect(item)
                  }}
                >
                  <span className="notif-sheet-kind">{kindLabel(item.kind)}</span>
                  <span className="notif-sheet-title">{item.title}</span>
                  <span className="notif-sheet-body">{item.body}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="notif-clear" disabled={clearing} onClick={handleClear}>
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

type NavTab = 'home' | 'recordatorios' | 'perfil' | 'servicios' | 'notificaciones' | 'agregar'

function DashNav({
  nav,
  hidden = false,
  notificationCount = 0,
  onHome,
  onAvisos,
  onServicios,
  onPerfil,
}: {
  nav: NavTab
  hidden?: boolean
  notificationCount?: number
  onHome: () => void
  onAvisos: () => void
  onServicios: () => void
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
      id: 'servicios' as const,
      label: m.home_nav_services(),
      onClick: onServicios,
      badge: null as number | null,
      icon: (
        <>
          <path
            d="M8 6.5H6.5A1.5 1.5 0 005 8v11.5A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V8a1.5 1.5 0 00-1.5-1.5H16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <rect
            x="8"
            y="3.5"
            width="8"
            height="4"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M8.5 12.5h7M8.5 16h5"
            stroke="currentColor"
            strokeWidth="1.7"
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
      className={`dash-nav dash-nav--seibi${hidden ? ' is-scroll-hidden' : ''}`}
      aria-label="Principal"
      aria-hidden={hidden}
    >
      {items.map((item) => {
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
            <span className="dash-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function Home() {
  useRequireProductionSession()
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
      tab === 'recordatorios' ||
      tab === 'perfil' ||
      tab === 'notificaciones' ||
      tab === 'agregar'
    ) {
      return tab
    }
    return 'home'
  })
  const [focusReminderId, setFocusReminderId] = useState<string | null>(null)
  const [focusServiceId, setFocusServiceId] = useState<string | null>(null)
  const [editOpenNonce, setEditOpenNonce] = useState(0)
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null)
  const homeRootRef = useRef<HTMLDivElement>(null)
  const [notifsOn, setNotifsOn] = useState(() => getNotificationsEnabled())
  const inbox = notifsOn
    ? notificationsForVehicle(activeVehicle).filter(
        (item) => !dismissedNotificationIds.includes(item.id),
      )
    : []
  const notificationCount = inbox.length

  function goHome() {
    setFocusReminderId(null)
    setFocusServiceId(null)
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
    setNav('recordatorios')
  }

  function openServicios(serviceId?: string) {
    setFocusReminderId(null)
    setFocusServiceId(serviceId ?? null)
    setNav('servicios')
  }

  function openNotifications() {
    setFocusReminderId(null)
    setFocusServiceId(null)
    setNav('notificaciones')
  }

  function openAddVehicle() {
    setFocusReminderId(null)
    setFocusServiceId(null)
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
    openServicios(item.serviceId)
  }

  useEffect(() => subscribeNotificationsEnabled(() => {
    setNotifsOn(getNotificationsEnabled())
  }), [])

  useEffect(() => {
    const syncGarage = () => {
      const garage = getGarage()
      setActiveVehicle(getActiveVehicle(garage))
    }
    window.addEventListener('seibi-garage-change', syncGarage)
    return () => window.removeEventListener('seibi-garage-change', syncGarage)
  }, [])

  function renderVehicleHero(showChrome: boolean) {
    return (
      <VehicleHero
        showChrome={showChrome}
        onAddVehicle={openAddVehicle}
        editOpenNonce={editOpenNonce}
        editVehicleId={editVehicleId}
        unlocked
        kmUnlocked
        kmHighlighted={false}
        highlighted={false}
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
          setActiveVehicle(profile)
        }}
      />
    )
  }

  return (
    <div ref={homeRootRef} className="dash-home is-toolbar-settled">
      {nav === 'recordatorios' ? (
        <DashPane key="recordatorios" className="avisos-scroll">
          <Avisos
            vehicle={activeVehicle}
            focusReminderId={focusReminderId}
            onFocusHandled={() => setFocusReminderId(null)}
          />
        </DashPane>
      ) : nav === 'servicios' ? (
        <DashPane key="servicios" className="avisos-scroll">
          <Servicios
            vehicle={activeVehicle}
            focusServiceId={focusServiceId}
            onFocusHandled={() => setFocusServiceId(null)}
          />
        </DashPane>
      ) : nav === 'perfil' ? (
        <DashPane key="perfil" className="avisos-scroll">
          <Perfil vehicle={activeVehicle} />
        </DashPane>
      ) : nav === 'notificaciones' ? (
        <DashPane key="notificaciones" className="avisos-scroll">
          <NotificationsScreen
            items={inbox}
            onBack={() => goHome()}
            onSelect={openNotificationTarget}
            onClear={clearNotifications}
          />
        </DashPane>
      ) : (
        <DashPane key="home" variant="home">
          <HomeDashboard
            vehicle={activeVehicle}
            vehicles={getGarage().vehicles}
            notificationCount={notificationCount}
            onOpenFleet={() => setFleetListOpen(true)}
            onOpenNotifications={openNotifications}
            onAddVehicle={openAddVehicle}
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
          />
        </DashPane>
      )}

      {nav === 'home' || nav === 'agregar' || nav === 'notificaciones'
        ? renderVehicleHero(false)
        : null}

      {nav === 'agregar' ? (
        <VehicleSetupScreen
          onBack={() => goHome()}
          onSaved={(garage) => {
            setActiveVehicle(getActiveVehicle(garage))
            goHome()
          }}
        />
      ) : null}

      <DashNav
        nav={nav}
        notificationCount={notificationCount}
        onHome={() => goHome()}
        onAvisos={() => {
          setFocusReminderId(null)
          setFocusServiceId(null)
          setNav('recordatorios')
        }}
        onServicios={() => openServicios()}
        onPerfil={() => setNav('perfil')}
      />
    </div>
  )
}
