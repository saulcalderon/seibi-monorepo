import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Logo } from '../components/Logo'
import { signOut } from '../lib/supabase'
import * as m from '../paraglide/messages.js'

// Placeholder authenticated landing. The real vehicle/service UI is scoped in
// the deferred domain-modeling session (see GitHub issue #1).
export function Home() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    const { error } = await signOut()
    if (error) {
      console.error('[auth] sign-out failed', error.message)
      setPending(false)
      return
    }
    void navigate({ to: '/login', replace: true })
  }

  return (
    <div className="flex h-full flex-col bg-splash">
      <header className="flex items-center justify-between px-7 pt-14 pb-4">
        <Logo className="text-2xl" />
        <button
          type="button"
          disabled={pending}
          onClick={handleLogout}
          className="rounded-full border border-black/8 bg-white px-4 py-2 text-[0.8rem] font-semibold text-[#111] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {m.home_logout()}
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <h1 className="text-2xl tracking-tight text-ink">
          {m.home_title()}
        </h1>
        <p className="max-w-70 text-[0.85rem] leading-relaxed text-black/60">
          {m.home_empty()}
        </p>
      </div>
    </div>
  )
}
