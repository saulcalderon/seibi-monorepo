import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  DEFAULT_ESTIMATE_LOCATION,
  ESTIMATE_RADIUS_DEFAULT,
  ESTIMATE_RADIUS_MAX,
  ESTIMATE_RADIUS_MIN,
  ESTIMATE_SUGGESTIONS,
  estimateForQuery,
  estimateVehicleLabel,
  mapEmbedUrl,
  type EstimateLocation,
  type EstimateResult,
} from '../lib/estimates'
import type { VehicleProfile } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

type ChatEntry =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'reply'; estimate: EstimateResult }

function ReplyCard({ estimate }: { estimate: EstimateResult }) {
  return (
    <div className="estimados-reply">
      <p className="estimados-reply-title">{estimate.title}</p>
      <p className="estimados-reply-meta">{estimate.meta}</p>
      <div className="estimados-reply-price-row">
        <span className="estimados-reply-price">{estimate.price}</span>
        <span className="estimados-reply-range">
          {estimate.range}
          <br />
          {m.estimados_range_note()}
        </span>
      </div>
      <div className="estimados-reply-bars">
        <div className="estimados-reply-bar">
          <span className="estimados-reply-bar-name">{m.estimados_labor()}</span>
          <div className="estimados-reply-bar-track">
            <div
              className="estimados-reply-bar-fill labor"
              style={{ width: `${estimate.laborPct}%` }}
            />
          </div>
        </div>
        <div className="estimados-reply-bar">
          <span className="estimados-reply-bar-name">{m.estimados_parts()}</span>
          <div className="estimados-reply-bar-track">
            <div
              className="estimados-reply-bar-fill parts"
              style={{ width: `${estimate.partsPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function Estimados({ vehicle }: { vehicle: VehicleProfile | null }) {
  const label = estimateVehicleLabel(vehicle)
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [typing, setTyping] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [location, setLocation] = useState<EstimateLocation | null>(null)
  const [radiusKm, setRadiusKm] = useState(ESTIMATE_RADIUS_DEFAULT)
  const [draftRadius, setDraftRadius] = useState(ESTIMATE_RADIUS_DEFAULT)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const activeLocation = location ?? DEFAULT_ESTIMATE_LOCATION
  const hasLocated = location !== null

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const node = threadRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [entries, typing])

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  function ask(raw: string) {
    const text = raw.trim()
    if (!text || typing) return

    const userId = `u-${Date.now()}`
    setEntries((prev) => [...prev, { id: userId, kind: 'user', text }])
    setQuery('')
    setTyping(true)

    timersRef.current.forEach(clearTimeout)
    const replyTimer = window.setTimeout(() => {
      const estimate = estimateForQuery(text, {
        radiusKm,
        location: activeLocation,
      })
      setEntries((prev) => [
        ...prev,
        { id: `r-${Date.now()}`, kind: 'reply', estimate },
      ])
      setTyping(false)
    }, 700)
    timersRef.current = [replyTimer]
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    ask(query)
  }

  function commitRadius(value: number) {
    const next = Math.min(ESTIMATE_RADIUS_MAX, Math.max(ESTIMATE_RADIUS_MIN, Math.round(value)))
    setDraftRadius(next)
    setRadiusKm(next)
  }

  function locateMe() {
    setDraftRadius(radiusKm)
    setSheetOpen(true)
    setLocating(true)

    if (!navigator.geolocation) {
      setLocation(DEFAULT_ESTIMATE_LOCATION)
      setLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const inElSalvador =
          latitude > 13.1 && latitude < 14.5 && longitude > -90.2 && longitude < -87.6
        setLocation({
          lat: latitude,
          lon: longitude,
          label: inElSalvador ? 'San Salvador' : m.estimados_location_here(),
          country: inElSalvador ? 'El Salvador' : m.estimados_location_nearby(),
        })
        setLocating(false)
      },
      () => {
        setLocation(DEFAULT_ESTIMATE_LOCATION)
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
    )
  }

  function closeSheet() {
    commitRadius(draftRadius)
    setSheetOpen(false)
  }

  return (
    <div className="estimados-screen">
      <header className="estimados-header">
        <div className="estimados-header-top">
          <div>
            <p className="estimados-eyebrow">{m.home_estimates_eyebrow()}</p>
            <h1 className="estimados-title">{m.estimados_title()}</h1>
            <p className="estimados-context">
              {label
                ? m.home_vehicle_context({ vehicle: label })
                : m.home_vehicle_context_empty()}
            </p>
            {hasLocated ? (
              <p className="estimados-zone-summary">
                {m.estimados_location_summary({
                  km: String(radiusKm),
                  place: activeLocation.label,
                })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={`estimados-locate-btn${sheetOpen ? ' is-open' : ''}`}
            onClick={() => locateMe()}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <LocationPinIcon />
            <span>{m.estimados_locate()}</span>
          </button>
        </div>
      </header>

      <div className="estimados-thread" ref={threadRef}>
        {entries.length === 0 ? (
          <div className="estimados-empty">
            <p className="estimados-empty-title">{m.estimados_empty_title()}</p>
            <p className="estimados-empty-desc">{m.estimados_empty_desc()}</p>
            <div className="estimados-suggestions">
              {ESTIMATE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="estimados-chip"
                  onClick={() => ask(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          entries.map((entry) =>
            entry.kind === 'user' ? (
              <div key={entry.id} className="estimados-bubble user">
                {entry.text}
              </div>
            ) : (
              <div key={entry.id} className="estimados-bubble reply">
                <ReplyCard estimate={entry.estimate} />
              </div>
            ),
          )
        )}

        {typing ? (
          <div className="estimados-typing" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      <form className="estimados-composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="search"
          className="estimados-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={m.estimados_placeholder()}
          aria-label={m.estimados_placeholder()}
          autoComplete="off"
        />
        <button
          type="submit"
          className="estimados-send"
          aria-label={m.estimados_send()}
          disabled={!query.trim() || typing}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 19V7M7.5 11.5L12 7l4.5 4.5"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

      {sheetOpen ? (
        <div className="estimados-sheet" role="presentation">
          <button
            type="button"
            className="estimados-sheet-backdrop"
            aria-label={m.home_vehicle_sheet_close()}
            onClick={closeSheet}
          />
          <div
            className="estimados-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={m.estimados_locate()}
          >
            <div className="estimados-sheet-header">
              <div>
                <p className="estimados-sheet-eyebrow">{m.estimados_locate()}</p>
                <h2 className="estimados-sheet-title">
                  {locating
                    ? m.estimados_locating()
                    : m.estimados_location_place({
                        place: activeLocation.label,
                        country: activeLocation.country,
                      })}
                </h2>
              </div>
              <button
                type="button"
                className="estimados-sheet-close"
                onClick={closeSheet}
              >
                {m.home_vehicle_sheet_close()}
              </button>
            </div>

            <p className="estimados-location-hint">{m.estimados_location_hint()}</p>

            <div className="estimados-map-frame estimados-map-frame--sheet">
              {locating ? (
                <div className="estimados-map-loading">{m.estimados_locating()}</div>
              ) : (
                <iframe
                  key={`${activeLocation.lat}-${activeLocation.lon}-${radiusKm}`}
                  title={m.estimados_map_title()}
                  className="estimados-map"
                  src={mapEmbedUrl(activeLocation, radiusKm)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
              <div
                className="estimados-map-radius"
                style={{
                  ['--radius-scale' as string]: String(
                    0.28 + draftRadius / ESTIMATE_RADIUS_MAX,
                  ),
                }}
                aria-hidden="true"
              />
            </div>

            <div className="estimados-radius">
              <div className="estimados-radius-top">
                <p className="estimados-radius-label">{m.estimados_radius_label()}</p>
                <p className="estimados-radius-value">
                  {m.estimados_radius_km({ km: String(draftRadius) })}
                </p>
              </div>
              <div
                className="estimados-radius-slider-wrap"
                style={{
                  ['--radius-progress' as string]: `${
                    ((draftRadius - ESTIMATE_RADIUS_MIN) /
                      (ESTIMATE_RADIUS_MAX - ESTIMATE_RADIUS_MIN)) *
                    100
                  }%`,
                }}
              >
                <div className="estimados-radius-track" aria-hidden="true">
                  <div className="estimados-radius-fill" />
                </div>
                <input
                  type="range"
                  className="estimados-radius-slider"
                  min={ESTIMATE_RADIUS_MIN}
                  max={ESTIMATE_RADIUS_MAX}
                  step={1}
                  value={draftRadius}
                  aria-label={m.estimados_radius_label()}
                  aria-valuemin={ESTIMATE_RADIUS_MIN}
                  aria-valuemax={ESTIMATE_RADIUS_MAX}
                  aria-valuenow={draftRadius}
                  aria-valuetext={m.estimados_radius_km({ km: String(draftRadius) })}
                  onChange={(event) => setDraftRadius(Number(event.target.value))}
                  onPointerUp={(event) => commitRadius(Number(event.currentTarget.value))}
                  onKeyUp={(event) => commitRadius(Number(event.currentTarget.value))}
                />
              </div>
              <div className="estimados-radius-ends" aria-hidden="true">
                <span>{m.estimados_radius_km({ km: String(ESTIMATE_RADIUS_MIN) })}</span>
                <span>{m.estimados_radius_km({ km: String(ESTIMATE_RADIUS_MAX) })}</span>
              </div>
            </div>

            <button type="button" className="estimados-sheet-cta" onClick={closeSheet}>
              {m.estimados_location_done()}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
