import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { User } from '@supabase/supabase-js'
import { queryClient } from './queryClient'
import { setSentryUser } from './sentry'
import { signOut, supabase } from './supabase'

export type AuthStatus = 'resolving_initial_session' | 'signed_in' | 'signed_out'

type AuthSessionValue = {
  user: User | null
  status: AuthStatus
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('resolving_initial_session')

  useEffect(() => {
    let cancelled = false
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setStatus(session ? 'signed_in' : 'signed_out')
    })
    void supabase.auth.getSession().then(({ error }) => {
      if (cancelled || !error) return
      setUser(null)
      setStatus('signed_out')
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setSentryUser(user?.id ?? null)
    if (status === 'signed_out') {
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== 'maintenance-tasks' && q.queryKey[0] !== 'vpic',
      })
      return
    }
    if (!user?.id) return
    // Drop another account's cached rows.
    queryClient.removeQueries({
      predicate: (q) =>
        typeof q.queryKey[1] === 'string' &&
        ['garage', 'profile', 'estimates', 'chat'].includes(String(q.queryKey[0])) &&
        q.queryKey[1] !== user.id,
    })
  }, [status, user?.id])

  return (
    <AuthSessionContext.Provider value={{ user, status }}>{children}</AuthSessionContext.Provider>
  )
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext)
  if (!value) throw new Error('useAuthSession must be used within AuthSessionProvider')
  return value
}

/** Bounce to login if the session disappears while a gated screen is mounted. */
export function useRequireSession() {
  const navigate = useNavigate()
  const { status } = useAuthSession()
  useEffect(() => {
    if (status === 'signed_out') void navigate({ to: '/login', replace: true })
  }, [navigate, status])
}

export function useSignOutToLogin() {
  const navigate = useNavigate()
  return async () => {
    await signOut()
    void navigate({ to: '/login', replace: true })
  }
}
