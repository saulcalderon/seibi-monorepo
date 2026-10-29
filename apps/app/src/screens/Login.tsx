import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Logo } from '../components/Logo'
import { playLockupHandoff } from '../lib/lockupHandoff'
import { signInWithProvider } from '../lib/supabase'

const display = 'font-sans font-light tracking-[-0.025em]'

/** Opacity + translate, held by the keyframes. Motion's transform cleanup was snapping the screen at the end. */
function rise(reduce: boolean | null, delay: number): CSSProperties | undefined {
  if (reduce) return undefined
  return { animation: `login-rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s both` }
}
const pill =
  'inline-flex h-11 w-full select-none items-center justify-center gap-2 rounded-full text-[0.92rem] font-medium transition-transform duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.72c.03 2.52 2.21 3.36 2.24 3.37-.02.06-.35 1.2-1.15 2.37-.7 1.02-1.42 2.03-2.56 2.05-1.12.02-1.48-.66-2.76-.66-1.28 0-1.68.64-2.74.68-1.1.04-1.94-1.1-2.64-2.12-1.44-2.08-2.54-5.88-1.06-8.44.73-1.27 2.04-2.08 3.46-2.1 1.08-.02 2.1.73 2.76.73.66 0 1.9-.9 3.2-.77.54.02 2.07.22 3.05 1.66-.08.05-1.82 1.06-1.8 3.23ZM14.6 6.3c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16Z"
      />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  )
}

export function Login() {
  const reduce = useReducedMotion()
  const fromSplash = useRouterState({ select: (s) => s.location.state.fromSplash === true })
  const handoff = fromSplash && !reduce
  const lockupRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<'apple' | 'google' | null>(null)

  useLayoutEffect(() => {
    if (!fromSplash) return
    playLockupHandoff(lockupRef.current)
  }, [fromSplash])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', '#f1f1f2')
    return () => {
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [])
  const [error, setError] = useState<string | null>(null)

  async function continueWith(provider: 'apple' | 'google') {
    setPending(provider)
    setError(null)
    const { error: e } = await signInWithProvider(provider)
    if (e) {
      setError(provider === 'apple' ? 'No pudimos abrir Apple. Intenta de nuevo.' : 'No pudimos abrir Google. Intenta de nuevo.')
      setPending(null)
    }
  }

  return (
    <div className="login-screen intro-day intro-v3 relative flex h-full flex-col overflow-hidden bg-bg pt-safe pb-safe">
      <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="relative -top-8 flex w-full flex-col items-center px-5 pt-5" style={handoff ? undefined : rise(reduce, 0)}>
        <div ref={lockupRef} className="flex flex-col items-center gap-1" style={{ transformOrigin: 'center center' }}>
        <Logo className="text-[2.35rem]" />
        <p className="font-sans text-[1.35rem] font-bold leading-none tracking-[-0.035em] text-[var(--app-ink)] [font-stretch:125%]">
          <span className="sr-only">Seibi</span>
          <span aria-hidden>
            seib
            <span className="relative inline-block after:absolute after:left-1/2 after:top-[-0.02em] after:size-[0.15em] after:-translate-x-1/2 after:-skew-x-14 after:rounded-[0.02em] after:bg-[#e0464f] after:content-['']">
              ı
            </span>
          </span>
        </p>
        </div>
      </div>
      <div className="relative my-1 flex h-48 items-center justify-center px-5">
        <img
          src="/assets/login-yaris.png"
          alt=""
          className="h-full w-full object-contain"
          style={reduce ? undefined : { animation: `login-car 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) ${handoff ? 0.78 : 0.08}s both` }}
        />
      </div>
      <div className="mt-1 flex flex-col px-6 pb-4 text-center">
        <div style={rise(reduce, handoff ? 0.86 : 0.16)}>
          <h1 className={`${display} text-[1.7rem] leading-[1.12]`}>Mantenimiento con total claridad</h1>
          <p className="mt-2 text-pretty text-[0.9rem] leading-[1.45] text-muted">
            Entra para guardar tus Vehículos y recibir tus avisos.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className={`${pill} bg-[var(--app-inverse)] text-[var(--app-on-inverse)]`}
            disabled={pending !== null}
            onClick={() => void continueWith('apple')}
            style={rise(reduce, handoff ? 0.94 : 0.24)}
          >
            {pending === 'apple' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <AppleMark />}
            Continuar con Apple
          </button>
          <button
            type="button"
            className={`${pill} bg-[var(--app-surface)] text-[var(--app-ink)] shadow-card`}
            disabled={pending !== null}
            onClick={() => void continueWith('google')}
            style={rise(reduce, handoff ? 1 : 0.3)}
          >
            {pending === 'google' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <GoogleMark />}
            Continuar con Google
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-center text-[0.85rem] font-medium text-overdue">
            {error}
          </p>
        ) : null}
      </div>
      </div>
      <p className="px-6 pb-3 text-center text-[0.75rem] leading-[1.4] text-muted" style={rise(reduce, handoff ? 1.12 : 0.42)}>
        Al continuar aceptas los{' '}
        <Link to="/legal/terminos" className="font-semibold text-[var(--app-ink)] underline">
          Términos
        </Link>{' '}
        y la{' '}
        <Link to="/legal/privacidad" className="font-semibold text-[var(--app-ink)] underline">
          Política de privacidad
        </Link>
        .
      </p>
    </div>
  )
}
