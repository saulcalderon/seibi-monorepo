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
