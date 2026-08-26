const SETUP_DONE_PREFIX = 'seibi-setup-done'

function setupKey(userId?: string | null) {
  return userId ? `${SETUP_DONE_PREFIX}:${userId}` : SETUP_DONE_PREFIX
}

export function markSetupDone(userId?: string | null) {
  localStorage.setItem(setupKey(userId), '1')
}

export function isSetupDone(userId?: string | null) {
  return localStorage.getItem(setupKey(userId)) === '1'
}
