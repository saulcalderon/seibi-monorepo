import { useEffect, useState } from 'react'
import { Logo } from '../components/Logo'

interface SplashProps {
  onDone: () => void
}

const SPLASH_MS = 2800

export function Splash({ onDone }: SplashProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Kick the progress bar to 100% on the next frame so the width transitions.
    const raf = requestAnimationFrame(() => setProgress(100))
    const timer = setTimeout(onDone, SPLASH_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [onDone])

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-splash">
      <div className="flex h-[48%] w-[82%] items-center justify-center">
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
        <Logo className="text-4xl" />
        <div className="h-[3px] w-11 overflow-hidden rounded-full bg-milano/20">
          <div
            className="h-full rounded-full bg-milano transition-[width] duration-[2600ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
