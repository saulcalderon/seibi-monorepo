import { createFileRoute } from '@tanstack/react-router'
import { SetupFlow } from '../screens/SetupFlow'

// Preview mode: login bypassed so setup screens can be reviewed freely.
// Re-enable auth gate when wiring the real post-login path again.
export const Route = createFileRoute('/setup')({
  component: SetupFlow,
})
