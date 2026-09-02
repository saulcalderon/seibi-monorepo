import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { markIntroDone, pathAfterSplash } from '../lib/introProgress'
import { supabase } from '../lib/supabase'
import { Onboarding } from '../screens/Onboarding'

export const Route = createFileRoute('/intro')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const next = pathAfterSplash(session?.user.id ?? null)
    if (next !== '/intro') {
      throw redirect({ to: next })
    }
  },
  component: IntroRoute,
})

function IntroRoute() {
  const navigate = useNavigate()
  return (
    <Onboarding
      onFinish={() => {
        markIntroDone()
        void navigate({ to: '/login', replace: true })
      }}
    />
  )
}
