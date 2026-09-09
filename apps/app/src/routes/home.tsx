import { createFileRoute } from '@tanstack/react-router'
import { requireSessionOrDevBypass } from '../lib/sessionGate'
import { Home } from '../screens/Home'

export const Route = createFileRoute('/home')({
  beforeLoad: async () => {
    await requireSessionOrDevBypass()
  },
  component: Home,
})
