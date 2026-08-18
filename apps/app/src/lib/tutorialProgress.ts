const TUTORIAL_STEP_KEY = 'seibi-tutorial-step'

/** 0 = welcome, 1–5 = section unlocks, 6 = finished */
export const TUTORIAL_TOTAL_STEPS = 6

export type AppSection =
  | 'vehiculo'
  | 'kilometraje'
  | 'servicios'
  | 'recordatorios'
  | 'estimados'

/** Step at which each section becomes unlocked (inclusive). */
export const SECTION_UNLOCK_STEP: Record<AppSection, number> = {
  vehiculo: 1,
  kilometraje: 2,
  servicios: 3,
  recordatorios: 4,
  estimados: 5,
}

export function getTutorialStep(): number {
  const raw = sessionStorage.getItem(TUTORIAL_STEP_KEY)
  if (raw === null) return 0
  const step = Number(raw)
  return Number.isFinite(step) ? Math.max(0, Math.min(TUTORIAL_TOTAL_STEPS, step)) : 0
}

export function setTutorialStep(step: number) {
  sessionStorage.setItem(
    TUTORIAL_STEP_KEY,
    String(Math.max(0, Math.min(TUTORIAL_TOTAL_STEPS, step))),
  )
}

export function isTutorialDone() {
  return getTutorialStep() >= TUTORIAL_TOTAL_STEPS
}

export function isSectionUnlocked(section: AppSection, step = getTutorialStep()) {
  if (step >= TUTORIAL_TOTAL_STEPS) return true
  return step >= SECTION_UNLOCK_STEP[section]
}

export function resetTutorial() {
  sessionStorage.setItem(TUTORIAL_STEP_KEY, '0')
}
