/** Banco provisional de mantenimiento básico. Denny pasará el banco final después. */

import { addLoggedService } from './services'
import { mileageToKm, type VehicleProfile } from './vehicleProfile'

export type MaintWhenId = 'week' | 'month' | 'six' | 'year' | 'more' | 'unknown'

export type MaintQuizQuestion =
  | { id: string; kind: 'choice'; titleKey: QuizTitleKey }
  | { id: string; kind: 'open'; titleKey: QuizTitleKey; placeholderKey: 'save_quiz_other_placeholder' }

type QuizTitleKey =
  | 'save_quiz_oil'
  | 'save_quiz_brakes'
  | 'save_quiz_tires'
  | 'save_quiz_filter'
  | 'save_quiz_other'

export const MAINT_WHEN_OPTIONS: { id: MaintWhenId; labelKey: string }[] = [
  { id: 'week', labelKey: 'save_quiz_when_week' },
  { id: 'month', labelKey: 'save_quiz_when_month' },
  { id: 'six', labelKey: 'save_quiz_when_six' },
  { id: 'year', labelKey: 'save_quiz_when_year' },
  { id: 'more', labelKey: 'save_quiz_when_more' },
  { id: 'unknown', labelKey: 'save_quiz_when_unknown' },
]

export const MAINT_QUIZ: MaintQuizQuestion[] = [
  { id: 'oil', kind: 'choice', titleKey: 'save_quiz_oil' },
  { id: 'brakes', kind: 'choice', titleKey: 'save_quiz_brakes' },
  { id: 'tires', kind: 'choice', titleKey: 'save_quiz_tires' },
  { id: 'filter', kind: 'choice', titleKey: 'save_quiz_filter' },
  { id: 'other', kind: 'open', titleKey: 'save_quiz_other', placeholderKey: 'save_quiz_other_placeholder' },
]

export type MaintQuizAnswers = Record<string, string>

export function quizNoteKey(id: string) {
  return `${id}_note`
}

export function isQuizAnswered(answers: MaintQuizAnswers, id: string) {
  const wrote = String(answers[quizNoteKey(id)] ?? '').trim().length > 0
  return wrote || Boolean(answers[id])
}

export function isMaintQuizReady(answers: MaintQuizAnswers) {
  return MAINT_QUIZ.filter((item) => item.kind === 'choice').every((item) =>
    isQuizAnswered(answers, item.id),
  )
}

export function majorityUnknown(answers: MaintQuizAnswers) {
  const ids = MAINT_QUIZ.map((item) => item.id)
  if (ids.length === 0) return false
  const unknown = ids.filter((id) => {
    const wrote = String(answers[quizNoteKey(id)] ?? '').trim().length > 0
    return answers[id] === 'unknown' && !wrote
  }).length
  return unknown * 2 >= ids.length
}

const WHEN_DAYS: Record<MaintWhenId, number | null> = {
  week: 7,
  month: 30,
  six: 183,
  year: 365,
  more: 500,
  unknown: null,
}

const KM_PER_DAY = 40

function daysForWhen(id: string | undefined) {
  if (!id || !(id in WHEN_DAYS)) return null
  return WHEN_DAYS[id as MaintWhenId]
}

function quizServiceName(id: string) {
  switch (id) {
    case 'oil':
      return 'Cambio de aceite'
    case 'brakes':
      return 'Revisión de frenos'
    case 'tires':
      return 'Rotación de llantas'
    case 'filter':
      return 'Filtro de aire'
    default:
      return ''
  }
}

/** Turns quiz answers into Servicios and resets Recordatorio dates. */
export function applyMaintQuizToVehicle(
  vehicle: VehicleProfile,
  answers: MaintQuizAnswers,
) {
  const km = mileageToKm(vehicle.mileage, vehicle.mileageUnit)

  for (const question of MAINT_QUIZ) {
    const when = answers[question.id]
    const note = String(answers[quizNoteKey(question.id)] ?? '').trim()
    const days = daysForWhen(when) ?? (note ? 30 : null)
    if (days == null) continue

    const name = question.kind === 'open' ? note : quizServiceName(question.id)
    if (!name) continue
    if (question.kind === 'choice' && when === 'unknown' && !note) continue

    const performedAt = Date.now() - days * 86_400_000
    const mileageAt = Math.max(0, Math.round(km - days * KM_PER_DAY))
    addLoggedService(vehicle.id, {
      name,
      mileage: String(mileageAt),
      performedAt,
      comment: question.kind === 'choice' ? note || undefined : undefined,
    })
  }
}
