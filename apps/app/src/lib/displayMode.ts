const STANDALONE_CLASS = 'is-standalone'

type StandaloneNavigator = Navigator & { standalone?: boolean }

/** True when the app is installed (home screen / PWA), not a browser tab. */
export function isStandaloneDisplay(
  win: Window = window,
  nav: StandaloneNavigator = navigator,
): boolean {
  if (nav.standalone === true) return true
  const media = win.matchMedia?.bind(win)
  if (!media) return false
  return (
    media('(display-mode: standalone)').matches ||
    media('(display-mode: fullscreen)').matches ||
    media('(display-mode: minimal-ui)').matches
  )
}

/** Marks <html> so CSS can size the shell to the real screen in standalone. */
export function applyStandaloneClass(
  root: HTMLElement = document.documentElement,
  win: Window = window,
  nav: StandaloneNavigator = navigator,
): boolean {
  const standalone = isStandaloneDisplay(win, nav)
  root.classList.toggle(STANDALONE_CLASS, standalone)
  return standalone
}
