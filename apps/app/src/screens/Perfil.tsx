import { useEffect, useState } from 'react'
import { authIdentityFromUser, initialsFromName } from '../lib/authIdentity'
import { useAuthSession, useSignOutToLogin } from '../lib/authSession'
import {
  formatMileage,
  formatVehicleLabel,
  getGarage,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

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

export function Perfil({ vehicle }: { vehicle: VehicleProfile | null }) {
  const signOutToLogin = useSignOutToLogin()
  const { user, status } = useAuthSession()
  const identity = authIdentityFromUser(user)
  const sessionResolved = status !== 'resolving_initial_session'
  const displayName = identity.displayName ?? m.profile_guest_name()
  const showNoSessionCue = import.meta.env.DEV && status === 'signed_out'
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
        <IdentityAvatar name={displayName} avatarUrl={identity.avatarUrl} />
        <div>
          <p className="perfil-name">{sessionResolved ? displayName : '\u00a0'}</p>
          {identity.email ? <p className="perfil-email">{identity.email}</p> : null}
          {showNoSessionCue ? (
            <p className="profile-session-cue">{m.profile_no_session()}</p>
          ) : null}
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

      <button type="button" className="perfil-logout" onClick={() => void signOutToLogin()}>
        {m.home_logout()}
      </button>
    </div>
  )
}
