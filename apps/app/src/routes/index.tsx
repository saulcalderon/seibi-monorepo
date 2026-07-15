import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Splash } from '../screens/Splash'

export const Route = createFileRoute('/')({
  component: SplashRoute,
})

function SplashRoute() {
  const navigate = useNavigate()
  return <Splash onDone={() => navigate({ to: '/onboarding' })} />
}
