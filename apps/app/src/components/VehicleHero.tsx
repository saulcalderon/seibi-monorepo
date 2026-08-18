import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  addVehicle,
  formatMileage,
  getActiveVehicle,
  getGarage,
  resolveBrandName,
  setActiveVehicle,
  updateVehicle,
  vehicleArtSrc,
  vehicleNeedsService,
  VEHICLE_BRANDS,
  type GarageState,
  type VehicleBrandOption,
  type VehicleProfile,
} from '../lib/vehicleProfile'
import { GarageCarStage } from './GarageCarStage'
import { BrandSearchField } from './BrandSearchField'
import * as m from '../paraglide/messages.js'

const SETUP_STEPS = 4

type Draft = {
  brand: VehicleBrandOption | ''
  brandOther: string
  model: string
  year: string
  mileage: string
}

const emptyDraft: Draft = {
  brand: '',
  brandOther: '',
  model: '',
  year: '',
  mileage: '',
}

function draftFromVehicle(vehicle: VehicleProfile): Draft {
  const known = VEHICLE_BRANDS.find((brand) => brand === vehicle.brand)
  return {
    brand: known ?? 'other',
    brandOther: known ? '' : vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileage,
  }
}

function draftToInput(draft: Draft) {
  return {
    brand: resolveBrandName(draft.brand, draft.brandOther),
    model: draft.model.trim(),
    year: draft.year.trim(),
    mileage: draft.mileage.replace(/,/g, '').trim(),
  }
}

function isDraftComplete(draft: Draft): boolean {
  return (
    canContinue(0, draft) &&
    canContinue(1, draft) &&
    canContinue(2, draft) &&
    canContinue(3, draft)
  )
}

function canContinue(step: number, draft: Draft): boolean {
  switch (step) {
    case 0:
      return draft.brand === 'other'
        ? draft.brandOther.trim().length > 1
        : draft.brand.length > 0
    case 1:
      return draft.model.trim().length > 1
    case 2: {
      const year = Number(draft.year)
      return Number.isInteger(year) && year >= 1980 && year <= new Date().getFullYear() + 1
    }
    case 3: {
      if (!draft.mileage.trim()) return false
      const km = Number(draft.mileage.replace(/,/g, ''))
      return Number.isFinite(km) && km >= 0 && km < 2_000_000
    }
    default:
      return false
  }
}

function SetupField({
  value,
  onChange,
  placeholder,
  inputMode,
  suffix,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputMode?: 'text' | 'numeric'
  suffix?: string
  autoFocus?: boolean
}) {
  return (
    <label className="vehicle-setup-field">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoFocus={autoFocus}
      />
      {suffix ? <span>{suffix}</span> : null}
    </label>
  )
}

function VehicleSetupSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (garage: GarageState) => void
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const ready = canContinue(step, draft)
  const isLast = step === SETUP_STEPS - 1

  const titles = [
    m.setup_1_title(),
    m.setup_2_title(),
    m.setup_3_title(),
    m.setup_4_title(),
  ]
  const descs = [
    m.setup_1_desc(),
    m.setup_2_desc(),
    m.setup_3_desc(),
    m.setup_4_desc(),
  ]

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function handleBack() {
    if (step === 0) {
      onClose()
      return
    }
    setStep((current) => Math.max(0, current - 1))
  }

  function handleNext() {
    if (!ready) return
    if (!isLast) {
      setStep((current) => Math.min(SETUP_STEPS - 1, current + 1))
      return
    }

    onSaved(addVehicle(draftToInput(draft)))
  }

  return (
    <div className="vehicle-sheet" role="dialog" aria-modal="true" aria-labelledby="vehicle-sheet-title">
      <button
        type="button"
        className="vehicle-sheet-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="vehicle-sheet-panel">
        <div className="vehicle-sheet-handle" aria-hidden="true" />

        <header className="vehicle-sheet-header">
          <button type="button" className="vehicle-setup-back" onClick={handleBack}>
            {step === 0 ? m.home_vehicle_sheet_close() : m.setup_back()}
          </button>
          <p className="vehicle-setup-progress">
            {m.home_vehicle_setup_progress({
              current: String(step + 1),
              total: String(SETUP_STEPS),
            })}
          </p>
          <span aria-hidden="true" />
        </header>

        <div
          className="vehicle-setup-bar"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={SETUP_STEPS}
          aria-valuenow={step + 1}
        >
          {Array.from({ length: SETUP_STEPS }).map((_, index) => (
            <span
              key={index}
              className={`vehicle-setup-seg${
                index < step ? ' is-done' : index === step ? ' is-current' : ''
              }`}
            />
          ))}
        </div>

        <div className="vehicle-sheet-content">
          <h2 id="vehicle-sheet-title" className="vehicle-setup-title">
            {titles[step]}
          </h2>
          <p className="vehicle-setup-desc">{descs[step]}</p>

          <div className="vehicle-setup-body">
            {step === 0 ? (
              <BrandSearchField
                brand={draft.brand}
                brandOther={draft.brandOther}
                autoFocus
                onChange={(next) => setDraft((current) => ({ ...current, ...next }))}
              />
            ) : null}

            {step === 1 ? (
              <SetupField
                value={draft.model}
                onChange={(model) => setDraft((current) => ({ ...current, model }))}
                placeholder={m.setup_2_placeholder()}
                autoFocus
              />
            ) : null}

            {step === 2 ? (
              <SetupField
                value={draft.year}
                onChange={(year) =>
                  setDraft((current) => ({
                    ...current,
                    year: year.replace(/\D/g, '').slice(0, 4),
                  }))
                }
                placeholder={m.setup_3_placeholder()}
                inputMode="numeric"
                autoFocus
              />
            ) : null}

            {step === 3 ? (
              <SetupField
                value={draft.mileage}
                onChange={(mileage) =>
                  setDraft((current) => ({
                    ...current,
                    mileage: mileage.replace(/[^\d]/g, ''),
                  }))
                }
                placeholder={m.setup_4_placeholder()}
                inputMode="numeric"
                suffix={m.setup_4_suffix()}
                autoFocus
              />
            ) : null}
          </div>
        </div>

        <footer className="vehicle-sheet-footer">
          <button
            type="button"
            className="vehicle-setup-cta"
            disabled={!ready}
            onClick={handleNext}
          >
            {isLast ? m.home_vehicle_setup_save() : m.setup_next()}
          </button>
        </footer>
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <span className="dash-lock" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function MileageUpdateModal({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: VehicleProfile
  onClose: () => void
  onSaved: (garage: GarageState) => void
}) {
  const [mileage, setMileage] = useState(vehicle.mileage)
  const km = Number(mileage.replace(/,/g, ''))
  const ready = Number.isFinite(km) && km >= 0 && km < 2_000_000 && mileage.trim().length > 0

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function handleSave() {
    if (!ready) return
    onSaved(
      updateVehicle(vehicle.id, {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        mileage: mileage.replace(/,/g, '').trim(),
      }),
    )
  }

  return (
    <div
      className="mileage-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mileage-modal-title"
    >
      <button
        type="button"
        className="mileage-modal-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="mileage-modal-card">
        <header className="mileage-modal-head">
          <div>
            <p className="mileage-modal-eyebrow">{m.home_garage_selected()}</p>
            <h2 id="mileage-modal-title" className="mileage-modal-title">
              {m.home_mileage_update_title()}
            </h2>
          </div>
          <button type="button" className="mileage-modal-close" onClick={onClose}>
            {m.home_vehicle_sheet_close()}
          </button>
        </header>

        <p className="mileage-modal-vehicle">
          {vehicle.brand} {vehicle.model} · {vehicle.year}
        </p>
        <p className="mileage-modal-desc">{m.home_mileage_update_desc()}</p>

        <label className="vehicle-setup-field mileage-modal-field">
          <input
            value={mileage}
            onChange={(event) => setMileage(event.target.value.replace(/[^\d]/g, ''))}
            placeholder={m.setup_4_placeholder()}
            inputMode="numeric"
            autoFocus
          />
          <span>{m.setup_4_suffix()}</span>
        </label>

        <button
          type="button"
          className="vehicle-setup-cta"
          disabled={!ready}
          onClick={handleSave}
        >
          {m.home_mileage_update_save()}
        </button>
      </div>
    </div>
  )
}

function VehicleEditSheet({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: VehicleProfile
  onClose: () => void
  onSaved: (garage: GarageState) => void
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromVehicle(vehicle))
  const ready = isDraftComplete(draft)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function handleSave() {
    if (!ready) return
    onSaved(updateVehicle(vehicle.id, draftToInput(draft)))
  }

  return (
    <div className="vehicle-sheet" role="dialog" aria-modal="true" aria-labelledby="vehicle-edit-title">
      <button
        type="button"
        className="vehicle-sheet-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="vehicle-sheet-panel">
        <div className="vehicle-sheet-handle" aria-hidden="true" />

        <header className="vehicle-sheet-header">
          <button type="button" className="vehicle-setup-back" onClick={onClose}>
            {m.home_vehicle_sheet_close()}
          </button>
          <p className="vehicle-setup-progress">{m.home_vehicle_edit_badge()}</p>
          <span aria-hidden="true" />
        </header>

        <div className="vehicle-sheet-content">
          <h2 id="vehicle-edit-title" className="vehicle-setup-title">
            {m.home_vehicle_edit_title()}
          </h2>
          <p className="vehicle-setup-desc">{m.home_vehicle_edit_desc()}</p>

          <div className="vehicle-edit-form">
            <label className="vehicle-edit-label">{m.home_garage_brand_label()}</label>
            <BrandSearchField
              brand={draft.brand}
              brandOther={draft.brandOther}
              onChange={(next) => setDraft((current) => ({ ...current, ...next }))}
            />

            <label className="vehicle-edit-label">{m.home_garage_model_label()}</label>
            <SetupField
              value={draft.model}
              onChange={(model) => setDraft((current) => ({ ...current, model }))}
              placeholder={m.setup_2_placeholder()}
            />

            <label className="vehicle-edit-label">{m.home_garage_year_label()}</label>
            <SetupField
              value={draft.year}
              onChange={(year) =>
                setDraft((current) => ({
                  ...current,
                  year: year.replace(/\D/g, '').slice(0, 4),
                }))
              }
              placeholder={m.setup_3_placeholder()}
              inputMode="numeric"
            />

            <label className="vehicle-edit-label">{m.home_garage_km_label()}</label>
            <SetupField
              value={draft.mileage}
              onChange={(mileage) =>
                setDraft((current) => ({
                  ...current,
                  mileage: mileage.replace(/[^\d]/g, ''),
                }))
              }
              placeholder={m.setup_4_placeholder()}
              inputMode="numeric"
              suffix={m.setup_4_suffix()}
              autoFocus
            />
          </div>
        </div>

        <footer className="vehicle-sheet-footer">
          <button
            type="button"
            className="vehicle-setup-cta"
            disabled={!ready}
            onClick={handleSave}
          >
            {m.home_vehicle_edit_save()}
          </button>
        </footer>
      </div>
    </div>
  )
}

function VehicleSelectCard({
  vehicle,
  index,
  active,
  onSelect,
  onEdit,
  onServiceFocus,
}: {
  vehicle: VehicleProfile
  index: number
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onServiceFocus: () => void
}) {
  const needsService = vehicleNeedsService(vehicle)
  const [actionsArmed, setActionsArmed] = useState(false)

  useEffect(() => {
    if (!active) {
      setActionsArmed(false)
      return
    }
    // Arm settings / status only after the selection animation finishes.
    const timer = window.setTimeout(() => setActionsArmed(true), 480)
    return () => window.clearTimeout(timer)
  }, [active, vehicle.id])

  return (
    <div className={`garage-card${active ? ' is-active' : ''}${needsService ? ' needs-service' : ''}`}>
      <button
        type="button"
        className="garage-card-main"
        aria-pressed={active}
        aria-label={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
        onClick={onSelect}
      >
        <div className="garage-card-top">
          <div>
            <p className="garage-card-brand">{vehicle.brand}</p>
            <h3 className="garage-card-title">
              {vehicle.model} <span>{vehicle.year}</span>
            </h3>
          </div>
        </div>

        <img
          className="garage-card-art"
          src={vehicleArtSrc(index)}
          alt=""
          draggable={false}
        />
      </button>

      <div className="garage-card-badge">
        <div>
          <p>{m.home_garage_km_label()}</p>
          <strong>{formatMileage(vehicle.mileage)}</strong>
        </div>
        <div className="garage-card-badge-divider" aria-hidden="true" />
        <div>
          <p>{m.home_garage_status_label()}</p>
          {needsService ? (
            <button
              type="button"
              className={`garage-card-status-btn${actionsArmed ? ' is-armed' : ''}`}
              tabIndex={actionsArmed ? 0 : -1}
              aria-hidden={!actionsArmed}
              aria-label={m.home_service_focus_open()}
              disabled={!actionsArmed}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (!actionsArmed) return
                onServiceFocus()
              }}
            >
              {m.home_garage_status_service()}
            </button>
          ) : (
            <strong className="is-ready">{m.home_garage_status_ready()}</strong>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`garage-card-settings${actionsArmed ? ' is-armed' : ''}`}
        aria-label={
          actionsArmed ? m.home_vehicle_edit_open() : m.home_service_select_first()
        }
        tabIndex={active ? 0 : -1}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!active) {
            onSelect()
            return
          }
          if (!actionsArmed) return
          onEdit()
        }}
      >
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
      </button>
    </div>
  )
}

function VehicleAddCard({
  active,
  disabled,
  onSelect,
  onConfirm,
}: {
  active: boolean
  disabled?: boolean
  onSelect: () => void
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!active) {
      setArmed(false)
      return
    }
    const timer = window.setTimeout(() => setArmed(true), 480)
    return () => window.clearTimeout(timer)
  }, [active])

  return (
    <button
      type="button"
      className={`garage-card garage-card--add${active ? ' is-active' : ''}${
        armed ? ' is-armed' : ''
      }`}
      aria-pressed={active}
      aria-label={armed ? m.home_garage_add() : m.home_garage_add_card_hint()}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        if (!active) {
          onSelect()
          return
        }
        if (!armed) return
        onConfirm()
      }}
    >
      <span className="garage-card-add-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <p className="garage-card-add-title">{m.home_garage_add_card_title()}</p>
      <p className="garage-card-add-hint">
        {armed ? m.home_garage_add_card_ready() : m.home_garage_add_card_hint()}
      </p>
    </button>
  )
}

function FleetListSheet({
  vehicles,
  activeId,
  onClose,
  onSelect,
}: {
  vehicles: VehicleProfile[]
  activeId: string | null
  onClose: () => void
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const sorted = [...vehicles].sort((a, b) => {
    const left = `${a.brand} ${a.model} ${a.year}`.toLocaleLowerCase('es')
    const right = `${b.brand} ${b.model} ${b.year}`.toLocaleLowerCase('es')
    return left.localeCompare(right, 'es')
  })

  const filtered = sorted.filter((vehicle) => {
    const haystack = `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.mileage}`
      .toLocaleLowerCase('es')
    return haystack.includes(query.trim().toLocaleLowerCase('es'))
  })

  const countLabel =
    vehicles.length === 1
      ? m.home_fleet_count_one()
      : m.home_fleet_count_many({ count: String(vehicles.length) })

  return (
    <div
      className="vehicle-sheet fleet-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fleet-sheet-title"
    >
      <button
        type="button"
        className="vehicle-sheet-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="vehicle-sheet-panel">
        <div className="vehicle-sheet-handle" aria-hidden="true" />

        <header className="vehicle-sheet-header">
          <button type="button" className="vehicle-setup-back" onClick={onClose}>
            {m.home_vehicle_sheet_close()}
          </button>
          <p className="vehicle-setup-progress">{countLabel}</p>
          <span aria-hidden="true" />
        </header>

        <h2 id="fleet-sheet-title" className="vehicle-setup-title">
          {m.home_fleet_title()}
        </h2>
        <p className="fleet-sheet-desc">{m.home_fleet_desc()}</p>

        <label className="fleet-sheet-search">
          <span className="fleet-sheet-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.home_fleet_search()}
            autoFocus
          />
        </label>

        {filtered.length === 0 ? (
          <p className="fleet-sheet-empty">{m.home_fleet_empty()}</p>
        ) : (
          <ul className="fleet-sheet-list">
            {filtered.map((vehicle, index) => {
              const active = vehicle.id === activeId
              const needsService = vehicleNeedsService(vehicle)
              const artIndex = vehicles.findIndex((item) => item.id === vehicle.id)
              const mark = vehicle.brand.trim().charAt(0).toUpperCase() || 'V'
              const statusLabel = active
                ? m.home_fleet_active()
                : needsService
                  ? m.home_fleet_pill_service()
                  : m.home_garage_status_ready()

              return (
                <li key={vehicle.id}>
                  <button
                    type="button"
                    className={`fleet-sheet-item${active ? ' is-active' : ''}${
                      needsService ? ' needs-service' : ''
                    }`}
                    onClick={() => onSelect(vehicle.id)}
                  >
                    <span className="fleet-sheet-item-top">
                      <span className="fleet-sheet-item-identity">
                        <span className="fleet-sheet-item-mark" aria-hidden="true">
                          {mark}
                        </span>
                        <span className="fleet-sheet-item-names">
                          <span className="fleet-sheet-item-brand">{vehicle.brand}</span>
                          <span className="fleet-sheet-item-model">
                            {vehicle.model} <span>{vehicle.year}</span>
                          </span>
                        </span>
                      </span>
                      <img
                        className="fleet-sheet-item-art"
                        src={vehicleArtSrc(artIndex >= 0 ? artIndex : index)}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className="fleet-sheet-item-footer">
                      <span className="fleet-sheet-pills">
                        <span className="fleet-sheet-pill">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect
                              x="4"
                              y="5"
                              width="16"
                              height="15"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.7"
                            />
                            <path
                              d="M8 3v3M16 3v3M4 10h16"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          </svg>
                          {vehicle.year}
                        </span>
                        <span className="fleet-sheet-pill">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.7" />
                            <path
                              d="M12 13l3.2-3.2M12 6v1.2"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          </svg>
                          {formatMileage(vehicle.mileage)}
                        </span>
                      </span>
                      <span
                        className={`fleet-sheet-pill fleet-sheet-pill--accent${
                          active ? ' is-active' : needsService ? ' is-service' : ''
                        }`}
                      >
                        <strong>{statusLabel}</strong>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export function VehicleHero({
  unlocked,
  kmUnlocked,
  kmHighlighted,
  highlighted,
  toolbarExtras,
  activeStripFirst = false,
  afterActiveStrip,
  fleetListOpen = false,
  onFleetListOpenChange,
  onFleetVehicleSelect,
  onSaved,
  onActiveChange,
  onServiceFocus,
}: {
  unlocked: boolean
  kmUnlocked: boolean
  kmHighlighted: boolean
  highlighted: boolean
  toolbarExtras?: ReactNode
  /** Puts the active-vehicle km strip above the fleet section. */
  activeStripFirst?: boolean
  /** Renders right after the active strip when `activeStripFirst` is set. */
  afterActiveStrip?: ReactNode
  fleetListOpen?: boolean
  onFleetListOpenChange?: (open: boolean) => void
  onFleetVehicleSelect?: () => void
  onSaved: (profile: VehicleProfile) => void
  onActiveChange: (profile: VehicleProfile | null) => void
  onServiceFocus: () => void
}) {
  const [garage, setGarage] = useState<GarageState>(() => getGarage())
  const [sheetOpen, setSheetOpen] = useState(() => getGarage().vehicles.length === 0)
  const [editingVehicle, setEditingVehicle] = useState<VehicleProfile | null>(null)
  const [mileageVehicle, setMileageVehicle] = useState<VehicleProfile | null>(null)
  const [addFocused, setAddFocused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const active = getActiveVehicle(garage)

  useEffect(() => {
    onActiveChange(getActiveVehicle(garage))
    // Sync once on mount; later updates go through select/save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!trackRef.current) return
    const track = trackRef.current
    const target = addFocused
      ? track.querySelector<HTMLElement>('[data-vehicle-id="add"]')
      : active
        ? track.querySelector<HTMLElement>(`[data-vehicle-id="${active.id}"]`)
        : null
    if (!target) return

    const left = target.offsetLeft - (track.clientWidth - target.clientWidth) / 2
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [active?.id, addFocused])

  function openAddSheet() {
    setSheetOpen(true)
  }

  function selectVehicle(id: string) {
    setAddFocused(false)
    const next = setActiveVehicle(id, garage)
    setGarage(next)
    onActiveChange(getActiveVehicle(next))
  }

  function selectAddCard() {
    setAddFocused(true)
    onActiveChange(null)
  }

  const activeStrip = addFocused ? (
    <div
      data-section="kilometraje"
      className={`dash-lockable garage-active-strip is-unlocked is-pending-add${
        kmHighlighted ? ' is-highlighted' : ''
      }`}
      aria-label={m.home_garage_strip_add()}
    >
      <div className="garage-active-copy">
        <p className="garage-active-km">{m.home_garage_strip_add()}</p>
      </div>
    </div>
  ) : active ? (
    <button
      type="button"
      data-section="kilometraje"
      className={`dash-lockable garage-active-strip${
        kmUnlocked ? ' is-unlocked' : ' is-locked'
      }${kmHighlighted ? ' is-highlighted' : ''}`}
      aria-disabled={!kmUnlocked}
      disabled={!kmUnlocked}
      aria-label={m.home_mileage_update_open()}
      onClick={() => {
        if (!kmUnlocked) return
        setMileageVehicle(active)
      }}
    >
      {!kmUnlocked ? <LockIcon /> : null}
      <div className="garage-active-copy">
        <p className="garage-active-label">{m.home_mileage_update_open()}</p>
        <p className={`garage-active-km${active.mileage.trim() ? '' : ' garage-active-km--empty'}`}>
          {active.mileage.trim() ? formatMileage(active.mileage) : m.home_garage_km_empty()}
        </p>
      </div>
    </button>
  ) : null

  return (
    <>
      {activeStripFirst ? (
        <>
          {activeStrip}
          {afterActiveStrip}
        </>
      ) : null}

      <section
        data-section="vehiculo"
        className={`dash-lockable garage-hero${unlocked || garage.vehicles.length === 0 ? ' is-unlocked' : ' is-locked'}${
          highlighted ? ' is-highlighted' : ''
        }`}
        aria-disabled={garage.vehicles.length > 0 && !unlocked}
      >
        {garage.vehicles.length > 0 && !unlocked ? <LockIcon /> : null}

        <div className="garage-hero-head">
          <div>
            <p className="garage-hero-eyebrow">{m.home_garage_eyebrow()}</p>
            <h2 className="garage-hero-title">{m.home_garage_title()}</h2>
          </div>
          <div className="garage-hero-actions">
            {toolbarExtras}
            <button
              type="button"
              className="garage-add-btn"
              aria-label={m.home_garage_add()}
              disabled={garage.vehicles.length > 0 && !unlocked}
              onClick={openAddSheet}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="garage-stage-row">
          <div className="garage-stage-rail" aria-label="Accesos rápidos">
            <button
              type="button"
              className="dash-icon-btn garage-stage-rail-btn"
              aria-label="Herramientas"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="dash-icon-btn garage-stage-rail-btn"
              aria-label="Combustible"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 22V7a2 2 0 012-2h7a2 2 0 012 2v15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 22h14M7 10h5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M14 11h1.5a2.5 2.5 0 012.5 2.5V18a2 2 0 002 2h.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 7l2.5 2.5V14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          {addFocused ? (
            <div className="garage-stage garage-stage--empty garage-stage--add-focus">
              <p className="garage-stage-empty-copy">
                {m.home_garage_stage_no_vehicles()}
              </p>
            </div>
          ) : (
            <GarageCarStage vehicle={active} />
          )}
          <div className="garage-stage-rail garage-stage-rail--end" aria-label="Estado del vehículo">
            <button
              type="button"
              className="dash-icon-btn garage-stage-rail-btn garage-stage-rail-btn--battery"
              aria-label={`Batería ${addFocused || !active ? '—' : '72%'}`}
            >
              <span className="garage-battery-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3.5"
                    y="7"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M17.5 10v4h1.8a1.2 1.2 0 001.2-1.2v-1.6a1.2 1.2 0 00-1.2-1.2H17.5z"
                    fill="currentColor"
                  />
                </svg>
                <span className="garage-battery-pct">
                  {addFocused || !active ? '—' : '72'}
                </span>
              </span>
            </button>
            <span
              className="garage-stage-rail-slot"
              aria-hidden="true"
              title="Próximamente"
            />
          </div>
        </div>

        {garage.vehicles.length === 0 ? (
          <button type="button" className="garage-empty" onClick={openAddSheet}>
            <p className="garage-empty-title">{m.home_vehicle_empty_title()}</p>
            <p className="garage-empty-hint">{m.home_vehicle_empty_hint()}</p>
          </button>
        ) : (
          <>
            <div ref={trackRef} className="garage-track">
              {garage.vehicles.map((vehicle, index) => (
                <div
                  key={vehicle.id}
                  data-vehicle-id={vehicle.id}
                  className="garage-track-item"
                >
                  <VehicleSelectCard
                    vehicle={vehicle}
                    index={index}
                    active={vehicle.id === garage.activeId && !addFocused}
                    onSelect={() => selectVehicle(vehicle.id)}
                    onServiceFocus={onServiceFocus}
                    onEdit={() => {
                      setEditingVehicle(vehicle)
                    }}
                  />
                </div>
              ))}
              <div data-vehicle-id="add" className="garage-track-item garage-track-item--add">
                <VehicleAddCard
                  active={addFocused}
                  disabled={!unlocked}
                  onSelect={selectAddCard}
                  onConfirm={() => {
                    setAddFocused(false)
                    openAddSheet()
                  }}
                />
              </div>
            </div>

            {activeStripFirst ? null : activeStrip}
          </>
        )}
      </section>

      {sheetOpen
        ? createPortal(
            <VehicleSetupSheet
              key={`new-${garage.vehicles.length}`}
              onClose={() => setSheetOpen(false)}
              onSaved={(next) => {
                setGarage(next)
                setSheetOpen(false)
                setAddFocused(false)
                const saved = getActiveVehicle(next)
                onActiveChange(saved)
                if (saved) onSaved(saved)
              }}
            />,
            document.body,
          )
        : null}

      {editingVehicle
        ? createPortal(
            <VehicleEditSheet
              key={editingVehicle.id}
              vehicle={
                garage.vehicles.find((item) => item.id === editingVehicle.id) ??
                editingVehicle
              }
              onClose={() => setEditingVehicle(null)}
              onSaved={(next) => {
                setGarage(next)
                setEditingVehicle(null)
                const saved = getActiveVehicle(next)
                onActiveChange(saved)
                if (saved) onSaved(saved)
              }}
            />,
            document.body,
          )
        : null}

      {mileageVehicle
        ? createPortal(
            <MileageUpdateModal
              key={`km-${mileageVehicle.id}`}
              vehicle={
                garage.vehicles.find((item) => item.id === mileageVehicle.id) ??
                mileageVehicle
              }
              onClose={() => setMileageVehicle(null)}
              onSaved={(next) => {
                setGarage(next)
                setMileageVehicle(null)
                const saved = getActiveVehicle(next)
                onActiveChange(saved)
                if (saved) onSaved(saved)
              }}
            />,
            document.body,
          )
        : null}

      {fleetListOpen
        ? createPortal(
            <FleetListSheet
              vehicles={garage.vehicles}
              activeId={garage.activeId}
              onClose={() => onFleetListOpenChange?.(false)}
              onSelect={(id) => {
                selectVehicle(id)
                setAddFocused(false)
                onFleetListOpenChange?.(false)
                onFleetVehicleSelect?.()
              }}
            />,
            document.body,
          )
        : null}
    </>
  )
}
