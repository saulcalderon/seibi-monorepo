import { createFileRoute } from '@tanstack/react-router'
import { Home } from '../screens/Home'

// Preview mode: auth bypassed together with login skip.
export const Route = createFileRoute('/home')({
  component: Home,
})
