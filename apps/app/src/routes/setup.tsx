import { createFileRoute, redirect } from '@tanstack/react-router'
import { isSetupDone } from '../lib/setupProgress'
import { supabase } from '../lib/supabase'
import { SetupFlow } from '../screens/SetupFlow'

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Preview: first-time after login without a real session (same as /home).
    if (!session) {
      if (!import.meta.env.DEV) {
        throw redirect({ to: '/login' })
      }
      return
    }

    if (isSetupDone(session.user.id)) {
      throw redirect({ to: '/home' })
    }
  },
  component: SetupFlow,
})
