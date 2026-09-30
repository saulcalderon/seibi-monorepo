const STANDALONE_CLASS = 'is-standalone'

type StandaloneNavigator = Navigator & { standalone?: boolean }

/** True when the app is installed (home screen / PWA), not a browser tab. */
export function isStandaloneDisplay(): boolean {
  if ((navigator as StandaloneNavigator).standalone === true) return true
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    false
  )
}

/** Marks <html> so CSS can size the shell to the real screen in standalone. */
export function applyStandaloneClass() {
  document.documentElement.classList.toggle(STANDALONE_CLASS, isStandaloneDisplay())
}
