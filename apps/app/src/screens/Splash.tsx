import { useEffect, useRef } from 'react'
import type { AnimationEvent, CSSProperties } from 'react'
import { Logo } from '../components/Logo'
import { clearLockupFrom, stashLockupFrom } from '../lib/lockupHandoff'

const SPLASH_FALLBACK_MS = 4200
const WORD = ['s', 'e', 'i', 'b'] as const

export function Splash({ handoff = false, onDone }: { handoff?: boolean; onDone: () => void }) {
  const leftRef = useRef(false)
  const lockupRef = useRef<HTMLHeadingElement>(null)
  const hold = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('stay')

  const leave = () => {
    if (hold || leftRef.current) return
    leftRef.current = true
    if (handoff) stashLockupFrom(lockupRef.current)
    else clearLockupFrom()
    onDone()
  }

  useEffect(() => {
    if (hold) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(leave, reduce ? 400 : SPLASH_FALLBACK_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', '#f2f4f7')
    return () => {
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [])

  return (
    <div className="splash-screen intro-day flex h-full flex-col items-center justify-center bg-bg">
      <h1 ref={lockupRef} className="splash-lockup m-0 flex flex-col items-center">
        <Logo
          className="splash-logo"
          onAnimationEnd={(e: AnimationEvent<SVGSVGElement>) => {
            if (e.animationName === 'splash-s-shine') leave()
          }}
        />
        <span
          className="splash-word font-sans font-bold leading-none tracking-[-0.035em] text-ink [font-stretch:125%]"
          aria-hidden
        >
          {WORD.map((letter, i) => (
            <span key={letter} className="splash-letter" style={{ '--i': i } as CSSProperties}>
              {letter}
            </span>
          ))}
          <span
            className="splash-letter relative after:absolute after:left-1/2 after:top-[-0.02em] after:size-[0.15em] after:-translate-x-1/2 after:-skew-x-14 after:rounded-[0.02em] after:bg-[#e0464f] after:content-['']"
            style={{ '--i': WORD.length } as CSSProperties}
          >
            ı
          </span>
        </span>
      </h1>
    </div>
  )
}
