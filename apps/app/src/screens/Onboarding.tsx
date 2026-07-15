import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as m from '../paraglide/messages.js'

interface OnboardingProps {
  onFinish: () => void
}

interface Slide {
  icon: ReactNode
  title: string
  desc: string
}

const HistoryIcon = (
  <svg viewBox="0 0 72 72" fill="none" aria-hidden="true" className="h-18 w-18">
    <rect x="14" y="10" width="44" height="52" rx="6" stroke="#000" strokeWidth="2.5" />
    <path d="M22 22h28M22 32h20M22 42h24M22 52h16" stroke="#c40000" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="50" cy="50" r="10" fill="#c40000" />
    <path d="M47 50l2.5 2.5L54 46" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ReminderIcon = (
  <svg viewBox="0 0 72 72" fill="none" aria-hidden="true" className="h-18 w-18">
    <circle cx="36" cy="36" r="24" stroke="#000" strokeWidth="2.5" />
    <path d="M36 20v16l10 6" stroke="#c40000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="36" cy="58" r="4" fill="#c40000" />
    <path d="M30 6h12" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const EstimateIcon = (
  <svg viewBox="0 0 72 72" fill="none" aria-hidden="true" className="h-18 w-18">
    <rect x="12" y="18" width="48" height="36" rx="6" stroke="#000" strokeWidth="2.5" />
    <path d="M12 30h48" stroke="#000" strokeWidth="2.5" />
    <text x="22" y="46" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill="#c40000">$</text>
    <path d="M34 42h18M34 48h12" stroke="#000" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
  </svg>
)

export function Onboarding({ onFinish }: OnboardingProps) {
  const slides: Slide[] = [
    { icon: HistoryIcon, title: m.onboarding_1_title(), desc: m.onboarding_1_desc() },
    { icon: ReminderIcon, title: m.onboarding_2_title(), desc: m.onboarding_2_desc() },
    { icon: EstimateIcon, title: m.onboarding_3_title(), desc: m.onboarding_3_desc() },
  ]

  const viewportRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const isLast = current === slides.length - 1

  function goToSlide(index: number) {
    const clamped = Math.max(0, Math.min(index, slides.length - 1))
    const viewport = viewportRef.current
    if (viewport) {
      viewport.scrollTo({ left: clamped * viewport.clientWidth, behavior: 'smooth' })
    }
    setCurrent(clamped)
  }

  function handleScroll() {
    const viewport = viewportRef.current
    if (!viewport || !viewport.clientWidth) return
    const next = Math.round(viewport.scrollLeft / viewport.clientWidth)
    if (next !== current) setCurrent(next)
  }

  function handleNext() {
    if (isLast) onFinish()
    else goToSlide(current + 1)
  }

  return (
    <div className="flex h-full flex-col bg-splash">
      <header className="flex min-h-18 items-center justify-end px-7 pt-13">
        <button
          type="button"
          onClick={onFinish}
          className="p-1 text-[0.78rem] font-medium text-black/45 transition-colors hover:text-black/75"
        >
          {m.onboarding_skip()}
        </button>
      </header>

      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full">
          {slides.map((slide) => (
            <article
              key={slide.title}
              className="flex flex-[0_0_100%] snap-start snap-always flex-col items-center justify-center px-8 text-center"
            >
              <div className="mb-8 flex h-37 w-37 items-center justify-center rounded-[36px] bg-white/55 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                {slide.icon}
              </div>
              <h2 className="mb-2.5 text-2xl font-bold tracking-tight text-ink">
                {slide.title}
              </h2>
              <p className="max-w-70 text-[0.82rem] leading-relaxed text-black/70">
                {slide.desc}
              </p>
            </article>
          ))}
        </div>
      </div>

      <footer className="flex flex-col items-center gap-5 px-7 pt-5 pb-11">
        <div className="flex items-center justify-center gap-1.5" role="tablist">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-selected={index === current}
              onClick={() => goToSlide(index)}
              className={`h-[7px] rounded-full transition-all duration-300 ${
                index === current ? 'w-[22px] bg-milano' : 'w-[7px] bg-black/15'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="w-full rounded-full bg-milano px-5 py-[0.95rem] text-[0.9rem] font-semibold text-white shadow-[0_4px_20px_rgba(196,0,0,0.28)] transition-transform active:scale-[0.98]"
        >
          {isLast ? m.onboarding_continue() : m.onboarding_next()}
        </button>
      </footer>
    </div>
  )
}
