import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ActionsProvider } from '../app/Actions'
import { Dock } from '../app/Dock'
import { useRequireSession } from '../lib/authSession'
import { requireOnboardedSession } from '../lib/routing'

export const Route = createFileRoute('/_app')({
  beforeLoad: requireOnboardedSession,
  component: AppLayout,
})

function AppLayout() {
  useRequireSession()
  return (
    <ActionsProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Outlet />
        <Dock />
      </div>
    </ActionsProvider>
  )
}
