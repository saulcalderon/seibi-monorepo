import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ESTIMATE_SUGGESTIONS,
  estimateForQuery,
  estimateVehicleLabel,
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

export function Estimados({ vehicle }: { vehicle: VehicleProfile | null }) {
  const label = estimateVehicleLabel(vehicle)
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [typing, setTyping] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const node = threadRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [entries, typing])

  function ask(raw: string) {
    const text = raw.trim()
    if (!text || typing) return

    const userId = `u-${Date.now()}`
    setEntries((prev) => [...prev, { id: userId, kind: 'user', text }])
    setQuery('')
    setTyping(true)

    timersRef.current.forEach(clearTimeout)
    const replyTimer = window.setTimeout(() => {
      const estimate = estimateForQuery(text)
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

  return (
    <div className="estimados-screen">
      <header className="estimados-header">
        <p className="estimados-eyebrow">{m.home_estimates_eyebrow()}</p>
        <h1 className="estimados-title">{m.estimados_title()}</h1>
        <p className="estimados-context">
          {label
            ? m.home_vehicle_context({ vehicle: label })
            : m.home_vehicle_context_empty()}
        </p>
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
    </div>
  )
}
