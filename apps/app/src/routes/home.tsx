import { createFileRoute, redirect } from '@tanstack/react-router'
import { Home } from '../screens/Home'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/home')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  component: Home,
})
