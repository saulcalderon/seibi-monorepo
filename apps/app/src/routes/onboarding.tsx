import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Onboarding } from '../screens/Onboarding'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const navigate = useNavigate()
  // Preview: skip login and go straight into setup questions.
  return (
    <Onboarding
      onFinish={() => navigate({ to: '/setup' })}
      onSkip={() => navigate({ to: '/setup' })}
    />
  )
}
