import {
  formatMileage,
  formatVehicleLabel,
  getGarage,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

/** Placeholder until auth/profile provides the registered user. */
const PREVIEW_USER = {
  name: 'Dennys Acevedo',
  email: 'dennys@seibi.app',
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
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

export function Perfil({ vehicle }: { vehicle: VehicleProfile | null }) {
  const garage = getGarage()
  const fleetCount = garage.vehicles.length
  const label = vehicle ? formatVehicleLabel(vehicle) : null

  return (
    <div className="perfil-screen">
      <header className="avisos-header">
        <p className="avisos-eyebrow">{m.perfil_eyebrow()}</p>
        <h1 className="avisos-title">{m.home_nav_profile()}</h1>
        <p className="avisos-context">{m.perfil_context()}</p>
      </header>

      <section className="perfil-identity" aria-label={m.perfil_account()}>
        <span className="perfil-avatar" aria-hidden="true">
          {initials(PREVIEW_USER.name)}
        </span>
        <div>
          <p className="perfil-name">{PREVIEW_USER.name}</p>
          <p className="perfil-email">{PREVIEW_USER.email}</p>
        </div>
      </section>

      <section className="perfil-card" aria-label={m.perfil_garage()}>
        <p className="perfil-card-label">{m.perfil_garage()}</p>
        {vehicle && label ? (
          <>
            <p className="perfil-card-title">{label}</p>
            <p className="perfil-card-meta">
              {m.perfil_active_km({ km: formatMileage(vehicle.mileage) })}
            </p>
          </>
        ) : (
          <p className="perfil-card-title">{m.perfil_garage_empty()}</p>
        )}
        <p className="perfil-card-foot">
          {fleetCount === 1
            ? m.perfil_fleet_one()
            : m.perfil_fleet_many({ count: String(fleetCount) })}
        </p>
      </section>

      <section className="perfil-list" aria-label={m.perfil_settings()}>
        <Row label={m.perfil_notifications()} value={m.perfil_notifications_on()} />
        <Row label={m.perfil_preferences()} />
        <Row label={m.perfil_support()} />
      </section>

      <button type="button" className="perfil-logout">
        {m.home_logout()}
      </button>
    </div>
  )
}
