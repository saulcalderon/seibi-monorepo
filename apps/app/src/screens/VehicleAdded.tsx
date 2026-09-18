import { useEffect, useRef, useState } from 'react'
import * as m from '../paraglide/messages.js'

const SPIN_MS = 1600
const DONE_MS = 1800

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function VehicleAdded({ onContinue }: { onContinue: () => void }) {
  const [spinning, setSpinning] = useState(true)
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue

  useEffect(() => {
    const reduce = prefersReducedMotion()
    if (reduce) {
      setSpinning(false)
      const done = window.setTimeout(() => onContinueRef.current(), 400)
      return () => window.clearTimeout(done)
    }
    const spin = window.setTimeout(() => setSpinning(false), SPIN_MS)
    return () => window.clearTimeout(spin)
  }, [])

  useEffect(() => {
    if (spinning) return
    if (prefersReducedMotion()) return
    const done = window.setTimeout(() => onContinueRef.current(), DONE_MS)
    return () => window.clearTimeout(done)
  }, [spinning])

  return (
    <div className="know-added flex h-full flex-col items-center justify-center bg-fog px-7">
      <div className="know-added-glow" aria-hidden="true" />
      <div className={`know-added-card${spinning ? '' : ' is-done'}`} role="status" aria-live="polite">
        {spinning ? (
          <span className="vehicle-save-spinner" aria-hidden="true" />
        ) : (
          <span className="vehicle-save-check-ring" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />
            </svg>
          </span>
        )}
        <h1 className="know-added-title">
          {spinning ? m.know_added_saving() : m.know_added_title()}
        </h1>
        <p className="know-added-desc">
          {spinning ? m.know_added_saving_desc() : m.know_added_desc()}
        </p>
      </div>
    </div>
  )
}
