import { useEffect, useRef, useState } from 'react'
import * as m from '../paraglide/messages.js'

interface OnboardingProps {
  onFinish: () => void
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const AlertWarningIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 8v5M12 16.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path
      d="M10.3 4.2L2.8 17.5a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

const AlertTireIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    <path
      d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const OilDropIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3.2S6.8 10 6.8 14a5.2 5.2 0 0010.4 0C17.2 10 12 3.2 12 3.2z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
)

const WheelIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M12 4.6v2.3M12 17.1v2.3M4.6 12h2.3M17.1 12h2.3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

const CarSideIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4.5 14.2l1.1-3.2A2.4 2.4 0 017.9 9.2h8.2a2.4 2.4 0 012.3 1.8l1.1 3.2"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M3.8 14.2h16.4v2.6a1.1 1.1 0 01-1.1 1.1H4.9a1.1 1.1 0 01-1.1-1.1v-2.6z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M8.2 9.2l.7-1.9h6.2l.7 1.9"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <circle cx="7.4" cy="17.4" r="1.25" fill="currentColor" />
    <circle cx="16.6" cy="17.4" r="1.25" fill="currentColor" />
  </svg>
)

/* Slide 1 — service history timeline. Illustrative sample records. */
function HistorySlide({ active }: { active: boolean }) {
  return (
    <article className={`info-slide${active ? ' active' : ''}`}>
      <div className="info-stage">
        <div className="info-stage-glow" aria-hidden="true" />
        <div className="mock-card">
          <div className="mock-card-header">
            <div className="mock-vehicle-label">
              <img
                className="mock-car-thumb"
                src="/assets/info-car.png"
                alt=""
                width={52}
                height={24}
              />
              <span className="mock-card-label">Tu vehículo</span>
            </div>
            <span className="mock-badge">3 servicios</span>
          </div>
          <div className="mock-timeline">
            <div className="mock-row">
              <span className="mock-row-icon" aria-hidden="true">
                {OilDropIcon}
              </span>
              <div className="mock-row-body">
                <div className="mock-row-title">Cambio de aceite</div>
                <div className="mock-row-place">Auto Norte</div>
                <div className="mock-row-when">12 mar · 10:00 a.m.</div>
              </div>
              <span className="mock-row-cost">$850</span>
            </div>
            <div className="mock-row">
              <span className="mock-row-icon muted" aria-hidden="true">
                {WheelIcon}
              </span>
              <div className="mock-row-body">
                <div className="mock-row-title">Frenos delanteros</div>
                <div className="mock-row-place">Taller Rápido</div>
                <div className="mock-row-when">3 feb · 4:30 p.m.</div>
              </div>
              <span className="mock-row-cost">$2,400</span>
            </div>
            <div className="mock-row">
              <span className="mock-row-icon muted" aria-hidden="true">
                {CarSideIcon}
              </span>
              <div className="mock-row-body">
                <div className="mock-row-title">Alineación</div>
                <div className="mock-row-place">Centro Automotriz</div>
                <div className="mock-row-when">28 ene · 9:15 a.m.</div>
              </div>
              <span className="mock-row-cost">$650</span>
            </div>
          </div>
        </div>
      </div>
      <div className="info-copy theme-historial">
        <span className="info-copy-watermark" aria-hidden="true">
          1
        </span>
        <div className="info-copy-top">
          <span className="info-step">1</span>
          <span className="info-eyebrow">{m.onboarding_1_eyebrow()}</span>
        </div>
        <h2 className="info-title">
          {m.onboarding_1_title()} <em>{m.onboarding_1_title_em()}</em>
        </h2>
        <p className="info-desc">{m.onboarding_1_desc()}</p>
      </div>
    </article>
  )
}

const KM_TARGET = 42180
const KM_COUNT_MS = 1600
const KM_COUNT_DELAY_MS = 550

const formatKm = (value: number) => Math.round(value).toLocaleString('en-US')

/* Slide 2 — mileage odometer with an eased count-up on activation. */
function ReminderSlide({ active }: { active: boolean }) {
  const kmRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = kmRef.current
    if (!el) return

    if (!active) {
      el.textContent = '0'
      el.classList.remove('counting')
      return
    }

    if (prefersReducedMotion()) {
      el.textContent = formatKm(KM_TARGET)
      return
    }

    let raf = 0
    el.textContent = '0'
    el.classList.remove('counting')
    const startAt = performance.now() + KM_COUNT_DELAY_MS
    let pulseStarted = false

    const tick = (now: number) => {
      if (now < startAt) {
        raf = requestAnimationFrame(tick)
        return
      }
      if (!pulseStarted) {
        pulseStarted = true
        void el.offsetWidth
        el.classList.add('counting')
      }
      const t = Math.min(1, (now - startAt) / KM_COUNT_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      el.textContent = formatKm(KM_TARGET * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        el.textContent = formatKm(KM_TARGET)
        el.classList.remove('counting')
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  return (
    <article className={`info-slide${active ? ' active' : ''}`}>
      <div className="info-stage">
        <div className="info-stage-glow" aria-hidden="true" />
        <div className="mock-card">
          <div className="mock-card-header">
            <span className="mock-card-label">Kilometraje</span>
            <span className="mock-badge">2 avisos</span>
          </div>
          <div className="mock-odometer">
            <div className="mock-km-block">
              <span className="mock-km-value" ref={kmRef}>
                0
              </span>
              <span className="mock-km-unit">km</span>
            </div>
            <div className="mock-progress">
              <img
                className="mock-progress-car"
                src="/assets/info-car-km.png"
                alt=""
                width={44}
                height={19}
              />
              <div className="mock-progress-track">
                <div className="mock-progress-fill" />
              </div>
            </div>
            <div className="mock-alerts">
              <div className="mock-alert">
                <div className="mock-alert-icon">{AlertWarningIcon}</div>
                <p className="mock-alert-text">
                  Cambio de aceite en <strong>820 km</strong> o el 28 de jul
                </p>
              </div>
              <div className="mock-alert">
                <div className="mock-alert-icon">{AlertTireIcon}</div>
                <p className="mock-alert-text">
                  Cambio de llantas en <strong>3,400 km</strong> o el 12 de nov
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="info-copy theme-recordatorios">
        <span className="info-copy-watermark" aria-hidden="true">
          2
        </span>
        <div className="info-copy-top">
          <span className="info-step">2</span>
          <span className="info-eyebrow">{m.onboarding_2_eyebrow()}</span>
        </div>
        <h2 className="info-title">
          {m.onboarding_2_title()} <em>{m.onboarding_2_title_em()}</em>
        </h2>
        <p className="info-desc">{m.onboarding_2_desc()}</p>
      </div>
    </article>
  )
}

const CHAT_QUERY = 'Cambio de aceite sintético 10W-30'
const CHAT_START_DELAY_MS = 1200

/* Slide 3 — chat estimate. Types the query, shows a typing indicator, then
   reveals the priced reply. Timers are cleared when the slide leaves view. */
function EstimateSlide({ active }: { active: boolean }) {
  const typedRef = useRef<HTMLSpanElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef<HTMLDivElement>(null)
  const replyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const typed = typedRef.current
    const caret = caretRef.current
    const user = userRef.current
    const typing = typingRef.current
    const reply = replyRef.current
    if (!typed || !caret || !user || !typing || !reply) return

    const reset = () => {
      typed.textContent = ''
      caret.classList.remove('hide')
      user.classList.remove('visible')
      typing.classList.remove('visible', 'hiding')
      reply.classList.remove('visible')
    }

    reset()
    if (!active) return

    if (prefersReducedMotion()) {
      typed.textContent = CHAT_QUERY
      caret.classList.add('hide')
      user.classList.add('visible')
      reply.classList.add('visible')
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    const delay = (ms: number, fn: () => void) => {
      timers.push(setTimeout(fn, ms))
    }

    delay(CHAT_START_DELAY_MS, () => {
      user.classList.add('visible')
      let i = 0
      const typeNext = () => {
        if (i <= CHAT_QUERY.length) {
          typed.textContent = CHAT_QUERY.slice(0, i)
          i += 1
          timers.push(setTimeout(typeNext, 18 + Math.random() * 16))
        } else {
          caret.classList.add('hide')
          delay(220, () => {
            typing.classList.add('visible')
            delay(650, () => {
              typing.classList.add('hiding')
              delay(150, () => {
                typing.classList.remove('visible', 'hiding')
                reply.classList.add('visible')
              })
            })
          })
        }
      }
      typeNext()
    })

    return () => timers.forEach(clearTimeout)
  }, [active])

  return (
    <article className={`info-slide${active ? ' active' : ''}`}>
      <div className="info-stage">
        <div className="info-stage-glow" aria-hidden="true" />
        <div className="mock-card chat-card">
          <div className="mock-browser-bar">
            <div className="mock-browser-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-browser-url">seibiapp.com/estimados</div>
          </div>
          <div className="mock-chat">
            <div className="mock-chat-bubble user" ref={userRef}>
              <span ref={typedRef} />
              <span className="mock-chat-caret" ref={caretRef} />
            </div>
            <div className="mock-chat-typing" ref={typingRef} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-chat-bubble reply" ref={replyRef}>
              <div className="chat-reply-title">Cambio de aceite sintético 10W-30</div>
              <div className="chat-reply-meta">Rango típico en tu zona</div>
              <div className="chat-reply-price-row">
                <span className="chat-reply-price">$1,180</span>
                <span className="chat-reply-range">
                  $980 – $1,450
                  <br />
                  según taller
                </span>
              </div>
              <div className="chat-reply-bars">
                <div className="chat-reply-bar">
                  <span className="chat-reply-bar-name">Mano de obra</span>
                  <div className="chat-reply-bar-track">
                    <div className="chat-reply-bar-fill labor" />
                  </div>
                </div>
                <div className="chat-reply-bar">
                  <span className="chat-reply-bar-name">Refacciones</span>
                  <div className="chat-reply-bar-track">
                    <div className="chat-reply-bar-fill parts" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="info-copy theme-estimados">
        <span className="info-copy-watermark" aria-hidden="true">
          3
        </span>
        <div className="info-copy-top">
          <span className="info-step">3</span>
          <span className="info-eyebrow">{m.onboarding_3_eyebrow()}</span>
        </div>
        <h2 className="info-title">
          {m.onboarding_3_title()} <em>{m.onboarding_3_title_em()}</em>
        </h2>
        <p className="info-desc">{m.onboarding_3_desc()}</p>
      </div>
    </article>
  )
}

const SLIDE_COUNT = 3
/** Pause after "Siguiente" so in-slide motion can settle before scrolling. */
const NEXT_SETTLE_MS = 120
/** Fallback if `scrollend` is unavailable. */
const SCROLL_SETTLE_MS = 550
/** Extra beat after landing before the mock card appears. */
const STAGE_REVEAL_MS = 60

export function Onboarding({ onFinish }: OnboardingProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  /** Which slide may play entrance animations / show its mock card. */
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const currentRef = useRef(0)
  const activeRef = useRef(0)
  const programmaticScrollRef = useRef(false)
  const scrollDoneTimerRef = useRef(0)
  const nextTimerRef = useRef(0)
  const revealTimerRef = useRef(0)
  const isLast = current === SLIDE_COUNT - 1

  currentRef.current = current
  activeRef.current = active

  useEffect(() => {
    return () => {
      clearTimeout(nextTimerRef.current)
      clearTimeout(scrollDoneTimerRef.current)
      clearTimeout(revealTimerRef.current)
    }
  }, [])

  function revealSlide(index: number) {
    clearTimeout(revealTimerRef.current)
    const delay = prefersReducedMotion() ? 0 : STAGE_REVEAL_MS
    revealTimerRef.current = window.setTimeout(() => {
      setActive(index)
      setBusy(false)
    }, delay)
  }

  function finishProgrammaticScroll(index: number) {
    programmaticScrollRef.current = false
    setCurrent(index)
    revealSlide(index)
  }

  function goToSlide(index: number) {
    const clamped = Math.max(0, Math.min(index, SLIDE_COUNT - 1))
    if (clamped === currentRef.current && activeRef.current === clamped) {
      setBusy(false)
      return
    }

    const viewport = viewportRef.current
    // Hide every mock card before moving so nothing peeks mid-transition.
    setActive(-1)
    clearTimeout(revealTimerRef.current)

    if (!viewport) {
      setCurrent(clamped)
      revealSlide(clamped)
      return
    }

    programmaticScrollRef.current = true
    clearTimeout(scrollDoneTimerRef.current)

    let settled = false
    const onDone = () => {
      if (settled) return
      settled = true
      viewport.removeEventListener('scrollend', onDone)
      clearTimeout(scrollDoneTimerRef.current)
      finishProgrammaticScroll(clamped)
    }

    viewport.addEventListener('scrollend', onDone)
    scrollDoneTimerRef.current = window.setTimeout(onDone, SCROLL_SETTLE_MS)
    viewport.scrollTo({ left: clamped * viewport.clientWidth, behavior: 'smooth' })
  }

  function handleScroll() {
    if (programmaticScrollRef.current) return
    const viewport = viewportRef.current
    if (!viewport || !viewport.clientWidth) return

    const progress = viewport.scrollLeft / viewport.clientWidth
    const nearest = Math.round(progress)
    const aligned = Math.abs(progress - nearest) < 0.03

    // Mid-swipe: hide cards so neighboring mocks aren't visible.
    if (!aligned) {
      if (activeRef.current !== -1) setActive(-1)
      return
    }

    if (nearest !== currentRef.current) {
      setCurrent(nearest)
      revealSlide(nearest)
    } else if (activeRef.current !== nearest) {
      revealSlide(nearest)
    }
  }

  function handleNext() {
    if (busy) return
    if (isLast) {
      onFinish()
      return
    }

    setBusy(true)
    clearTimeout(nextTimerRef.current)
    nextTimerRef.current = window.setTimeout(() => {
      goToSlide(currentRef.current + 1)
    }, prefersReducedMotion() ? 0 : NEXT_SETTLE_MS)
  }

  return (
    <div className="flex h-full flex-col bg-fog">
      <div className="min-h-14 shrink-0 pt-13" aria-hidden="true" />

      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="info-viewport flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        <div className="flex h-full">
          <HistorySlide active={active === 0} />
          <ReminderSlide active={active === 1} />
          <EstimateSlide active={active === 2} />
        </div>
      </div>

      <footer className="flex flex-col items-center gap-5 px-7 pt-5 pb-11">
        <div className="flex items-center justify-center gap-1.5" role="tablist">
          {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === current}
              aria-label={`Pantalla ${index + 1} de ${SLIDE_COUNT}`}
              disabled={busy}
              onClick={() => {
                if (busy) return
                setBusy(true)
                goToSlide(index)
              }}
              className={`info-dot${index === current ? ' active' : ''}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleNext}
          disabled={busy}
          aria-busy={busy}
          className="w-full rounded-full bg-radiant px-5 py-[0.95rem] text-[0.9rem] font-semibold text-pure shadow-[0_4px_20px_rgba(255,79,24,0.28)] transition-[transform,opacity] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        >
          {isLast ? m.onboarding_continue() : m.onboarding_next()}
        </button>
      </footer>
    </div>
  )
}
