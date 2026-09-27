import * as Sentry from '@sentry/react'

// Error monitoring. Inert until VITE_SENTRY_DSN is set.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    tracesSampleRate: 0.1,
  })
}

export function setSentryUser(userId: string | null) {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  Sentry.setUser(userId ? { id: userId } : null)
}

export { Sentry }
