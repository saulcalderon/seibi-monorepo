import { createFileRoute, redirect } from '@tanstack/react-router'

// Old link from v1; Onboarding replaced the setup flow.
export const Route = createFileRoute('/setup')({
  beforeLoad: () => {
    throw redirect({ to: '/onboarding' })
  },
})
