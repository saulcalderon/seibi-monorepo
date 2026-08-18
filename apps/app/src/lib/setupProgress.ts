const SETUP_DONE_KEY = 'seibi-setup-done'

export function markSetupDone() {
  sessionStorage.setItem(SETUP_DONE_KEY, '1')
}

export function isSetupDone() {
  return sessionStorage.getItem(SETUP_DONE_KEY) === '1'
}
