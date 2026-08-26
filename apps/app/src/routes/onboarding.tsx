import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Onboarding } from '../screens/Onboarding'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const navigate = useNavigate()
  return <Onboarding onFinish={() => navigate({ to: '/login' })} />
}
