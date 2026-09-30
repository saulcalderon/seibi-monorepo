import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useRequireSession } from '../lib/authSession'
import { getSession, homePathFor } from '../lib/routing'
import { Onboarding } from '../screens/Onboarding'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    if ((await homePathFor(session)) === '/home') throw redirect({ to: '/home' })
  },
  component: OnboardingRoute,
})

function OnboardingRoute() {
  useRequireSession()
  const navigate = useNavigate()
  return <Onboarding onFinish={() => void navigate({ to: '/home', replace: true })} />
}
