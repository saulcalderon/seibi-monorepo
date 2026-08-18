import { createFileRoute, redirect } from '@tanstack/react-router'
import { Login } from '../screens/Login'
import { isSetupDone } from '../lib/setupProgress'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: isSetupDone() ? '/home' : '/setup' })
    }
  },
  component: Login,
})
