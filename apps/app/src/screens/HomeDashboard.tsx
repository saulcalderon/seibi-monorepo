import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GarageCarStage } from '../components/GarageCarStage'
import { MileageUpdateModal } from '../components/VehicleHero'
import {
  formatMileageAmount,
  formatMileageUnit,
  oilKmRemaining,
  vehicleArtSrc,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import {
  upcomingMaintenanceForVehicle,
  vehicleServiceHealth,
  type ReminderItem,
} from '../lib/reminders'
import { recentServicesForVehicle, subscribeServicesChange } from '../lib/services'
import { ServiceAddSheet, ServiceIconGlyph } from './Servicios'
import { ReminderPartIcon } from './Avisos'
import * as m from '../paraglide/messages.js'

function reminderDueCopy(item: ReminderItem, active: VehicleProfile | null) {
  if (item.id === 'oil' && active) {
    const left = item.remainingKm ?? oilKmRemaining(active.mileage, active.mileageUnit)
    if (left > 0) {
      return m.home_due_days_or_km({
        days: String(Math.max(1, Math.round(left / 120))),
        km: left.toLocaleString('es-MX'),
      })
    }
  }
  return item.due
}

function HeaderBtn({
  label,
  onClick,
  badge,
  children,
}: {
  label: string
  onClick?: () => void
  badge?: number
  children: ReactNode
}) {
  return (
    <button type="button" className="seibi-head-btn" aria-label={label} onClick={onClick}>
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.76 6.76 0 010 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.55 6.55 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.93 6.93 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.55" />
    </svg>
  )
}

export function HomeDashboard({
  vehicle,
  vehicles,
  notificationCount,
  onOpenFleet,
  onOpenNotifications,
  onAddVehicle,
  onOpenAvisos,
  onOpenServicios,
  onSelectVehicle,
  onEditVehicle,
}: {
  vehicle: VehicleProfile | null
  vehicles: VehicleProfile[]
  notificationCount: number
  onOpenFleet: () => void
  onOpenNotifications: () => void
  onAddVehicle: () => void
  onOpenAvisos: (reminderId?: string) => void
  onOpenServicios: (serviceId?: string, preferAll?: boolean) => void
  onSelectVehicle: (id: string) => void
  onEditVehicle: (id: string) => void
}) {
  const fleetRef = useRef<HTMLDivElement>(null)
  const fleetSelectRef = useRef<string | null>(null)
  const skipFleetPulse = useRef(true)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const fleetMany = vehicles.length > 0
  const [addFocused, setAddFocused] = useState(false)
  const showVehicleData = Boolean(vehicle) && !addFocused
  const upcoming = showVehicleData ? upcomingMaintenanceForVehicle(vehicle, 3) : []
  const [addArmed, setAddArmed] = useState(false)
  const [editArmed, setEditArmed] = useState(false)
  const [, setServicesTick] = useState(0)
  const recent = showVehicleData ? recentServicesForVehicle(vehicle, 3) : []
  const [mileageOpen, setMileageOpen] = useState(false)
  const [addingPart, setAddingPart] = useState(false)

  function selectVehicle(id: string) {
    setAddFocused(false)
    onSelectVehicle(id)
  }

  function addVehicle() {
    if (!addFocused) {
      setAddFocused(true)
      return
    }
    if (!addArmed) return
    onAddVehicle()
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
    const next = addFocused ? 'add' : vehicle?.id ?? null
    if (skipFleetPulse.current) {
      skipFleetPulse.current = false
      fleetSelectRef.current = next
      return
    }
    if (!next || next === fleetSelectRef.current) return
    fleetSelectRef.current = next
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => setPulseId(next), 720)
    return () => window.clearTimeout(timer)
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
  }, [vehicles.length])

  return (
    <div className="seibi-dash">
      <header className="seibi-dash-head">
        <div className="seibi-dash-brand">
          <p className="seibi-logo">
            SEIB<span className="seibi-logo-i">I</span>
          </p>
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
        </div>
      </header>

      <div className={`seibi-hero-stage${addFocused ? ' is-adding' : ''}`}>
        <div className="seibi-stage-slide">
          <div className="seibi-stage-car">
            <GarageCarStage vehicle={vehicle} />
          </div>
          <div
            className={`seibi-stage-id${vehicle ? '' : ' is-empty'}`}
            key={vehicle?.id ?? 'empty'}
            aria-hidden={!vehicle}
          >
            {vehicle ? (
              <>
                <p className="seibi-hero-brand">{vehicle.brand}</p>
                <div className="seibi-stage-id-model">
                  <h2 className="seibi-hero-title">{vehicle.model}</h2>
                  <p className="seibi-hero-year">{vehicle.year}</p>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="seibi-stage-add-pane" aria-hidden={!addFocused}>
          <p className="seibi-stage-add-title">{m.home_garage_add_card_title()}</p>
          <p className="seibi-stage-add-hint">
            {addArmed ? m.home_garage_add_card_ready() : m.home_garage_add_card_hint()}
          </p>
        </div>
      </div>

      <section data-section="vehiculo" className="seibi-fleet">
        <div
          ref={fleetRef}
          className={`seibi-fleet-track${fleetMany ? '' : ' is-single'}`}
        >
          {vehicles.map((item, index) => {
            const active = item.id === vehicle?.id && !addFocused
            const healthCard = vehicleServiceHealth(item)
            return (
              <div
                key={item.id}
                data-vehicle-id={item.id}
                className={`seibi-hero${active ? ' is-active' : ''}${
                  pulseId === item.id ? ' is-pulse' : ''
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onAnimationEnd={(event) => {
                  if (event.animationName === 'seibi-hero-arrive') setPulseId(null)
                }}
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
                <div className="seibi-hero-top">
                  <div>
                    <h2 className="seibi-hero-title">
                      {item.model} <span>{item.year}</span>
                    </h2>
                  </div>
                </div>
                <div className="seibi-hero-stats">
                  <div className="seibi-hero-stat seibi-hero-stat--km">
                    <p>{m.home_garage_km_label()}</p>
                    <strong>
                      <span className="seibi-hero-km-value">{formatMileageAmount(item.mileage)}</span>
                      <span className="seibi-hero-km-unit">{formatMileageUnit(item.mileageUnit)}</span>
                    </strong>
                  </div>
                  <div className="seibi-hero-stats-divider" aria-hidden="true" />
                  <div className="seibi-hero-stat">
                    <p>{m.home_garage_status_label()}</p>
                    {healthCard.needsService ? (
                      <button
                        type="button"
                        className={`seibi-hero-stat-action is-${healthCard.urgency}`}
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
            }${pulseId === 'add' ? ' is-pulse' : ''}`}
            onAnimationEnd={(event) => {
              if (event.animationName === 'seibi-hero-arrive') setPulseId(null)
            }}
            aria-pressed={addFocused}
            aria-label={addArmed ? m.home_garage_add() : m.home_garage_add_card_hint()}
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

      <section className="seibi-section" data-section="atajos" aria-label={m.home_section_shortcuts()}>
        <div className="seibi-shortcuts is-pair">
          <ShortcutTile
            label={m.home_shortcut_km()}
            disabled={!vehicle}
            onClick={() => setMileageOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="13" r="7.2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M12 13l3.4-2.4M8.2 8.1A7.2 7.2 0 0115.8 8.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </ShortcutTile>
          <ShortcutTile
            label={m.home_shortcut_part()}
            disabled={!vehicle}
            onClick={() => setAddingPart(true)}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="5.2"
                y="5.2"
                width="13.6"
                height="13.6"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M12 8.6v6.8M8.6 12h6.8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </ShortcutTile>
        </div>
      </section>

      <section data-section="recordatorios" className="seibi-section">
        <div className="seibi-section-head">
          <h2>{m.home_section_upcoming()}</h2>
          {showVehicleData ? (
            <button type="button" onClick={() => onOpenAvisos()}>
              {m.home_see_all()}
            </button>
          ) : null}
        </div>
        {showVehicleData && upcoming.length > 0 ? (
          <div className="seibi-maint-list">
            {upcoming.map((item) => (
              <div key={item.id} className="seibi-maint">
                <button
                  type="button"
                  className="seibi-maint-main"
                  onClick={() => onOpenAvisos(item.id)}
                >
                  <span className="seibi-maint-icon" aria-hidden="true">
                    <ReminderPartIcon id={item.id} />
                  </span>
                  <span className="seibi-maint-copy">
                    <strong>{item.name}</strong>
                    <span>{reminderDueCopy(item, vehicle)}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="dash-tx-empty">
            {showVehicleData ? m.home_avisos_group_empty() : m.home_no_data()}
          </p>
        )}
      </section>

      <section className="seibi-section" data-section="recientes" aria-label={m.home_recent_title()}>
        <div className="seibi-section-head">
          <h2>{m.home_recent_title()}</h2>
          {recent.length > 0 ? (
            <button type="button" onClick={() => onOpenServicios()}>
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
                onClick={() => onOpenServicios(item.id)}
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

      {mileageOpen && vehicle
        ? createPortal(
            <MileageUpdateModal
              vehicle={vehicle}
              onClose={() => setMileageOpen(false)}
              onSaved={() => setMileageOpen(false)}
            />,
            document.getElementById('root') ?? document.body,
          )
        : null}

      {addingPart && vehicle
        ? createPortal(
            <ServiceAddSheet
              vehicle={vehicle}
              onClose={() => setAddingPart(false)}
              onSaved={() => setServicesTick((n) => n + 1)}
            />,
            document.getElementById('root') ?? document.body,
          )
        : null}
    </div>
  )
}
