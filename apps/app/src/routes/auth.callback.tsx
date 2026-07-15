import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackRoute,
})

function AuthCallbackRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) {
          void navigate({ to: '/home', replace: true })
          return
        }

        if (event === 'INITIAL_SESSION') {
          void navigate({ to: '/login', replace: true })
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="flex h-full items-center justify-center bg-splash">
      <p className="text-[0.85rem] text-black/60">Signing you in…</p>
    </div>
  )
}
