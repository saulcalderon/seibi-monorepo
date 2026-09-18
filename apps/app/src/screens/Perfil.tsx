import { useEffect, useState, type TransitionEvent } from 'react'
import { createPortal } from 'react-dom'
import { authIdentityFromUser, initialsFromName } from '../lib/authIdentity'
import { useAuthSession, useSignOutToLogin } from '../lib/authSession'
import {
  formatMileage,
  formatVehicleLabel,
  getGarage,
  removeVehicle,
  type GarageState,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import { getTheme, setTheme } from '../lib/theme'
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '../lib/notificationsPref'
import * as m from '../paraglide/messages.js'

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

function SwitchRow({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="perfil-night"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
    >
      <span className="perfil-night-label">{label}</span>
      <span className={`perfil-night-track${on ? ' is-on' : ''}`} aria-hidden="true">
        <span className="perfil-night-knob" />
      </span>
    </button>
  )
}

function prefersReduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GarageSheet({
  vehicles,
  activeId,
  onClose,
  onRemoved,
}: {
  vehicles: VehicleProfile[]
  activeId: string | null
  onClose: () => void
  onRemoved: (next: GarageState) => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [open, setOpen] = useState(() => prefersReduceMotion())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (prefersReduceMotion()) return
    const outer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setOpen(true))
    })
    return () => window.cancelAnimationFrame(outer)
  }, [])

  function requestClose() {
    if (leaving) return
    if (prefersReduceMotion()) {
      onClose()
      return
    }
    setLeaving(true)
    setOpen(false)
  }

  function onSheetEnd(event: TransitionEvent<HTMLDivElement>) {
    if (!leaving) return
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'transform') return
    onClose()
  }

  function labelsMatch(typed: string, expected: string) {
    return (
      typed.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es') ===
      expected.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
    )
  }

  function askRemove(id: string) {
    if (leaving) return
    setPendingId(id)
    setConfirmText('')
  }

  function cancelRemove() {
    setPendingId(null)
    setConfirmText('')
  }

  const pending = vehicles.find((item) => item.id === pendingId) ?? null
  const pendingLabel = pending ? formatVehicleLabel(pending) : ''
  const canRemove = pending ? labelsMatch(confirmText, pendingLabel) : false

  function confirmRemove() {
    if (!pending || leaving || !canRemove) return
    const next = removeVehicle(pending.id)
    onRemoved(next)
    cancelRemove()
    if (next.vehicles.length === 0) requestClose()
  }

  const host = document.getElementById('root') ?? document.body
  const countLabel =
    vehicles.length === 1
      ? m.home_fleet_count_one()
      : m.home_fleet_count_many({ count: String(vehicles.length) })

  return createPortal(
    <div
      className={`perfil-garage-screen${open ? ' is-open' : ''}${leaving ? ' is-leave' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-garage-title"
      onTransitionEnd={onSheetEnd}
    >
      <header className="avisos-header">
        <button type="button" className="avisos-back" onClick={requestClose}>
          {m.setup_back()}
        </button>
        <p className="avisos-eyebrow">{countLabel}</p>
        <h1 id="perfil-garage-title" className="avisos-title">
          {m.home_fleet_title()}
        </h1>
        <p className="avisos-context">{m.perfil_garage_sheet_desc()}</p>
      </header>
      {vehicles.length === 0 ? (
        <p className="perfil-garage-empty">{m.perfil_garage_empty()}</p>
      ) : (
        <ul className="perfil-garage-list">
          {vehicles.map((item) => {
            const active = item.id === activeId
            return (
              <li key={item.id} className={`perfil-garage-item${active ? ' is-active' : ''}`}>
                <div className="perfil-garage-item-copy">
                  <p className="perfil-garage-item-name">{formatVehicleLabel(item)}</p>
                  <p className="perfil-garage-item-meta">
                    {item.placa ? `${item.placa} · ` : ''}
                    {m.perfil_active_km({ km: formatMileage(item.mileage, item.mileageUnit) })}
                  </p>
                </div>
                {active ? (
                  <span className="perfil-garage-pill">{m.home_fleet_active()}</span>
                ) : null}
                <button
                  type="button"
                  className="perfil-garage-remove"
                  onClick={() => askRemove(item.id)}
                >
                  {m.perfil_garage_remove()}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {pending ? (
        <div className="perfil-garage-confirm">
          <button
            type="button"
            className="perfil-garage-confirm-backdrop"
            aria-label={m.perfil_garage_remove_cancel()}
            onClick={cancelRemove}
          />
          <div
            className="perfil-garage-confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="perfil-garage-remove-title"
          >
            <h2 id="perfil-garage-remove-title">{m.perfil_garage_remove_title()}</h2>
            <p className="perfil-garage-confirm-warn">
              {m.perfil_garage_remove_warn({ name: pendingLabel })}
            </p>
            <label className="perfil-garage-confirm-field">
              <span>{m.perfil_garage_remove_label()}</span>
              <strong className="perfil-garage-confirm-phrase">{pendingLabel}</strong>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </label>
            <div className="perfil-garage-confirm-actions">
              <button type="button" className="perfil-garage-confirm-cancel" onClick={cancelRemove}>
                {m.perfil_garage_remove_cancel()}
              </button>
              <button
                type="button"
                className="perfil-garage-confirm-go"
                disabled={!canRemove}
                onClick={confirmRemove}
              >
                {m.perfil_garage_remove_confirm()}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    host,
  )
}

export function Perfil({ vehicle }: { vehicle: VehicleProfile | null }) {
  const signOutToLogin = useSignOutToLogin()
  const { user, status } = useAuthSession()
  const identity = authIdentityFromUser(user)
  const sessionResolved = status !== 'resolving_initial_session'
  const displayName = identity.displayName ?? m.profile_guest_name()
  const showNoSessionCue = import.meta.env.DEV && status === 'signed_out'
  const [garage, setGarage] = useState(() => getGarage())
  const [garageOpen, setGarageOpen] = useState(false)
  const fleetCount = garage.vehicles.length
  const label = vehicle ? formatVehicleLabel(vehicle) : null
  const [night, setNight] = useState(() => getTheme() === 'night')
  const [notifs, setNotifs] = useState(() => getNotificationsEnabled())

  useEffect(() => {
    const sync = () => setGarage(getGarage())
    window.addEventListener('seibi-garage-change', sync)
    return () => window.removeEventListener('seibi-garage-change', sync)
  }, [])

  function toggleNight() {
    const next = !night
    setNight(next)
    setTheme(next ? 'night' : 'day')
  }

  function toggleNotifs() {
    const next = !notifs
    setNotifs(next)
    setNotificationsEnabled(next)
  }

  return (
    <div className="perfil-screen">
      <header className="avisos-header">
        <h1 className="avisos-eyebrow">{m.perfil_eyebrow()}</h1>
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

      <button
        type="button"
        className="perfil-card"
        aria-label={m.perfil_garage()}
        aria-expanded={garageOpen}
        onClick={() => setGarageOpen(true)}
      >
        <span className="perfil-card-head">
          <span className="perfil-card-label">{m.perfil_garage()}</span>
          <span className="perfil-card-chevron">
            <ChevronIcon />
          </span>
        </span>
        <span className="perfil-card-body">
          {vehicle && label ? (
            <>
              <span className="perfil-card-title">{label}</span>
              <span className="perfil-card-meta">
                {m.perfil_active_km({ km: formatMileage(vehicle.mileage, vehicle.mileageUnit) })}
              </span>
            </>
          ) : (
            <span className="perfil-card-title">{m.perfil_garage_empty()}</span>
          )}
        </span>
        <span className="perfil-card-foot">
          {fleetCount === 1
            ? m.perfil_fleet_one()
            : m.perfil_fleet_many({ count: String(fleetCount) })}
        </span>
      </button>

      {garageOpen ? (
        <GarageSheet
          vehicles={garage.vehicles}
          activeId={garage.activeId}
          onClose={() => setGarageOpen(false)}
          onRemoved={(next) => setGarage(next)}
        />
      ) : null}

      <SwitchRow label={m.perfil_night_mode()} on={night} onToggle={toggleNight} />
      <SwitchRow label={m.perfil_notifications()} on={notifs} onToggle={toggleNotifs} />

      <button type="button" className="perfil-logout" onClick={() => void signOutToLogin()}>
        {m.home_logout()}
      </button>
    </div>
  )
}
