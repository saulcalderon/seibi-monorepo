import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AuthSessionProvider } from '../lib/authSession'
import { ToastProvider } from '../ui/feedback'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthSessionProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AuthSessionProvider>
    </MotionConfig>
  )
}
