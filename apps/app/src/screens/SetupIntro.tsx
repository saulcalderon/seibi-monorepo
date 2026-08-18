import { useEffect, useRef } from 'react'
import { Logo } from '../components/Logo'
import * as m from '../paraglide/messages.js'

interface SetupIntroProps {
  onContinue: () => void
}

const AUTO_ADVANCE_MS = 5200

export function SetupIntro({ onContinue }: SetupIntroProps) {
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue

  useEffect(() => {
    const advance = window.setTimeout(() => onContinueRef.current(), AUTO_ADVANCE_MS)
    return () => window.clearTimeout(advance)
  }, [])

  return (
    <div className="setup-intro flex h-full flex-col bg-splash px-7 pt-16 pb-11">
      <div className="setup-intro-glow" aria-hidden="true" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <Logo className="setup-intro-logo text-3xl" />

        <p className="setup-intro-eyebrow mt-10 text-[0.72rem] font-semibold tracking-[0.18em] text-milano uppercase">
          {m.setup_intro_eyebrow()}
        </p>

        <h1 className="setup-intro-title mt-4 max-w-72 text-[1.85rem] leading-tight tracking-tight text-ink">
          {m.setup_intro_title()}{' '}
          <em className="text-milano not-italic">{m.setup_intro_title_em()}</em>
        </h1>

        <p className="setup-intro-desc mt-4 max-w-78 text-[0.92rem] leading-relaxed text-black/55">
          {m.setup_intro_desc()}
        </p>

        <div className="setup-intro-pulse mt-10" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
