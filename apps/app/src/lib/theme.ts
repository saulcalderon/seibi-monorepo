const THEME_KEY = 'seibi-theme'

export type ThemePreference = 'system' | 'day' | 'night'

function read(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'day' || value === 'night' ? value : 'system'
  } catch {
    return 'system'
  }
}

function resolved(pref: ThemePreference): 'day' | 'night' {
  if (pref !== 'system') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

function apply(pref: ThemePreference) {
  const mode = resolved(pref)
  document.documentElement.dataset.theme = mode
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', mode === 'night' ? '#0e0f11' : '#f2f4f7')
}

export function getThemePreference() {
  return read()
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, pref)
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  apply(pref)
}

export function initTheme() {
  apply(read())
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (read() === 'system') apply('system')
  })
}
