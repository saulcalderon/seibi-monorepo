const FIRST_RUN_KEY = 'seibi-first-run'

export type KnowledgeProfile = 'none' | 'knows' | 'fair'

export type InterestId = 'reminders' | 'history' | 'services' | 'estimates'

export const INTEREST_IDS: InterestId[] = [
  'reminders',
  'history',
  'services',
  'estimates',
]

export type FirstRunProfile = {
  knowledge: KnowledgeProfile | null
  name: string
  interests: InterestId[]
}

const empty: FirstRunProfile = {
  knowledge: null,
  name: '',
  interests: [],
}

function isKnowledge(value: unknown): value is KnowledgeProfile {
  return value === 'none' || value === 'knows' || value === 'fair'
}

function isInterest(value: unknown): value is InterestId {
  return (
    value === 'reminders' ||
    value === 'history' ||
    value === 'services' ||
    value === 'estimates'
  )
}

export function getFirstRunProfile(): FirstRunProfile {
  try {
    const raw = localStorage.getItem(FIRST_RUN_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<FirstRunProfile>
    return {
      knowledge: isKnowledge(parsed.knowledge) ? parsed.knowledge : null,
      name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter(isInterest)
        : [],
    }
  } catch {
    return empty
  }
}

export function saveFirstRunProfile(patch: Partial<FirstRunProfile>): FirstRunProfile {
  const next = { ...getFirstRunProfile(), ...patch }
  if (typeof next.name === 'string') next.name = next.name.trim()
  if (next.knowledge && !isKnowledge(next.knowledge)) next.knowledge = null
  if (Array.isArray(next.interests)) next.interests = next.interests.filter(isInterest)
  localStorage.setItem(FIRST_RUN_KEY, JSON.stringify(next))
  return next
}

export function getFirstRunName() {
  const name = getFirstRunProfile().name.trim()
  return name.length > 0 ? name : null
}

/** Screens inside the Vehículo branch, after name and before intereses. */
export function pathQuestionCount(profile: KnowledgeProfile | null) {
  if (profile === 'knows') return 5
  if (profile === 'fair') return 6
  return 5
}

export function registroQuestionCount(profile: KnowledgeProfile | null) {
  return 2 + pathQuestionCount(profile) + 1
}

export function registroQuestionIndex(
  chapter: 'knowledge' | 'name' | 'path' | 'interests',
  profile: KnowledgeProfile | null,
  pathStep = 0,
) {
  if (chapter === 'knowledge') return 1
  if (chapter === 'name') return 2
  if (chapter === 'path') return 3 + pathStep
  return registroQuestionCount(profile)
}
