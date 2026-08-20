import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GarageCarStage } from '../components/GarageCarStage'
import {
  formatMileageAmount,
  oilKmRemaining,
  vehicleArtSrc,
  vehicleNeedsService,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import {
  batteryLifeForVehicle,
  remindersForVehicle,
  upcomingMaintenanceForVehicle,
  wearLevelFromPct,
  WEAR_COLOR,
  type ReminderItem,
  type WearLevel,
} from '../lib/reminders'
import {
  addLoggedService,
  recentServicesForVehicle,
  reminderIdForPartName,
  subscribeServicesChange,
} from '../lib/services'
import {
  assignHudSlot,
  DEFAULT_HUD_LAYOUT,
  HUD_SLOTS,
  hudLayoutForVehicle,
  type HudLayout,
  type HudSlot,
} from '../lib/hudLayout'
import { ServiceIconGlyph } from './Servicios'
import * as m from '../paraglide/messages.js'

function dueProgress(item: ReminderItem) {
  return item.remainingPct
}

function wearStatusLabel(level: WearLevel) {
  if (level === 'optimal') return m.home_wear_status_optimal()
  if (level === 'medium') return m.home_wear_status_medium()
  if (level === 'high') return m.home_wear_status_high()
  return m.home_wear_status_replace()
}

function wearLegend() {
  return [
    {
      id: 'optimal' as const,
      range: m.home_wear_range_optimal(),
      label: m.home_wear_status_optimal(),
      sample: 85,
    },
    {
      id: 'medium' as const,
      range: m.home_wear_range_medium(),
      label: m.home_wear_status_medium(),
      sample: 55,
    },
    {
      id: 'high' as const,
      range: m.home_wear_range_high(),
      label: m.home_wear_status_high(),
      sample: 27,
    },
    {
      id: 'replace' as const,
      range: m.home_wear_range_replace(),
      label: m.home_wear_status_replace(),
      sample: 8,
    },
  ]
}

function WearGauge({
  pct,
  color,
  label,
  size = 'lg',
}: {
  pct: number
  color: string
  label?: string
  size?: 'lg' | 'sm'
}) {
  const large = size === 'lg'
  const view = large ? 120 : 32
  const r = large ? 46 : 11
  const c = 2 * Math.PI * r
  const cx = view / 2
  const shown = Math.min(100, Math.max(0, pct))

  return (
    <span
      className={`seibi-wear-gauge is-${size}`}
      style={{ '--wear': color } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${view} ${view}`}>
        <circle className="seibi-wear-gauge-track" cx={cx} cy={cx} r={r} />
        <circle
          className="seibi-wear-gauge-fill"
          cx={cx}
          cy={cx}
          r={r}
          style={{
            stroke: color,
            strokeDasharray: `${c}`,
            strokeDashoffset: `${c * (1 - shown / 100)}`,
          }}
        />
      </svg>
      {large ? (
        <span className="seibi-wear-gauge-copy">
          <strong>{Math.round(shown)}%</strong>
          {label ? <em>{label}</em> : null}
        </span>
      ) : null}
    </span>
  )
}

function hudStatusLabel(level: WearLevel) {
  if (level === 'optimal') return m.home_health_ok()
  if (level === 'medium') return m.home_health_fair()
  if (level === 'high') return m.home_wear_status_high()
  return m.home_wear_status_replace()
}

function hudShortLabel(id: string) {
  if (id === 'oil') return m.home_hud_label_oil()
  if (id === 'brakes') return m.home_hud_label_brakes()
  if (id === 'tires') return m.home_hud_label_tires()
  if (id === 'battery') return m.home_hud_label_battery()
  if (id === 'alignment') return m.home_hud_label_alignment()
  if (id === 'air-filter') return m.home_hud_label_filter()
  if (id === 'coolant') return m.home_hud_label_coolant()
  if (id === 'spark') return m.home_hud_label_spark()
  return id
}

function hudIconKind(id: string) {
  if (id === 'brakes') return 'brakes' as const
  if (id === 'tires') return 'tires' as const
  if (id === 'battery') return 'battery' as const
  if (id === 'alignment') return 'alignment' as const
  if (id === 'air-filter') return 'filter' as const
  if (id === 'coolant') return 'coolant' as const
  if (id === 'spark') return 'spark' as const
  return 'engine' as const
}

function HudPartIcon({
  kind,
}: {
  kind: 'engine' | 'brakes' | 'tires' | 'battery' | 'alignment' | 'filter' | 'coolant' | 'spark'
}) {
  if (kind === 'engine') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 9V7h8v2h2.5v4.5H17V18H7v-2.5H5.5V11H8V9z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M10 7V5h4v2M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'brakes') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 4.8v2.2M12 17v2.2M4.8 12h2.2M17 12h2.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (kind === 'tires') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="16" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="8" cy="16" r="3.1" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="16" cy="16" r="3.1" stroke="currentColor" strokeWidth="1.55" />
      </svg>
    )
  }
  if (kind === 'alignment') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'filter') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 6h14l-5.5 7v4.5L10.5 19v-6L5 6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'coolant') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4.5S7 10.2 7 13.4a5 5 0 0010 0C17 10.2 12 4.5 12 4.5z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'spark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10.5 3h3v6l2 2.5v4.2a2.8 2.8 0 01-2.8 2.8h-1.4A2.8 2.8 0 018.5 15.7V11.5L10.5 9V3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 18.8v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="7.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M18 10.2h2v3.6h-2M8.2 12h4.2M10.3 10.2v3.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HeaderBtn({
  label,
  onClick,
  badge,
  accent,
  children,
}: {
  label: string
  onClick?: () => void
  badge?: number
  accent?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`seibi-head-btn${accent ? ' is-accent' : ''}`}
      aria-label={label}
      onClick={onClick}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="seibi-head-badge" aria-hidden="true">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )
}

function ShortcutTile({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" className="seibi-shortcut" onClick={onClick} disabled={disabled}>
      <span className="seibi-shortcut-icon" aria-hidden="true">
        {children}
      </span>
      <span>{label}</span>
    </button>
  )
}

function QuickSheet({
  title,
  desc,
  onClose,
  children,
}: {
  title: string
  desc?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return createPortal(
    <div className="mileage-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="mileage-modal-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="mileage-modal-card">
        <header className="mileage-modal-head">
          <h2 className="mileage-modal-title">{title}</h2>
          <button type="button" className="mileage-modal-close" onClick={onClose}>
            {m.home_vehicle_sheet_close()}
          </button>
        </header>
        {desc ? <p className="mileage-modal-desc">{desc}</p> : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function CalendarPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const selected = value ? new Date(`${value}T00:00:00`) : new Date()
  const [cursor, setCursor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  )
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const start = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayIso = new Date().toISOString().slice(0, 10)
  const cells = Array.from({ length: start + daysInMonth }, (_, index) => {
    if (index < start) return null
    return index - start + 1
  })

  return (
    <div className="seibi-cal">
      <div className="seibi-cal-head">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <strong>
          {cursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
        </strong>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="seibi-cal-week">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="seibi-cal-grid">
        {cells.map((day, index) => {
          if (!day) return <span key={`e-${index}`} />
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          return (
            <button
              key={iso}
              type="button"
              className={`${iso === value ? 'is-selected' : ''}${iso === todayIso ? ' is-today' : ''}`}
              onClick={() => onChange(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 12a7.4 7.4 0 00-.1-1l2-1.5-2-3.5-2.4 1a7.6 7.6 0 00-1.7-1l-.3-2.6h-4l-.3 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 000 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 001.7 1l.3 2.6h4l.3-2.6a7.6 7.6 0 001.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function vehicleCardHealth(item: VehicleProfile) {
  return { needsService: vehicleNeedsService(item) }
}

export function HomeDashboard({
  vehicle,
  vehicles,
  notificationCount,
  highlightedSection,
  onOpenFleet,
  onOpenNotifications,
  onAddVehicle,
  onOpenAvisos,
  onOpenServicios,
  onSelectVehicle,
  onEditVehicle,
  onUpdateKm,
  onTutorialTarget,
}: {
  vehicle: VehicleProfile | null
  vehicles: VehicleProfile[]
  notificationCount: number
  highlightedSection: string | null
  onOpenFleet: () => void
  onOpenNotifications: () => void
  onAddVehicle: () => void
  onOpenAvisos: (reminderId?: string) => void
  onOpenServicios: (serviceId?: string, preferAll?: boolean) => void
  onSelectVehicle: (id: string) => void
  onEditVehicle: (id: string) => void
  onUpdateKm: () => void
  onTutorialTarget?: () => void
}) {
  const fleetRef = useRef<HTMLDivElement>(null)
  const reminders = remindersForVehicle(vehicle)
  const [focusReminderId, setFocusReminderId] = useState<string | null>(null)
  const focusedReminder = focusReminderId
    ? reminders.find((item) => item.id === focusReminderId)
    : undefined
  const next =
    focusedReminder ??
    reminders.find((item) => item.tone === 'danger' || item.tone === 'warn') ??
    reminders[0]
  const fleet = vehicles
  const fleetMany = vehicles.length > 0
  const [addFocused, setAddFocused] = useState(false)
  const showVehicleData = Boolean(vehicle) && !addFocused
  const [addArmed, setAddArmed] = useState(false)
  const [editArmed, setEditArmed] = useState(false)
  const [quickSheet, setQuickSheet] = useState<'part' | 'battery' | 'appt' | null>(null)
  const [wearFocus, setWearFocus] = useState<ReminderItem | null>(null)
  const [hudLayout, setHudLayout] = useState<HudLayout>(DEFAULT_HUD_LAYOUT)
  const [hudEditSlot, setHudEditSlot] = useState<HudSlot | null>(null)
  const [wearEditing, setWearEditing] = useState(false)
  const [partName, setPartName] = useState('')
  const [partCost, setPartCost] = useState('')
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [apptNote, setApptNote] = useState('')
  const [apptSaved, setApptSaved] = useState('')
  const [, setServicesTick] = useState(0)
  const recent = showVehicleData ? recentServicesForVehicle(vehicle, 2) : []
  const batteryLife = showVehicleData ? batteryLifeForVehicle(vehicle) : null
  const lockCards = highlightedSection === 'animacion'
  const lockAdd =
    highlightedSection === 'animacion' || highlightedSection === 'vehiculo'

  function selectVehicle(id: string) {
    if (lockCards) return
    setAddFocused(false)
    onSelectVehicle(id)
    if (highlightedSection === 'vehiculo') onTutorialTarget?.()
  }

  function addVehicle() {
    if (lockAdd) return
    if (!addFocused) {
      setAddFocused(true)
      return
    }
    if (!addArmed) return
    onAddVehicle()
    if (highlightedSection === 'agregar') onTutorialTarget?.()
  }

  function openQuick(kind: 'part' | 'battery' | 'appt') {
    if (!showVehicleData || !vehicle) return
    setPartName('')
    setPartCost('')
    setApptDate(new Date().toISOString().slice(0, 10))
    setApptNote('')
    setApptSaved('')
    setQuickSheet(kind)
  }

  function savePart() {
    if (!vehicle || !partName.trim()) return
    addLoggedService(vehicle.id, { name: partName, cost: partCost, mileage: vehicle.mileage })
    setFocusReminderId(reminderIdForPartName(partName))
    setQuickSheet(null)
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-section="recientes"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function saveAppointment() {
    if (!vehicle || !apptDate) return
    addAppointment({ vehicleId: vehicle.id, date: apptDate, note: apptNote })
    setApptSaved(formatAppointmentDate(apptDate))
  }

  function pickHudPart(reminderId: string) {
    const item = reminders.find((reminder) => reminder.id === reminderId)
    if (!item) return
    if (vehicle && hudEditSlot) {
      setHudLayout(assignHudSlot(vehicle.id, hudEditSlot, reminderId))
    }
    setWearFocus(item)
    setWearEditing(false)
  }

  useEffect(() => {
    const track = fleetRef.current
    if (!track) return
    const target = addFocused
      ? track.querySelector<HTMLElement>('[data-vehicle-id="add"]')
      : vehicle
        ? track.querySelector<HTMLElement>(`[data-vehicle-id="${vehicle.id}"]`)
        : null
    if (!target) return
    const left = target.offsetLeft - (track.clientWidth - target.clientWidth) / 2
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [vehicle?.id, addFocused])

  useEffect(() => {
    if (!addFocused) {
      setAddArmed(false)
      return
    }
    const timer = window.setTimeout(() => setAddArmed(true), 480)
    return () => window.clearTimeout(timer)
  }, [addFocused])

  useEffect(() => subscribeServicesChange(() => setServicesTick((n) => n + 1)), [])

  useEffect(() => {
    if (!vehicle?.id || addFocused) {
      setEditArmed(false)
      return
    }
    setEditArmed(false)
    const timer = window.setTimeout(() => setEditArmed(true), 480)
    return () => window.clearTimeout(timer)
  }, [vehicle?.id, addFocused])

  useEffect(() => {
    setAddFocused(false)
    setFocusReminderId(null)
  }, [vehicles.length])

  useEffect(() => {
    setFocusReminderId(null)
    setWearFocus(null)
    setHudEditSlot(null)
    setWearEditing(false)
    if (vehicle?.id) setHudLayout(hudLayoutForVehicle(vehicle.id))
    else setHudLayout(DEFAULT_HUD_LAYOUT)
  }, [vehicle?.id])

  useEffect(() => {
    if (highlightedSection !== 'vehiculo' || vehicles.length > 0) return
    onTutorialTarget?.()
    // Skip card selection when the garage is empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedSection, vehicles.length])
  const oilLeft =
    showVehicleData && next?.id === 'oil' && next.remainingKm != null
      ? next.remainingKm
      : showVehicleData && vehicle
        ? oilKmRemaining(vehicle.mileage)
        : 0
  const nextCopy =
    showVehicleData && next?.id === 'oil' && vehicle && oilLeft > 0
      ? m.home_due_days_or_km({
          days: String(Math.max(1, Math.round(oilLeft / 120))),
          km: oilLeft.toLocaleString('es-MX'),
        })
      : (showVehicleData ? (next?.due ?? m.home_recent_empty()) : m.home_no_data())
  const progress = showVehicleData && next ? dueProgress(next) : 0
  const wearLevel = wearLevelFromPct(progress)
  const wearColor = WEAR_COLOR[wearLevel]
  const [shownProgress, setShownProgress] = useState(0)

  useEffect(() => {
    setShownProgress(0)
    if (!showVehicleData || !next?.id) return

    const target = progress
    const duration = 920
    let start: number | null = null
    let frame = 0

    function tick(now: number) {
      if (start == null) start = now
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setShownProgress(target * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [vehicle?.id, next?.id, progress, showVehicleData])

  return (
    <div className="seibi-dash">
      <header className="seibi-dash-head">
        <div className="seibi-dash-brand">
          <p className="seibi-logo">
            SEIB<span className="seibi-logo-i">I</span>
          </p>
          <p className="seibi-tagline">{m.home_your_vehicle()}</p>
        </div>
        <div className="seibi-dash-actions">
          <HeaderBtn label={m.home_fleet_open()} onClick={onOpenFleet}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l1.2-3.6A2 2 0 018.1 8h7.8a2 2 0 011.9 1.4L19 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M4 16.5h16v2a1 1 0 01-1 1h-1.2a2 2 0 01-3.6 0H9.8a2 2 0 01-3.6 0H5a1 1 0 01-1-1v-2z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </HeaderBtn>
          <HeaderBtn
            label={m.home_notifications()}
            onClick={onOpenNotifications}
            badge={notificationCount}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 9a6 6 0 0112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M10 19a2 2 0 004 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </HeaderBtn>
          <HeaderBtn label={m.home_garage_add()} onClick={onAddVehicle} accent>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 6v12M6 12h12"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </HeaderBtn>
        </div>
      </header>

      <div
        data-section="animacion"
        className={`seibi-hero-stage${
          highlightedSection === 'animacion' ? ' is-highlighted' : ''
        }${addFocused ? ' is-adding' : ''}`}
      >
        <div className="seibi-stage-slide">
          <div className="seibi-stage-car">
            <GarageCarStage vehicle={vehicle} />
          </div>
          <div className="seibi-stage-id">
            {vehicle ? (
              <>
                <p className="seibi-hero-brand">{vehicle.brand}</p>
                <h2 className="seibi-hero-title">{vehicle.model}</h2>
                <p className="seibi-hero-year">{vehicle.year}</p>
              </>
            ) : (
              <>
                <h2 className="seibi-hero-title">{m.home_vehicle_empty_title()}</h2>
                <p className="seibi-hero-empty-hint">{m.home_vehicle_empty_hint()}</p>
              </>
            )}
          </div>
        </div>
        <div className="seibi-stage-add-pane" aria-hidden={!addFocused}>
          <p className="seibi-stage-add-title">{m.home_garage_add_card_title()}</p>
          <p className="seibi-stage-add-hint">
            {addArmed ? m.home_garage_add_card_ready() : m.home_garage_add_card_hint()}
          </p>
        </div>
        {highlightedSection === 'animacion' ? (
          <button
            type="button"
            className="seibi-stage-hit"
            aria-label={m.tutorial_1_title()}
            onClick={() => onTutorialTarget?.()}
          />
        ) : null}
      </div>

      <section
        data-section="vehiculo"
        className={`seibi-fleet${
          highlightedSection === 'vehiculo' || highlightedSection === 'kilometraje'
            ? ' is-highlighted'
            : ''
        }`}
      >
        <div
          ref={fleetRef}
          className={`seibi-fleet-track${fleetMany ? '' : ' is-single'}`}
        >
          {fleet.map((item, index) => {
            const active = item.id === vehicle?.id && !addFocused
            const healthCard = vehicleCardHealth(item)
            return (
              <div
                key={item.id}
                data-vehicle-id={item.id}
                className={`seibi-hero${active ? ' is-active' : ''}${
                  lockCards ? ' is-locked' : ''
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={() => selectVehicle(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectVehicle(item.id)
                  }
                }}
              >
                <img
                  className="seibi-hero-thumb"
                  src={vehicleArtSrc(index)}
                  alt=""
                  draggable={false}
                />
                <div className="seibi-hero-top">
                  <div>
                    <p className="seibi-kicker">{m.home_your_vehicle()}</p>
                    <h2 className="seibi-hero-title">
                      {item.model} <span>{item.year}</span>
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="seibi-hero-settings"
                    aria-label={
                      active && editArmed
                        ? m.home_vehicle_edit_open()
                        : m.home_service_select_first()
                    }
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      if (!active) {
                        selectVehicle(item.id)
                        return
                      }
                      if (!editArmed) return
                      onEditVehicle(item.id)
                    }}
                  >
                    <GearIcon />
                  </button>
                </div>
                <div className="seibi-hero-stats">
                  <div className="seibi-hero-stat seibi-hero-stat--km">
                    <p>{m.home_garage_km_label()}</p>
                    <strong>
                      <span className="seibi-hero-km-value">{formatMileageAmount(item.mileage)}</span>
                      <span className="seibi-hero-km-unit">{m.setup_4_suffix()}</span>
                    </strong>
                  </div>
                  <div className="seibi-hero-stats-divider" aria-hidden="true" />
                  <div className="seibi-hero-stat">
                    <p>{m.home_garage_status_label()}</p>
                    {healthCard.needsService ? (
                      <button
                        type="button"
                        className="seibi-hero-stat-action is-warn"
                        aria-label={
                          active && editArmed
                            ? m.home_service_focus_open()
                            : m.home_service_select_first()
                        }
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          if (!active) {
                            selectVehicle(item.id)
                            return
                          }
                          if (!editArmed) return
                          const urgent = upcomingMaintenanceForVehicle(item, 1)[0]
                          onOpenAvisos(urgent?.id)
                        }}
                      >
                        Requiere
                        <br />
                        servicio
                      </button>
                    ) : (
                      <strong className="is-ok">{m.home_garage_status_ready()}</strong>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            data-vehicle-id="add"
            data-section="agregar"
            className={`seibi-hero seibi-hero--add${addFocused ? ' is-active' : ''}${
              addArmed ? ' is-armed' : ''
            }${highlightedSection === 'agregar' ? ' is-highlighted' : ''}${
              lockAdd ? ' is-locked' : ''
            }`}
            aria-pressed={addFocused}
            aria-label={addArmed ? m.home_garage_add() : m.home_garage_add_card_hint()}
            disabled={lockAdd}
            onClick={addVehicle}
          >
            <span className="seibi-hero-add-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 6v12M6 12h12"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p className="seibi-hero-add-title">{m.home_garage_add_card_title()}</p>
            <p className="seibi-hero-add-hint">
              {addArmed ? m.home_garage_add_card_ready() : m.home_garage_add_card_hint()}
            </p>
          </button>
        </div>
      </section>

      <section
        data-section="servicios"
        className={`seibi-section${highlightedSection === 'servicios' ? ' is-highlighted' : ''}`}
      >
        <div className="seibi-section-head">
          <h2>{m.home_section_shortcuts()}</h2>
        </div>
        <div className="seibi-shortcuts">
          <ShortcutTile
            label={m.home_shortcut_km()}
            disabled={!showVehicleData}
            onClick={onUpdateKm}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M12 12l4-2.2M12 8.2V12"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </ShortcutTile>
          <ShortcutTile
            label={m.home_shortcut_part()}
            disabled={!showVehicleData}
            onClick={() => openQuick('part')}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </ShortcutTile>
          <ShortcutTile
            label={m.home_shortcut_battery()}
            disabled={!showVehicleData}
            onClick={() => openQuick('battery')}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M18 10h2v4h-2M8 12h5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </ShortcutTile>
          <ShortcutTile
            label={m.home_shortcut_appointment()}
            disabled={!showVehicleData}
            onClick={() => openQuick('appt')}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M8 3.5V7M16 3.5V7M4 10h16"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </ShortcutTile>
        </div>
      </section>

      <section
        data-section="recordatorios"
        className={`seibi-section${
          highlightedSection === 'recordatorios' ? ' is-highlighted' : ''
        }`}
      >
        <div className="seibi-section-head">
          <h2>{m.home_section_upcoming()}</h2>
          {showVehicleData ? (
            <button type="button" onClick={() => onOpenAvisos()}>
              {m.home_see_all()}
            </button>
          ) : null}
        </div>
        {showVehicleData && next ? (
          <div className="seibi-maint">
            <button
              type="button"
              className="seibi-maint-main"
              onClick={() => onOpenAvisos(next.id)}
            >
              <span className="seibi-maint-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 4h8l1.5 5H6.5L8 4zM7 9v9a2 2 0 002 2h6a2 2 0 002-2V9"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path d="M10 13h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <span className="seibi-maint-copy">
                <strong>{next.name}</strong>
                <span>{nextCopy}</span>
              </span>
            </button>
            <button
              type="button"
              className="seibi-maint-ring-wrap"
              aria-label={m.home_wear_open()}
              onClick={() => {
                const slot = HUD_SLOTS.find((key) => hudLayout[key] === next.id) ?? null
                setHudEditSlot(slot)
                setWearEditing(false)
                setWearFocus(next)
              }}
            >
              <svg className="seibi-maint-ring" viewBox="0 0 48 48">
                <circle className="seibi-maint-ring-track" cx="24" cy="24" r="18" />
                <circle
                  className="seibi-maint-ring-fill"
                  cx="24"
                  cy="24"
                  r="18"
                  style={{
                    stroke: wearColor,
                    strokeDasharray: `${2 * Math.PI * 18}`,
                    strokeDashoffset: `${2 * Math.PI * 18 * (1 - shownProgress / 100)}`,
                  }}
                />
              </svg>
              <span className="seibi-maint-pct">{Math.round(shownProgress)}%</span>
            </button>
          </div>
        ) : (
          <p className="dash-tx-empty">
            {showVehicleData ? m.home_recent_empty() : m.home_no_data()}
          </p>
        )}
      </section>

      <section className="seibi-section" data-section="recientes" aria-label={m.home_recent_title()}>
        <div className="seibi-section-head">
          <h2>{m.home_recent_title()}</h2>
          {recent.length > 0 ? (
            <button type="button" onClick={() => onOpenServicios(undefined, true)}>
              {m.home_see_all()}
            </button>
          ) : null}
        </div>
        {recent.length > 0 ? (
          <div className="seibi-recent">
            {recent.map((item) => (
              <button
                key={item.id}
                type="button"
                className="seibi-recent-row"
                onClick={() => onOpenServicios(item.id, true)}
              >
                <span className="seibi-recent-icon" aria-hidden="true">
                  <ServiceIconGlyph icon={item.icon} />
                </span>
                <span className="seibi-recent-copy">
                  <strong>{item.name}</strong>
                  <span>{item.meta}</span>
                </span>
                <strong className="seibi-recent-cost">{item.cost}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="dash-tx-empty">
            {showVehicleData ? m.home_recent_empty() : m.home_no_data()}
          </p>
        )}
      </section>

      <section
        id="seibi-health"
        data-section="estimados"
        className={`seibi-section${highlightedSection === 'estimados' ? ' is-highlighted' : ''}`}
      >
        <div className="seibi-section-head">
          <h2>{m.home_section_health()}</h2>
          {showVehicleData ? (
            <button type="button" onClick={() => onOpenAvisos()}>
              {m.home_see_details()}
            </button>
          ) : null}
        </div>
        {showVehicleData ? (
          <div className="seibi-hud">
            <svg className="seibi-hud-hex" viewBox="0 0 200 230" aria-hidden="true">
              <defs>
                <linearGradient id="seibi-hud-stroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff6b63" />
                  <stop offset="45%" stopColor="#c40000" />
                  <stop offset="100%" stopColor="#ff3b30" />
                </linearGradient>
                <filter id="seibi-hud-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <polygon
                className="seibi-hud-hex-fill"
                points="100,16 180,62 180,168 100,214 20,168 20,62"
              />
              <polygon
                className="seibi-hud-hex-inner"
                points="100,34 164,72 164,158 100,196 36,158 36,72"
              />
              <polygon
                className="seibi-hud-hex-edge"
                points="100,16 180,62 180,168 100,214 20,168 20,62"
                filter="url(#seibi-hud-glow)"
              />
            </svg>
            <img
              className="seibi-hud-car"
              src={vehicleArtSrc(
                Math.max(
                  0,
                  vehicles.findIndex((item) => item.id === vehicle?.id),
                ),
              )}
              alt=""
              draggable={false}
            />
            {HUD_SLOTS.map((slot) => {
              const reminderId = hudLayout[slot]
              const item = reminders.find((reminder) => reminder.id === reminderId)
              const level = wearLevelFromPct(item?.remainingPct ?? 0)
              return (
                <button
                  key={slot}
                  type="button"
                  className={`seibi-hud-node is-${slot}`}
                  style={{ '--wear': WEAR_COLOR[level] } as CSSProperties}
                  aria-label={`${hudShortLabel(reminderId)}: ${hudStatusLabel(level)}`}
                  onClick={() => {
                    if (!item) return
                    setHudEditSlot(slot)
                    setWearEditing(false)
                    setWearFocus(item)
                  }}
                >
                  <span className="seibi-hud-icon">
                    <HudPartIcon kind={hudIconKind(reminderId)} />
                  </span>
                  <strong>{hudShortLabel(reminderId)}</strong>
                  <span>{hudStatusLabel(level)}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="dash-tx-empty">{m.home_no_data()}</p>
        )}
      </section>

      {wearFocus ? (
        <QuickSheet
          title={m.home_wear_title()}
          desc={m.home_wear_desc()}
          onClose={() => {
            setWearFocus(null)
            setHudEditSlot(null)
            setWearEditing(false)
          }}
        >
          <div className="seibi-wear">
            <div
              className="seibi-wear-hero"
              style={
                {
                  '--wear': WEAR_COLOR[wearLevelFromPct(wearFocus.remainingPct)],
                } as CSSProperties
              }
            >
              <p className="seibi-wear-now-kicker">{m.home_wear_current()}</p>
              <WearGauge
                pct={wearFocus.remainingPct}
                color={WEAR_COLOR[wearLevelFromPct(wearFocus.remainingPct)]}
                label={wearStatusLabel(wearLevelFromPct(wearFocus.remainingPct))}
              />
              <div className="seibi-wear-part-row">
                <strong className="seibi-wear-part">{wearFocus.name}</strong>
                <button
                  type="button"
                  className={`seibi-wear-edit${wearEditing ? ' is-open' : ''}`}
                  aria-label={m.home_hud_edit()}
                  aria-expanded={wearEditing}
                  onClick={() => setWearEditing((open) => !open)}
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14.5 5.5l4 4M4 20l1.2-4.2L15.7 5.3a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L8.2 18.8 4 20z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {wearEditing ? (
              <>
                <p className="seibi-wear-legend-title">{m.home_hud_pick_title()}</p>
                <p className="seibi-wear-pick-hint">{m.home_hud_pick_desc()}</p>
                <div className="seibi-hud-pick">
                  {[
                    'oil',
                    'brakes',
                    'tires',
                    'battery',
                    'alignment',
                    'air-filter',
                    'coolant',
                    'spark',
                  ].map((id) => {
                    const item = reminders.find((reminder) => reminder.id === id)
                    if (!item) return null
                    const selected = wearFocus.id === item.id
                    const used = HUD_SLOTS.some((slot) => hudLayout[slot] === item.id)
                    const level = wearLevelFromPct(item.remainingPct)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`seibi-hud-pick-item${selected ? ' is-selected' : ''}${
                          used && !selected ? ' is-used' : ''
                        }`}
                        style={{ '--wear': WEAR_COLOR[level] } as CSSProperties}
                        onClick={() => pickHudPart(item.id)}
                      >
                        <span className="seibi-hud-pick-icon">
                          <HudPartIcon kind={hudIconKind(item.id)} />
                        </span>
                        <strong>{hudShortLabel(item.id)}</strong>
                        <span>{hudStatusLabel(level)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="seibi-wear-legend-title">{m.home_wear_legend()}</p>
                <ul className="seibi-wear-legend">
                  {wearLegend().map((row) => (
                    <li
                      key={row.id}
                      className={
                        row.id === wearLevelFromPct(wearFocus.remainingPct)
                          ? 'is-current'
                          : undefined
                      }
                      style={{ '--wear': WEAR_COLOR[row.id] } as CSSProperties}
                    >
                      <WearGauge pct={row.sample} color={WEAR_COLOR[row.id]} size="sm" />
                      <span className="seibi-wear-range">{row.range}</span>
                      <span className="seibi-wear-label">{row.label}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </QuickSheet>
      ) : null}

      {quickSheet === 'part' ? (
        <QuickSheet
          title={m.home_part_title()}
          desc={m.home_part_desc()}
          onClose={() => setQuickSheet(null)}
        >
          <label className="vehicle-setup-field mileage-modal-field">
            <span className="seibi-quick-label">{m.home_part_name_label()}</span>
            <input
              value={partName}
              onChange={(event) => setPartName(event.target.value)}
              placeholder={m.home_part_name_placeholder()}
              autoFocus
            />
          </label>
          <label className="vehicle-setup-field mileage-modal-field">
            <span className="seibi-quick-label">{m.home_part_cost_label()}</span>
            <input
              value={partCost}
              onChange={(event) => setPartCost(event.target.value.replace(/[^\d]/g, ''))}
              placeholder="$0"
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className="vehicle-setup-cta"
            disabled={!partName.trim()}
            onClick={savePart}
          >
            {m.home_part_save()}
          </button>
        </QuickSheet>
      ) : null}

      {quickSheet === 'battery' && batteryLife ? (
        <QuickSheet title={m.home_battery_title()} onClose={() => setQuickSheet(null)}>
          <div className="seibi-battery-card">
            <strong>{m.home_battery_pct({ pct: String(batteryLife.pct) })}</strong>
            <div className="seibi-battery-track" aria-hidden="true">
              <span style={{ width: `${batteryLife.pct}%` }} />
            </div>
            <p>{m.home_battery_days({ days: String(batteryLife.daysLeft) })}</p>
            <p className="seibi-battery-meta">{m.home_battery_meta()}</p>
          </div>
        </QuickSheet>
      ) : null}

      {quickSheet === 'appt' ? (
        <QuickSheet
          title={m.home_appt_title()}
          desc={m.home_appt_desc()}
          onClose={() => setQuickSheet(null)}
        >
          <CalendarPicker value={apptDate} onChange={setApptDate} />
          <label className="vehicle-setup-field mileage-modal-field">
            <span className="seibi-quick-label">{m.home_appt_note_label()}</span>
            <input
              value={apptNote}
              onChange={(event) => setApptNote(event.target.value)}
              placeholder={m.home_appt_note_placeholder()}
            />
          </label>
          {apptSaved ? (
            <p className="seibi-appt-saved">{m.home_appt_saved({ date: apptSaved })}</p>
          ) : (
            <button
              type="button"
              className="vehicle-setup-cta"
              disabled={!apptDate}
              onClick={saveAppointment}
            >
              {m.home_appt_save()}
            </button>
          )}
        </QuickSheet>
      ) : null}
    </div>
  )
}
