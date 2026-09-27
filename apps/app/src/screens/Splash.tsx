import { useEffect, useRef } from 'react'
import type { AnimationEvent } from 'react'
import { Logo } from '../components/Logo'

const SPLASH_FALLBACK_MS = 2600

export function Splash({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(false)
  const hold = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('stay')

  const finish = () => {
    if (hold || doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    if (hold) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(finish, reduce ? 400 : SPLASH_FALLBACK_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold])

  return (
    <div className="flex h-full flex-col items-center justify-center bg-bg">
      <h1 className="m-0 flex items-center justify-center">
        <Logo
          className="splash-logo"
          onAnimationEnd={(e: AnimationEvent<SVGSVGElement>) => {
            if (e.animationName === 'splash-mark-in') finish()
          }}
        />
      </h1>
      <p className="mt-6 font-display text-[1.05rem] font-semibold tracking-wide text-muted">
        Mantenimiento con total claridad
      </p>
    </div>
  )
}
