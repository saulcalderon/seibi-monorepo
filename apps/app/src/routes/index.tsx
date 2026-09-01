import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { pathAfterSplash } from '../lib/introProgress'
import { supabase } from '../lib/supabase'
import { Splash } from '../screens/Splash'

export const Route = createFileRoute('/')({
  loader: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return { next: pathAfterSplash(session?.user.id ?? null) }
  },
  component: SplashRoute,
})

function SplashRoute() {
  const { next } = Route.useLoaderData()
  const navigate = useNavigate()
  return <Splash onDone={() => navigate({ to: next, replace: true })} />
}
