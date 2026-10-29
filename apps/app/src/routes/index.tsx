import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { pathAfterSplash } from '../lib/routing'
import { Splash } from '../screens/Splash'

export const Route = createFileRoute('/')({
  loader: async () => ({ next: await pathAfterSplash() }),
  component: SplashRoute,
})

function SplashRoute() {
  const { next } = Route.useLoaderData()
  const navigate = useNavigate()
  const handoff = next === '/login' || next === '/intro'
  return (
    <Splash
      handoff={handoff}
      onDone={() => void navigate({ to: next, replace: true, state: handoff ? { fromSplash: true } : {} })}
    />
  )
}
