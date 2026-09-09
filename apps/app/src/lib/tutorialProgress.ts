const TUTORIAL_STEP_KEY = 'seibi-tutorial-step'

/** 0 = welcome, 1–6 = section unlocks, 7 = finished */
export const TUTORIAL_TOTAL_STEPS = 7

export type AppSection =
  | 'animacion'
  | 'vehiculo'
  | 'agregar'
  | 'kilometraje'
  | 'servicios'
  | 'recordatorios'
  | 'estimados'

/** Step at which each section becomes unlocked (inclusive). */
export const SECTION_UNLOCK_STEP: Record<AppSection, number> = {
  animacion: 1,
  vehiculo: 2,
  agregar: 3,
  kilometraje: 2,
  servicios: 4,
  recordatorios: 5,
  estimados: 6,
}

function readStoredStep(): string | null {
  const persisted = localStorage.getItem(TUTORIAL_STEP_KEY)
  if (persisted !== null) return persisted

  const legacy = sessionStorage.getItem(TUTORIAL_STEP_KEY)
  if (legacy === null) return null
  localStorage.setItem(TUTORIAL_STEP_KEY, legacy)
  sessionStorage.removeItem(TUTORIAL_STEP_KEY)
  return legacy
}

export function getTutorialStep(): number {
  const raw = readStoredStep()
  if (raw === null) return 0
  const step = Number(raw)
  return Number.isFinite(step) ? Math.max(0, Math.min(TUTORIAL_TOTAL_STEPS, step)) : 0
}

export function setTutorialStep(step: number) {
  const next = String(Math.max(0, Math.min(TUTORIAL_TOTAL_STEPS, step)))
  localStorage.setItem(TUTORIAL_STEP_KEY, next)
  sessionStorage.removeItem(TUTORIAL_STEP_KEY)
}

export function isTutorialDone() {
  return getTutorialStep() >= TUTORIAL_TOTAL_STEPS
}

export function isSectionUnlocked(section: AppSection, step = getTutorialStep()) {
  if (step >= TUTORIAL_TOTAL_STEPS) return true
  return step >= SECTION_UNLOCK_STEP[section]
}

/** First-run only. Do not call this when the user already finished or skipped. */
export function resetTutorial() {
  localStorage.setItem(TUTORIAL_STEP_KEY, '0')
  sessionStorage.removeItem(TUTORIAL_STEP_KEY)
}
