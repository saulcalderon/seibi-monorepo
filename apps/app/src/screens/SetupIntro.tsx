import { useEffect, useRef } from 'react'
import { Logo } from '../components/Logo'
import * as m from '../paraglide/messages.js'

interface SetupIntroProps {
  onContinue: () => void
}

const AUTO_ADVANCE_MS = 5000

function shouldHoldIntro() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('stay')
}

export function SetupIntro({ onContinue }: SetupIntroProps) {
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue
  const holdIntro = shouldHoldIntro()

  useEffect(() => {
    if (holdIntro) return
    const advance = window.setTimeout(() => onContinueRef.current(), AUTO_ADVANCE_MS)
    return () => window.clearTimeout(advance)
  }, [holdIntro])

  return (
    <div className="setup-intro flex h-full flex-col bg-fog">
      <div className="login-axis-lights" aria-hidden="true">
        <span className="login-glow login-glow-a" />
        <span className="login-glow login-glow-b" />
        <span className="login-glow login-glow-c" />
        <span className="login-glow login-glow-d" />
        <span className="login-glow login-glow-e" />
      </div>

      <div className="setup-intro-brand">
        <Logo className="setup-intro-logo text-3xl" />
      </div>

      <div className="setup-intro-copy">
        <p className="setup-intro-eyebrow">{m.setup_intro_eyebrow()}</p>
        <h1 className="setup-intro-title">
          <span className="setup-intro-title-line">{m.setup_intro_title()}</span>
          <em>{m.setup_intro_title_em()}</em>
        </h1>
        <div className="setup-intro-wait" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}
