import { useEffect, useRef } from 'react'
import { Logo } from '../components/Logo'
import * as m from '../paraglide/messages.js'

const AUTO_ADVANCE_MS = 4200

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SetupWelcome({
  name,
  onContinue,
}: {
  name: string
  onContinue: () => void
}) {
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue

  useEffect(() => {
    const delay = prefersReducedMotion() ? 500 : AUTO_ADVANCE_MS
    const timer = window.setTimeout(() => onContinueRef.current(), delay)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="know-welcome flex h-full flex-col bg-fog px-7 pt-16 pb-11">
      <div className="know-welcome-glow" aria-hidden="true" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <Logo className="know-welcome-logo text-3xl" />
        <p className="know-welcome-eyebrow mt-10 text-[0.72rem] font-semibold tracking-[0.18em] text-radiant uppercase">
          {m.know_welcome_eyebrow()}
        </p>
        <h1 className="know-welcome-title mt-4 max-w-72 text-[1.85rem] leading-tight tracking-tight text-coal">
          {name ? m.know_welcome_title_named({ name }) : m.know_welcome_title()}
        </h1>
        <p className="know-welcome-desc mt-4 max-w-78 text-[0.92rem] leading-relaxed text-black/55">
          {m.know_welcome_desc()}
        </p>
      </div>
    </div>
  )
}
