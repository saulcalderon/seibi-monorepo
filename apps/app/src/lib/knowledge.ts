import type { MaintenanceTask } from './tasks'

export type KnowledgeLevel = 'none' | 'basic' | 'intermediate' | 'advanced'

export const KNOWLEDGE_LEVELS: Array<{
  id: KnowledgeLevel
  title: string
  description: string
}> = [
  {
    id: 'none',
    title: 'No sé nada de carros',
    description: 'Quiero que Seibi me guíe paso a paso, sin palabras técnicas.',
  },
  {
    id: 'basic',
    title: 'Sé lo básico',
    description: 'Sé cuándo toca el aceite o revisar las llantas.',
  },
  {
    id: 'intermediate',
    title: 'Me defiendo bien',
    description: 'Conozco las piezas principales y hablo con el mecánico sin problema.',
  },
  {
    id: 'advanced',
    title: 'Sé bastante de mecánica',
    description: 'Hago mantenimiento yo mismo o conozco especificaciones y repuestos.',
  },
]

export function levelTitle(level: KnowledgeLevel | null | undefined) {
  return KNOWLEDGE_LEVELS.find((l) => l.id === level)?.title ?? 'Sin definir'
}

/**
 * How the UI adapts to the Knowledge level. It changes words, explanations,
 * and form detail; never the data or the Reminders (CONTEXT.md).
 */
export function knowledgeProfile(level: KnowledgeLevel | null | undefined) {
  const l = level ?? 'basic'
  const guided = l === 'none' || l === 'basic'
  return {
    level: l,
    /** Show "¿Qué es esto?" explanations next to task names. */
    explain: guided,
    /** Prefer everyday names ("Aceite de la caja") over technical ones. */
    plainNames: guided,
    /** Show part brand, part number, per-item cost, and schedule details. */
    detailed: l === 'intermediate' || l === 'advanced',
    /** Show severe-schedule notes and interval numbers everywhere. */
    technical: l === 'advanced',
  }
}

export type KnowledgeProfile = ReturnType<typeof knowledgeProfile>

export function taskLabel(task: MaintenanceTask | undefined, code: string, k: KnowledgeProfile) {
  if (!task) return code
  return k.plainNames ? task.plainName : task.name
}

/**
 * Three short check questions that calibrate the self-assessment.
 * The correct answers are widely documented basics, not Seibi data.
 */
export const CHECK_QUESTIONS: Array<{
  id: string
  question: string
  options: Array<{ text: string; correct: boolean }>
}> = [
  {
    id: 'oil_light',
    question: 'Se enciende en el tablero una luz con forma de aceitera. ¿Qué significa?',
    options: [
      { text: 'Baja presión o bajo nivel de aceite del motor', correct: true },
      { text: 'Que la batería está descargada', correct: false },
      { text: 'Que toca revisar los frenos', correct: false },
      { text: 'No sé', correct: false },
    ],
  },
  {
    id: 'viscosity',
    question: 'En un aceite “5W-30”, ¿qué indican esos números?',
    options: [
      { text: 'La viscosidad del aceite en frío y en caliente', correct: true },
      { text: 'Los litros que lleva el motor', correct: false },
      { text: 'La marca y el lote del aceite', correct: false },
      { text: 'No sé', correct: false },
    ],
  },
  {
    id: 'timing_belt',
    question: '¿Qué puede pasar si se rompe la banda de distribución en un motor de interferencia?',
    options: [
      { text: 'Las válvulas y pistones pueden chocar y dañar el motor', correct: true },
      { text: 'Solo deja de funcionar el aire acondicionado', correct: false },
      { text: 'Se descarga la batería más rápido', correct: false },
      { text: 'No sé', correct: false },
    ],
  },
]

const ORDER: KnowledgeLevel[] = ['none', 'basic', 'intermediate', 'advanced']

/**
 * Final level: the average of the self-assessment and the check score
 * (0–3 correct maps to none…advanced), rounded down so Seibi explains a
 * little more rather than a little less.
 */
export function calibrateLevel(self: KnowledgeLevel, correct: number): KnowledgeLevel {
  const selfIndex = ORDER.indexOf(self)
  const checkIndex = Math.max(0, Math.min(3, correct))
  return ORDER[Math.floor((selfIndex + checkIndex) / 2)]
}
