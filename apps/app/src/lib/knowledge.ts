import type { MaintenanceTask } from './tasks'

export type KnowledgeLevel = 'none' | 'basic' | 'intermediate' | 'advanced'

export const KNOWLEDGE_LEVELS: Array<{
  id: KnowledgeLevel
  title: string
  description: string
}> = [
  {
    id: 'none',
    title: 'Estoy empezando',
    description: 'No conozco mucho de mecánica. Necesito que me expliquen paso a paso.',
  },
  {
    id: 'basic',
    title: 'Conozco lo básico',
    description: 'Sé cuándo cambiar el aceite, revisar llantas y hacer servicios básicos.',
  },
  {
    id: 'intermediate',
    title: 'Tengo experiencia',
    description: 'Conozco los componentes del vehículo y entiendo las recomendaciones del mecánico.',
  },
  {
    id: 'advanced',
    title: 'Tengo bastante conocimiento',
    description: 'Realizo algunos mantenimientos y conozco especificaciones y repuestos.',
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
 * Check questions that calibrate the self-assessment.
 * The correct answers are widely documented basics, not Seibi data.
 */
export const CHECK_QUESTIONS: Array<{
  id: string
  question: string
  mark?: 'coolant'
  options: Array<{ text: string; detail?: string; correct: boolean }>
}> = [
  {
    id: 'preventive',
    question: '¿Cuál es el principal objetivo del mantenimiento preventivo de un vehículo?',
    options: [
      {
        text: 'Evitar fallas antes de que ocurran',
        detail: 'Realizar revisiones y servicios periódicos para prevenir problemas y prolongar la vida útil del vehículo.',
        correct: true,
      },
      {
        text: 'Reparar el vehículo cuando deja de funcionar',
        detail: 'Esperar a que aparezcan fallas para llevarlo al taller y solucionar los problemas.',
        correct: false,
      },
      {
        text: 'Mejorar la apariencia del vehículo',
        detail: 'Mantener la pintura, carrocería e interiores en buenas condiciones.',
        correct: false,
      },
      {
        text: 'No sé',
        detail: 'No tengo conocimientos suficientes sobre mantenimiento preventivo.',
        correct: false,
      },
    ],
  },
  {
    id: 'care_habits',
    question: '¿Qué hábitos ayudan a mantener tu vehículo en buenas condiciones?',
    options: [
      {
        text: 'Realizar revisiones y mantener buenos hábitos de conducción',
        detail: 'Revisar llantas, fluidos, frenos y conducir evitando aceleraciones o frenadas bruscas.',
        correct: true,
      },
      {
        text: 'Utilizar el vehículo sin preocuparse por las revisiones',
        detail: 'Conducir normalmente y llevarlo al taller únicamente cuando presente algún problema.',
        correct: false,
      },
      {
        text: 'Lavar y mantener limpia la carrocería',
        detail: 'Cuidar principalmente la pintura, los interiores y la apariencia exterior del vehículo.',
        correct: false,
      },
      {
        text: 'No sé',
        detail: 'No tengo suficientes conocimientos sobre el cuidado adecuado de un vehículo.',
        correct: false,
      },
    ],
  },
  {
    id: 'coolant_light',
    question: '¿Qué significa esta luz en el tablero?',
    mark: 'coolant',
    options: [
      {
        text: 'Que el motor está sobrecalentándose',
        detail: 'La temperatura del refrigerante es demasiado alta y debes detenerte de forma segura para evitar daños al motor.',
        correct: true,
      },
      {
        text: 'Que el nivel de combustible está bajo',
        detail: 'Indica que queda poco combustible en el tanque y necesitas recargar.',
        correct: false,
      },
      {
        text: 'Que el aceite del motor necesita cambiarse',
        detail: 'Advierte que el aceite ha llegado al intervalo recomendado para su reemplazo.',
        correct: false,
      },
      {
        text: 'No sé',
        detail: 'No conozco el significado de esta señal del tablero.',
        correct: false,
      },
    ],
  },
]

const ORDER: KnowledgeLevel[] = ['none', 'basic', 'intermediate', 'advanced']

/**
 * Final level: the average of the self-assessment and the check score.
 * Right answers scale onto none…advanced and round down, so Seibi explains
 * a little more rather than a little less.
 */
export function calibrateLevel(self: KnowledgeLevel, correct: number): KnowledgeLevel {
  const selfIndex = ORDER.indexOf(self)
  const span = ORDER.length - 1
  const total = CHECK_QUESTIONS.length
  const answered = Math.max(0, Math.min(total, correct))
  const checkIndex = total === 0 ? 0 : Math.floor((answered / total) * span)
  return ORDER[Math.floor((selfIndex + checkIndex) / 2)]
}
