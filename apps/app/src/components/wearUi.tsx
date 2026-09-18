import { useEffect, useState, type CSSProperties } from 'react'
import {
  wearLevelFromPct,
  WEAR_COLOR,
  type ReminderItem,
  type WearLevel,
} from '../lib/reminders'
import * as m from '../paraglide/messages.js'

export function wearStatusLabel(level: WearLevel) {
  if (level === 'optimal') return m.home_wear_status_optimal()
  if (level === 'medium') return m.home_wear_status_medium()
  if (level === 'high') return m.home_wear_status_high()
  return m.home_wear_status_replace()
}

export function wearLegend() {
  return [
    {
      id: 'optimal' as const,
      range: m.home_wear_range_optimal(),
      label: m.home_wear_status_optimal(),
      sample: 85,
    },
    {
      id: 'medium' as const,
      range: m.home_wear_range_medium(),
      label: m.home_wear_status_medium(),
      sample: 55,
    },
    {
      id: 'high' as const,
      range: m.home_wear_range_high(),
      label: m.home_wear_status_high(),
      sample: 27,
    },
    {
      id: 'replace' as const,
      range: m.home_wear_range_replace(),
      label: m.home_wear_status_replace(),
      sample: 8,
    },
  ]
}

export function WearGauge({
  pct,
  color,
  label,
  size = 'lg',
}: {
  pct: number
  color: string
  label?: string
  size?: 'lg' | 'sm'
}) {
  const large = size === 'lg'
  const view = large ? 120 : 32
  const r = large ? 46 : 11
  const c = 2 * Math.PI * r
  const cx = view / 2
  const shown = Math.min(100, Math.max(0, pct))

  return (
    <span
      className={`seibi-wear-gauge is-${size}`}
      style={{ '--wear': color } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${view} ${view}`}>
        <circle className="seibi-wear-gauge-track" cx={cx} cy={cx} r={r} />
        <circle
          className="seibi-wear-gauge-fill"
          cx={cx}
          cy={cx}
          r={r}
          style={{
            stroke: color,
            strokeDasharray: `${c}`,
            strokeDashoffset: `${c * (1 - shown / 100)}`,
          }}
        />
      </svg>
      {large ? (
        <span className="seibi-wear-gauge-copy">
          <strong>{Math.round(shown)}%</strong>
          {label ? <em>{label}</em> : null}
        </span>
      ) : null}
    </span>
  )
}

export function WearRing({
  pct,
  onClick,
  delayMs = 0,
  animate = true,
}: {
  pct: number
  onClick?: () => void
  delayMs?: number
  animate?: boolean
}) {
  const target = Math.min(100, Math.max(0, pct))
  const [filled, setFilled] = useState(false)
  const [shown, setShown] = useState(0)
  const level = wearLevelFromPct(target)
  const color = WEAR_COLOR[level]
  const replacing = level === 'replace'
  const c = 2 * Math.PI * 18

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !animate) {
      setFilled(true)
      setShown(target)
      return
    }

    setFilled(false)
    setShown(0)
    const duration = 1150
    let start: number | null = null
    let frame = 0
    let timeout = 0

    function tick(now: number) {
      if (start == null) start = now
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      setShown(target * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else setShown(target)
    }

    timeout = window.setTimeout(() => {
      frame = requestAnimationFrame(() => {
        setFilled(true)
        frame = requestAnimationFrame(tick)
      })
    }, delayMs)

    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(frame)
    }
  }, [target, delayMs, animate])

  return (
    <button
      type="button"
      className={`seibi-maint-ring-wrap${replacing ? ' is-replace' : ''}`}
      aria-label={m.home_wear_open()}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick?.()
      }}
    >
      {replacing ? (
        <span className="seibi-maint-smoke" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      ) : null}
      <svg className="seibi-maint-ring" viewBox="0 0 48 48">
        <circle className="seibi-maint-ring-track" cx="24" cy="24" r="18" />
        <circle
          className="seibi-maint-ring-fill"
          cx="24"
          cy="24"
          r="18"
          style={{
            stroke: color,
            strokeDasharray: `${c}`,
            strokeDashoffset: filled ? `${c * (1 - target / 100)}` : `${c}`,
          }}
        />
      </svg>
      <span className="seibi-maint-pct">{Math.round(shown)}%</span>
    </button>
  )
}

export function WearMeaningSheet({
  item,
  onClose,
}: {
  item: ReminderItem
  onClose: () => void
}) {
  const level = wearLevelFromPct(item.remainingPct)
  const color = WEAR_COLOR[level]

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="aviso-detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-wear-title"
    >
      <button
        type="button"
        className="aviso-detail-backdrop"
        aria-label={m.home_reminder_detail_close()}
        onClick={onClose}
      />
      <div className="aviso-detail-panel">
        <header className="aviso-detail-head">
          <div>
            <p className="aviso-detail-eyebrow">{m.home_wear_title()}</p>
            <h2 id="aviso-wear-title">{item.name}</h2>
          </div>
          <button type="button" className="aviso-detail-close" onClick={onClose}>
            {m.home_reminder_detail_close()}
          </button>
        </header>
        <p className="aviso-detail-hint">{m.home_wear_desc()}</p>
        <div className="seibi-wear">
          <div
            className="seibi-wear-hero"
            style={{ '--wear': color } as CSSProperties}
          >
            <p className="seibi-wear-now-kicker">{m.home_wear_current()}</p>
            <WearGauge
              pct={item.remainingPct}
              color={color}
              label={wearStatusLabel(level)}
            />
            <strong className="seibi-wear-part">{item.name}</strong>
          </div>
          <p className="seibi-wear-legend-title">{m.home_wear_legend()}</p>
          <ul className="seibi-wear-legend">
            {wearLegend().map((row) => (
              <li
                key={row.id}
                className={row.id === level ? 'is-current' : undefined}
                style={{ '--wear': WEAR_COLOR[row.id] } as CSSProperties}
              >
                <WearGauge pct={row.sample} color={WEAR_COLOR[row.id]} size="sm" />
                <span className="seibi-wear-range">{row.range}</span>
                <span className="seibi-wear-label">{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
