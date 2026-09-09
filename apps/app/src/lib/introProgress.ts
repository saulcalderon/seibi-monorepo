import { isSetupDone } from './setupProgress'

const INTRO_DONE_KEY = 'seibi-intro-done'
const LEGACY_INTRO_DONE_KEY = 'seibi-onboarding-done'

export type PathAfterSplash = '/intro' | '/login' | '/onboarding' | '/home'

export function markIntroDone() {
  localStorage.setItem(INTRO_DONE_KEY, '1')
}

export function isIntroDone() {
  return (
    localStorage.getItem(INTRO_DONE_KEY) === '1' ||
    localStorage.getItem(LEGACY_INTRO_DONE_KEY) === '1'
  )
}

/** First visit → Intro. Later visits or an existing session skip it. */
export function pathAfterSplash(sessionUserId: string | null): PathAfterSplash {
  if (sessionUserId) {
    markIntroDone()
    return isSetupDone(sessionUserId) ? '/home' : '/onboarding'
  }

  return isIntroDone() ? '/login' : '/intro'
}
