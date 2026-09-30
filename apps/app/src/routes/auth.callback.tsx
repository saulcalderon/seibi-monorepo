import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { homePathFor, markIntroDone } from '../lib/routing'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackRoute,
})

function AuthCallbackRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    let done = false
    const route = async () => {
      const { data } = await supabase.auth.getSession()
      if (done) return
      if (data.session) {
        done = true
        markIntroDone()
        void navigate({ to: await homePathFor(data.session), replace: true })
      }
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) void route()
      else if (event === 'INITIAL_SESSION') {
        // The OAuth code exchange may still be running; give it a moment.
        window.setTimeout(async () => {
          const { data } = await supabase.auth.getSession()
          if (!data.session && !done) void navigate({ to: '/login', replace: true })
        }, 2500)
      }
    })
    void route()
    return () => {
      done = true
      subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg">
      <LoaderCircle className="size-6 animate-spin text-radiant" aria-hidden />
      <p className="text-[0.9rem] text-muted">Entrando a Seibi…</p>
    </div>
  )
}
