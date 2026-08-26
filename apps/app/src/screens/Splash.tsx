import { useEffect, useRef } from 'react'
import type { AnimationEvent } from 'react'

interface SplashProps {
  onDone: () => void
}

const SPLASH_FALLBACK_MS = 4600

function shouldHoldSplash() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('stay')
}

export function Splash({ onDone }: SplashProps) {
  const doneRef = useRef(false)
  const holdSplash = shouldHoldSplash()

  const finish = () => {
    if (holdSplash || doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    if (holdSplash) return
    const timer = setTimeout(finish, SPLASH_FALLBACK_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdSplash])

  const handleMarkDone = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.animationName === 'splash-bar-fill') finish()
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-fog">
      <div className="splash-brand">
        <h1 className="splash-mark" aria-label="Seibi">
          <span className="splash-s" aria-hidden="true">
            S
          </span>
          <span className="splash-letter splash-e" aria-hidden="true">
            <span>e</span>
          </span>
          <span className="splash-letter splash-i1" aria-hidden="true">
            <span>i</span>
          </span>
          <span className="splash-letter splash-b" aria-hidden="true">
            <span>b</span>
          </span>
          <span className="splash-letter splash-i2" aria-hidden="true">
            <span>i</span>
          </span>
        </h1>
        <div className="splash-bar-track" aria-hidden="true">
          <span className="splash-underline" onAnimationEnd={handleMarkDone} />
        </div>
      </div>
    </div>
  )
}
