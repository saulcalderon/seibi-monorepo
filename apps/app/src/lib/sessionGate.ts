import { redirect } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** Production: no session → `/login`. Vite DEV keeps the preview bypass. */
export async function requireSessionOrDevBypass(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) return session

  if (!import.meta.env.DEV) {
    throw redirect({ to: '/login' })
  }

  return null
}
