import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  reminderVehicleLabel,
  remindersForVehicle,
  type ReminderItem,
  type ReminderTone,
} from '../lib/reminders'
import type { VehicleProfile } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

function ToneIcon({ tone }: { tone: ReminderTone }) {
  if (tone === 'danger') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 8v5M12 16.5h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10.3 4.8L3.6 16.2A2 2 0 005.3 19h13.4a2 2 0 001.7-2.8L13.7 4.8a2 2 0 00-3.4 0z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (tone === 'warn') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 10v3l2 2M9 4h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 12.2l2.2 2.2 4.8-4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function reminderProgress(item: ReminderItem) {
  if (item.tone === 'danger' || /vencido/i.test(item.due)) {
    return 1
  }
  const daysMatch = item.due.match(/En (\d+) d[ií]as/i)
  if (daysMatch) {
    const days = Number(daysMatch[1])
    return Math.min(0.9, Math.max(0.14, 1 - days / 45))
  }
  const kmMatch = item.due.match(/Quedan ([\d.,]+)\s*km/i)
  if (kmMatch) {
    const left = Number(String(kmMatch[1]).replace(/[^\d]/g, '')) || 0
    return Math.min(0.9, Math.max(0.14, 1 - left / 5_000))
  }
  return item.tone === 'warn' ? 0.55 : 0.35
}

function reminderLiveCopy(item: ReminderItem) {
  const overdue = item.due.match(/^Vencido\s*[·•\-]\s*(.+)$/i)
  if (overdue) {
    return {
      title: 'Vencido',
      subtitle: item.name,
    }
  }
  return {
    title: item.due,
    subtitle: item.name,
  }
}

function ReminderCard({
  item,
  focused,
  onOpen,
}: {
  item: ReminderItem
  focused: boolean
  onOpen?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const progress = reminderProgress(item)
  const progressPct = `${Math.round(progress * 100)}%`
  const atEnd = progress >= 0.88
  const copy = reminderLiveCopy(item)

  const closeMenu = useEffectEvent(() => {
    setMenuOpen(false)
  })

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (target && cardRef.current?.contains(target)) return
      closeMenu()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const actions = [
    { id: 'schedule', label: m.home_reminder_schedule() },
    { id: 'update', label: m.home_reminder_update() },
    { id: 'snooze', label: m.home_reminder_snooze() },
  ] as const

  return (
    <article
      ref={cardRef}
      id={`aviso-${item.id}`}
      data-reminder-id={item.id}
      className={`aviso-live tone-${item.tone}${focused ? ' is-focused' : ''}${
        menuOpen ? ' is-menu-open' : ''
      }`}
    >
      <button
        type="button"
        className="aviso-live-open"
        aria-label={`${copy.title}. ${copy.subtitle}`}
        onClick={onOpen}
      >
        <div className="aviso-live-top">
          <span className="aviso-live-icon" aria-hidden="true">
            <ToneIcon tone={item.tone} />
          </span>
          <div className="aviso-live-copy">
            <p className="aviso-live-due">{copy.title}</p>
            <p className="aviso-live-name">{copy.subtitle}</p>
          </div>
          <span className="aviso-live-badge">{item.meta}</span>
        </div>
        <div className="aviso-live-track" aria-hidden="true">
          <span className="aviso-live-track-line" />
          <span className="aviso-live-track-done" style={{ width: progressPct }} />
          <span
            className={`aviso-live-thumb${atEnd ? ' is-at-end' : ''}`}
            style={atEnd ? undefined : { left: progressPct }}
          >
            <ToneIcon tone={item.tone} />
          </span>
          <span className="aviso-live-end" />
        </div>
      </button>
      <button
        type="button"
        className={`aviso-live-more${menuOpen ? ' is-open' : ''}`}
        aria-label={m.home_reminder_more()}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setMenuOpen((open) => !open)
        }}
      >
        <span aria-hidden="true">···</span>
      </button>
      {menuOpen ? (
        <div className="dash-upcoming-menu" role="menu" aria-label={m.home_reminder_more()}>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className="dash-upcoming-menu-item"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setMenuOpen(false)
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export { ReminderCard }

export function recentRemindersForVehicle(
  vehicle: VehicleProfile | null,
  limit = 2,
) {
  return remindersForVehicle(vehicle)
    .filter((item) => item.tone === 'danger' || item.tone === 'warn')
    .slice(0, limit)
}

export function Avisos({
  vehicle,
  focusReminderId = null,
  onBack,
  onFocusHandled,
}: {
  vehicle: VehicleProfile | null
  focusReminderId?: string | null
  onBack?: () => void
  onFocusHandled?: () => void
}) {
  const reminders = remindersForVehicle(vehicle)
  const label = reminderVehicleLabel(vehicle)
  const context = label
    ? m.home_vehicle_context({ vehicle: label })
    : m.home_vehicle_context_empty()
  const dangerCount = reminders.filter((item) => item.tone === 'danger').length
  const warnCount = reminders.filter((item) => item.tone === 'warn').length

  useEffect(() => {
    if (!focusReminderId) return
    const node = document.querySelector<HTMLElement>(
      `[data-reminder-id="${focusReminderId}"]`,
    )
    const start = window.setTimeout(() => {
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    const clear = window.setTimeout(() => onFocusHandled?.(), 2200)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(clear)
    }
  }, [focusReminderId, onFocusHandled])

  return (
    <div className="avisos-screen">
      <header className="avisos-header">
        {onBack ? (
          <button type="button" className="avisos-back" onClick={onBack}>
            {m.setup_back()}
          </button>
        ) : null}
        <p className="avisos-eyebrow">{m.home_reminders_eyebrow()}</p>
        <h1 className="avisos-title">{m.home_upcoming_title()}</h1>
        <p className="avisos-context">{context}</p>
      </header>

      <div className="avisos-legend" aria-label="Semáforo de avisos">
        <span className="avisos-chip tone-danger">{`Urgente · ${dangerCount}`}</span>
        <span className="avisos-chip tone-warn">{`Próximo · ${warnCount}`}</span>
        <span className="avisos-chip tone-ok">Al día</span>
      </div>

      <section className="aviso-live-list" aria-label={m.home_upcoming_title()}>
        {reminders.map((item) => (
          <ReminderCard
            key={item.id}
            item={item}
            focused={focusReminderId === item.id}
          />
        ))}
      </section>
    </div>
  )
}
