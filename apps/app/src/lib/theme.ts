const THEME_KEY = 'seibi-theme'

export type ThemeMode = 'day' | 'night'

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'day'
  return localStorage.getItem(THEME_KEY) === 'night' ? 'night' : 'day'
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode)
  applyTheme(mode)
}

export function initTheme() {
  applyTheme(getTheme())
}
