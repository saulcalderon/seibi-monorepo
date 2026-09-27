import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { routeTree } from './routeTree.gen'
import { UpdatePrompt } from './app/UpdatePrompt'
import { applyStandaloneClass } from './lib/displayMode'
import { queryClient } from './lib/queryClient'
import { initSentry, Sentry } from './lib/sentry'
import { initTheme } from './lib/theme'
import { ErrorState } from './ui/feedback'

initSentry()
initTheme()
// Before paint: standalone shell CSS (iOS navigator.standalone + display-mode).
applyStandaloneClass()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultViewTransition: true,
  // Each screen scrolls its own <main>; the router's restoration keyed them
  // all as "main" and carried one screen's offset into the next.
  scrollRestoration: false,
  defaultErrorComponent: ({ reset }) => (
    <div className="flex h-full items-center justify-center bg-bg">
      <ErrorState
        title="Algo salió mal"
        body="Tuvimos un problema al abrir esta pantalla."
        onRetry={() => {
          reset()
          window.location.reload()
        }}
      />
    </div>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorState title="Algo salió mal" body="Recarga la app para continuar." onRetry={() => window.location.reload()} />}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <UpdatePrompt />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
