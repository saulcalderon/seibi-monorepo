import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GarageCarStage } from '../components/GarageCarStage'
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
import { ServiceIconGlyph } from './Servicios'
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
          <div className="seibi-stage-id" key={vehicle?.id ?? 'empty'}>
            {vehicle ? (
              <>
                <p className="seibi-hero-brand">{vehicle.brand}</p>
                <div className="seibi-stage-id-model">
                  <h2 className="seibi-hero-title">{vehicle.model}</h2>
                  <p className="seibi-hero-year">{vehicle.year}</p>
                </div>
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
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 4h8l1.5 5H6.5L8 4zM7 9v9a2 2 0 002 2h6a2 2 0 002-2V9"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 13h4"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
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
    </div>
  )
}
