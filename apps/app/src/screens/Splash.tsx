import { useEffect, useRef } from 'react'
import type { AnimationEvent } from 'react'
import { Logo } from '../components/Logo'

interface SplashProps {
  onDone: () => void
}

const SPLASH_FALLBACK_MS = 2600

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

  const handleMarkDone = (event: AnimationEvent<SVGSVGElement>) => {
    if (event.animationName === 'splash-mark-in') finish()
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-fog">
      <div className="splash-brand">
        <h1 className="splash-mark">
          <Logo className="splash-logo" onAnimationEnd={handleMarkDone} />
        </h1>
      </div>
    </div>
  )
}
