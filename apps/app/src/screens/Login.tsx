import { useState } from 'react'
import { Logo } from '../components/Logo'
import { signInWithProvider } from '../lib/supabase'
import type { OAuthProvider } from '../lib/supabase'
import * as m from '../paraglide/messages.js'

export function Login() {
  const [pending, setPending] = useState<OAuthProvider | null>(null)

  async function handleSignIn(provider: OAuthProvider) {
    setPending(provider)
    const { error } = await signInWithProvider(provider)
    if (error) {
      console.error(`[auth] ${provider} sign-in failed`, error.message)
      setPending(null)
    }
    // On success Supabase redirects away, so no reset needed.
  }

  return (
    <div className="flex h-full flex-col bg-splash">
      <div className="relative z-10 px-6 pt-14 pb-2 text-center">
        <Logo className="text-3xl" />
        <p className="mt-2 text-[0.8rem] text-black/88">{m.tagline()}</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <img
          src="/assets/login-hero.png"
          alt="Garaje con vehículo"
          className="block h-auto w-full max-w-80"
        />
      </div>

      <div className="relative z-10 flex flex-col gap-3 px-7 pb-11">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => handleSignIn('apple')}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-black/8 bg-white px-5 py-[0.95rem] text-[0.9rem] font-semibold text-[#111] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          {m.login_apple()}
        </button>

        <button
          type="button"
          disabled={pending !== null}
          onClick={() => handleSignIn('google')}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-black/8 bg-white px-5 py-[0.95rem] text-[0.9rem] font-semibold text-[#111] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {m.login_google()}
        </button>

        <p className="mt-1.5 text-center text-[0.65rem] leading-relaxed text-black/88">
          {m.login_terms_prefix()}
          <a href="#" className="text-milano no-underline">{m.login_terms_tos()}</a>
          {m.login_terms_and()}
          <a href="#" className="text-milano no-underline">{m.login_terms_privacy()}</a>.
        </p>
      </div>
    </div>
  )
}
