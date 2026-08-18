import { useEffect, useState } from 'react'
import {
  recentServicesForVehicle,
  servicesForVehicle,
  serviceVehicleLabel,
  type ServiceIcon,
  type ServiceItem,
} from '../lib/services'
import type { VehicleProfile } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

type ServiciosView = 'preview' | 'all'

export function ServiceIconGlyph({ icon }: { icon: ServiceIcon }) {
  if (icon === 'oil') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M8 4h8l1.5 5H6.5L8 4zM7 9v9a2 2 0 002 2h6a2 2 0 002-2V9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M10 13h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'brakes') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M14.5 5.5l4 4M4 20l1.2-4.2L15.7 5.3a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L8.2 18.8 4 20z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (icon === 'tires') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 4.5V7M12 17v2.5M4.5 12H7M17 12h2.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (icon === 'filter') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6h14l-5.5 7v4.5L10.5 19v-6L5 6z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (icon === 'battery') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M18 10h2v4h-2M8 12h4M10 10v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ServiceRow({ item, focused }: { item: ServiceItem; focused: boolean }) {
  return (
    <article
      id={`servicio-${item.id}`}
      data-service-id={item.id}
      className={`dash-tx${focused ? ' is-focused' : ''}`}
    >
      <span className="dash-tx-icon" aria-hidden="true">
        <ServiceIconGlyph icon={item.icon} />
      </span>
      <div>
        <p className="dash-tx-name">{item.name}</p>
        <p className="dash-tx-meta">{item.meta}</p>
      </div>
      <strong>{item.cost}</strong>
    </article>
  )
}

export function Servicios({
  vehicle,
  focusServiceId = null,
  onFocusHandled,
  preferAll = false,
}: {
  vehicle: VehicleProfile | null
  focusServiceId?: string | null
  onFocusHandled?: () => void
  preferAll?: boolean
}) {
  const [view, setView] = useState<ServiciosView>(() =>
    focusServiceId || preferAll ? 'all' : 'preview',
  )
  const services = servicesForVehicle(vehicle)
  const recent = recentServicesForVehicle(vehicle)
  const label = serviceVehicleLabel(vehicle)
  const context = label
    ? m.home_vehicle_context({ vehicle: label })
    : m.home_vehicle_context_empty()

  useEffect(() => {
    if (!focusServiceId && !preferAll) return
    setView('all')
  }, [focusServiceId, preferAll])

  useEffect(() => {
    if (!focusServiceId || view !== 'all') return
    const node = document.querySelector<HTMLElement>(
      `[data-service-id="${focusServiceId}"]`,
    )
    const start = window.setTimeout(() => {
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    const clear = window.setTimeout(() => onFocusHandled?.(), 2200)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(clear)
    }
  }, [focusServiceId, onFocusHandled, view])

  if (view === 'all') {
    return (
      <div className="avisos-screen">
        <header className="avisos-header">
          <button
            type="button"
            className="avisos-back"
            onClick={() => setView('preview')}
          >
            {m.setup_back()}
          </button>
          <p className="avisos-eyebrow">{m.home_services_eyebrow()}</p>
          <h1 className="avisos-title">{m.home_services_badge()}</h1>
          <p className="avisos-context">{context}</p>
        </header>

        <div className="avisos-legend" aria-label="Resumen de servicios">
          <span className="avisos-chip tone-ok">{`${services.length} servicios`}</span>
        </div>

        <section className="dash-tx-list" aria-label={m.home_services_badge()}>
          {services.map((item) => (
            <ServiceRow
              key={item.id}
              item={item}
              focused={focusServiceId === item.id}
            />
          ))}
        </section>
      </div>
    )
  }

  return (
    <div className="avisos-screen">
      <section className="dash-block" aria-label={m.home_recent_title()}>
        <div className="dash-block-head">
          <div>
            <h2>{m.home_recent_title()}</h2>
            <p className="dash-block-context">{context}</p>
          </div>
          <button type="button" onClick={() => setView('all')}>
            {m.home_see_all()}
          </button>
        </div>

        <ul className="dash-tx-list" key={`services-${vehicle?.id ?? 'none'}`}>
          {recent.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="dash-tx dash-tx--button"
                onClick={() => setView('all')}
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
      </section>
    </div>
  )
}
