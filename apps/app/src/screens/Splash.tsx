import { useEffect, useRef } from 'react'
import type { AnimationEvent } from 'react'
import { Logo } from '../components/Logo'

interface SplashProps {
  onDone: () => void
}

// Fallback in case the loadBar animation event never fires (e.g. reduced motion).
const SPLASH_FALLBACK_MS = 3600

export function Splash({ onDone }: SplashProps) {
  const doneRef = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    const timer = setTimeout(finish, SPLASH_FALLBACK_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBarAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === 'seibi-load-bar') finish()
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-splash">
      <div className="splash-car-wrap flex h-[48%] w-[82%] items-center justify-center">
        <video
          className="h-full w-full object-contain"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/assets/splash-car-clean.webm" type="video/webm" />
          <source src="/assets/splash-car-clean.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="absolute bottom-24 flex flex-col items-center gap-4">
        <Logo className="splash-name text-4xl" />
        <div className="splash-progress-track h-[3px] w-11 overflow-hidden rounded-full bg-milano/20">
          <div
            className="splash-progress-bar h-full rounded-full bg-milano"
            onAnimationEnd={handleBarAnimationEnd}
          />
        </div>
      </div>
    </div>
  )
}
