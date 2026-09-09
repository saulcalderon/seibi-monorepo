import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MileageUnit } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

const SLIDE_MS = 340

export function MileageUnitBox({
  unit,
  onChange,
}: {
  unit: MileageUnit
  onChange: (unit: MileageUnit) => void
}) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const kmRef = useRef<HTMLButtonElement>(null)
  const miRef = useRef<HTMLButtonElement>(null)
  const skipPulse = useRef(true)
  const [thumb, setThumb] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [ready, setReady] = useState(false)
  const [pulse, setPulse] = useState(false)

  useLayoutEffect(() => {
    const box = boxRef.current
    const active = unit === 'km' ? kmRef.current : miRef.current
    if (!box || !active) return

    function place() {
      if (!box || !active) return
      const boxRect = box.getBoundingClientRect()
      const btnRect = active.getBoundingClientRect()
      setThumb({
        x: btnRect.left - boxRect.left,
        y: btnRect.top - boxRect.top,
        w: btnRect.width,
        h: btnRect.height,
      })
    }

    place()
    if (!ready) {
      requestAnimationFrame(() => setReady(true))
    }

    const observer = new ResizeObserver(place)
    observer.observe(box)
    observer.observe(active)
    return () => observer.disconnect()
  }, [unit, ready])

  useEffect(() => {
    if (skipPulse.current) {
      skipPulse.current = false
      return
    }
    setPulse(false)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wait = reduce ? 0 : SLIDE_MS
    const timer = window.setTimeout(() => setPulse(true), wait)
    return () => window.clearTimeout(timer)
  }, [unit])

  function choose(next: MileageUnit) {
    if (next === unit) return
    onChange(next)
  }

  return (
    <span
      ref={boxRef}
      className={`mileage-unit-box${ready ? ' is-ready' : ''}`}
      role="group"
      aria-label={m.setup_4_unit_label()}
    >
      <span
        className="mileage-unit-thumb"
        style={{
          width: thumb.w,
          height: thumb.h,
          transform: `translate(${thumb.x}px, ${thumb.y}px)`,
        }}
        aria-hidden="true"
      />
      <button
        ref={kmRef}
        type="button"
        className={unit === 'km' ? `is-on${pulse ? ' is-pulse' : ''}` : undefined}
        aria-pressed={unit === 'km'}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          choose('km')
        }}
        onAnimationEnd={() => setPulse(false)}
      >
        {m.setup_4_unit_km()}
      </button>
      <button
        ref={miRef}
        type="button"
        className={unit === 'mi' ? `is-on${pulse ? ' is-pulse' : ''}` : undefined}
        aria-pressed={unit === 'mi'}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          choose('mi')
        }}
        onAnimationEnd={() => setPulse(false)}
      >
        {m.setup_4_unit_mi()}
      </button>
    </span>
  )
}
