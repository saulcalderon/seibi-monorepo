import { redirect } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { fetchProfile, profileQueryKey } from './profile'
import { queryClient } from './queryClient'
import { supabase } from './supabase'

const INTRO_DONE_KEY = 'seibi-intro-done'

export function markIntroDone() {
  try {
    localStorage.setItem(INTRO_DONE_KEY, '1')
  } catch {
    // Private mode: the Intro may show again next visit.
  }
}

export function isIntroDone() {
  try {
    return (
      localStorage.getItem(INTRO_DONE_KEY) === '1' ||
      localStorage.getItem('seibi-onboarding-done') === '1'
    )
  } catch {
    return false
  }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

async function isOnboarded(userId: string) {
  const profile = await queryClient.ensureQueryData({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId),
  })
  return Boolean(profile.onboardedAt)
}

/** Where a signed-in user belongs: Onboarding until finished, then Inicio. */
export async function homePathFor(session: Session): Promise<'/home' | '/onboarding'> {
  try {
    return (await isOnboarded(session.user.id)) ? '/home' : '/onboarding'
  } catch {
    // Offline or a transient error: Inicio shows its own error state.
    return '/home'
  }
}

export async function pathAfterSplash(): Promise<'/intro' | '/login' | '/home' | '/onboarding'> {
  const session = await getSession()
  if (session) {
    markIntroDone()
    return homePathFor(session)
  }
  return isIntroDone() ? '/login' : '/intro'
}

/** beforeLoad for the signed-in app: needs a session and a finished Onboarding. */
export async function requireOnboardedSession() {
  const session = await getSession()
  if (!session) throw redirect({ to: '/login' })
  if ((await homePathFor(session)) === '/onboarding') throw redirect({ to: '/onboarding' })
  return session
}
