import { createFileRoute, redirect } from '@tanstack/react-router'
import { isSetupDone } from '../lib/setupProgress'
import { requireSessionOrDevBypass } from '../lib/sessionGate'
import { SetupFlow } from '../screens/SetupFlow'

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => {
    const session = await requireSessionOrDevBypass()
    if (!session) return

    if (isSetupDone(session.user.id)) {
      throw redirect({ to: '/home' })
    }
  },
  component: SetupFlow,
})
