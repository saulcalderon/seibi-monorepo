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
  const videoRef = useRef<HTMLVideoElement>(null)

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

  // iOS Safari / Home Screen PWAs often ignore the autoPlay attribute.
  // Force muted + playsInline via properties, then call play() explicitly
  // (same approach as the HTML prototype). Hide native controls if blocked
  // (e.g. Low Power Mode) so the splash never shows a play button.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.controls = false

    const tryPlay = () => {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.controls = false
        })
      }
    }

    tryPlay()
    video.addEventListener('loadeddata', tryPlay)
    video.addEventListener('canplay', tryPlay)

    return () => {
      video.removeEventListener('loadeddata', tryPlay)
      video.removeEventListener('canplay', tryPlay)
      video.pause()
    }
  }, [])

  const handleBarAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === 'seibi-load-bar') finish()
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-splash">
      <div className="splash-car-wrap flex h-[48%] w-[82%] items-center justify-center">
        <video
          ref={videoRef}
          className="splash-video h-full w-full object-contain"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
        >
          {/* MP4 first: Safari/iOS can play WebM but drops VP9 alpha, which
              paints the gray underlay. H.264 has the cream splash bg baked in. */}
          <source src="/assets/splash-car-clean.mp4" type="video/mp4" />
          <source src="/assets/splash-car-clean.webm" type="video/webm" />
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
