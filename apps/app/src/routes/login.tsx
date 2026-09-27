import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession, homePathFor } from '../lib/routing'
import { Login } from '../screens/Login'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) throw redirect({ to: await homePathFor(session) })
  },
  component: Login,
})
