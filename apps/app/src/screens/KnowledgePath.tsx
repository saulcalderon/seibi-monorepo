import { useEffect, useState } from 'react'
import { BrandSearchField, ModelSearchField } from '../components/BrandSearchField'
import { MileageUnitBox } from '../components/MileageUnitBox'
import { SetupOptionButton } from '../components/SetupOptionButton'
import { SetupPhaseShell } from '../components/SetupPhaseShell'
import { StarterCareGrid } from '../components/StarterCareGrid'
import {
  addVehicle,
  getActiveVehicle,
  mileageToKm,
  modelBelongsToBrand,
  resolveBrandName,
  type MileageUnit,
  type VehicleBrandOption,
} from '../lib/vehicleProfile'
import { addVehicleReminder } from '../lib/reminders'
import {
  applyMaintQuizToVehicle,
  isMaintQuizReady,
  majorityUnknown,
  MAINT_QUIZ,
  MAINT_WHEN_OPTIONS,
  quizNoteKey,
  type MaintQuizAnswers,
} from '../lib/vehicleMaintQuiz'
import { pathQuestionCount, type KnowledgeProfile } from '../lib/firstRunProfile'
import * as m from '../paraglide/messages.js'

type VehicleDraft = {
  brand: string
  brandOther: string
  model: string
  year: string
  mileage: string
  mileageUnit: MileageUnit
}

const emptyDraft: VehicleDraft = {
  brand: '',
  brandOther: '',
  model: '',
  year: '',
  mileage: '',
  mileageUnit: 'km',
}

const LAST_SERVICE = [
  { id: 'recent', label: () => m.setup_5_opt_recent() },
  { id: 'mid', label: () => m.setup_5_opt_mid() },
  { id: 'year', label: () => m.setup_5_opt_year() },
  { id: 'old', label: () => m.setup_5_opt_old() },
  { id: 'unknown', label: () => m.setup_5_opt_unknown() },
] as const

const SIMPLE_WHEN = [
  { id: 'month', label: () => m.know_when_recent() },
  { id: 'six', label: () => m.know_when_mid() },
  { id: 'unknown', label: () => m.know_when_unknown() },
] as const

function vehicleReady(step: number, draft: VehicleDraft) {
  switch (step) {
    case 0:
      return draft.brand === 'other'
        ? draft.brandOther.trim().length > 1
        : draft.brand.length > 0
    case 1:
      return draft.model.trim().length > 1
    case 2: {
      const year = Number(draft.year)
      return Number.isInteger(year) && year >= 1980 && year <= new Date().getFullYear() + 1
    }
    case 3: {
      if (!draft.mileage.trim()) return false
      const km = mileageToKm(draft.mileage, draft.mileageUnit)
      return Number.isFinite(km) && km >= 0 && km < 2_000_000
    }
    default:
      return false
  }
}

export type FirstRunVehicleDraft = VehicleDraft

export function saveFirstRunVehicle(draft: VehicleDraft, quiz?: MaintQuizAnswers) {
  const next = addVehicle({
    brand: resolveBrandName(draft.brand, draft.brandOther),
    model: draft.model.trim(),
    year: draft.year,
    mileage: draft.mileage,
    mileageUnit: draft.mileageUnit,
    placa: '',
  })
  const vehicle = getActiveVehicle(next)
  if (!vehicle || !quiz) return
  applyMaintQuizToVehicle(vehicle, quiz)
  if (!majorityUnknown(quiz)) return
  addVehicleReminder({
    vehicleId: vehicle.id,
    id: 'review-general',
    name: m.save_recommend_item(),
    meta: m.save_recommend_item_meta(),
    due: m.home_avisos_urgent(),
  })
}

function whenLabel(id: string) {
  switch (id) {
    case 'week':
      return m.save_quiz_when_week()
    case 'month':
      return m.save_quiz_when_month()
    case 'six':
      return m.save_quiz_when_six()
    case 'year':
      return m.save_quiz_when_year()
    case 'more':
      return m.save_quiz_when_more()
    default:
      return m.save_quiz_when_unknown()
  }
}

function quizTitle(key: (typeof MAINT_QUIZ)[number]['titleKey']) {
  switch (key) {
    case 'save_quiz_oil':
      return m.save_quiz_oil()
    case 'save_quiz_brakes':
      return m.save_quiz_brakes()
    case 'save_quiz_tires':
      return m.save_quiz_tires()
    case 'save_quiz_filter':
      return m.save_quiz_filter()
    case 'save_quiz_other':
      return m.save_quiz_other()
  }
}

type PathIconId =
  | 'brand'
  | 'model'
  | 'year'
  | 'km'
  | 'oil'
  | 'brakes'
  | 'tires'
  | 'filter'
  | 'service'
  | 'quiz'

const VEHICLE_ICONS: PathIconId[] = ['brand', 'model', 'year', 'km']

function PathGlyph({ id }: { id: PathIconId }) {
  switch (id) {
    case 'brand':
      return (
        <path
          d="M4.5 14.2l1.1-3.2A2.4 2.4 0 017.9 9.2h8.2a2.4 2.4 0 012.3 1.8l1.1 3.2M3.8 14.2h16.4v2.6a1.1 1.1 0 01-1.1 1.1H4.9a1.1 1.1 0 01-1.1-1.1v-2.6zM8.2 9.2l.7-1.9h6.2l.7 1.9"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      )
    case 'model':
      return (
        <>
          <circle cx="8" cy="16" r="1.7" />
          <circle cx="16" cy="16" r="1.7" />
          <path
            d="M4.2 16H6.2M9.8 16h4.4M17.8 16h2M5 16l1.2-4.2A2 2 0 018.1 10.2h7.8a2 2 0 011.9 1.5L19 16"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    case 'year':
      return (
        <>
          <rect x="4.5" y="5.5" width="15" height="14" rx="2" strokeWidth="1.7" />
          <path d="M4.5 9.5h15M8 4.5v3M16 4.5v3" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )
    case 'km':
      return (
        <>
          <circle cx="12" cy="12" r="7.4" strokeWidth="1.7" />
          <path d="M12 12l4-2.4M12 7.2v1.6" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )
    case 'oil':
      return (
        <path
          d="M12 3.2S6.8 10 6.8 14a5.2 5.2 0 0010.4 0C17.2 10 12 3.2 12 3.2z"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      )
    case 'brakes':
      return (
        <>
          <circle cx="12" cy="12" r="7.2" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3" strokeWidth="1.7" />
        </>
      )
    case 'tires':
      return (
        <>
          <circle cx="12" cy="12" r="7.4" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="2.3" strokeWidth="1.7" />
          <path
            d="M12 4.6v2.3M12 17.1v2.3M4.6 12h2.3M17.1 12h2.3"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )
    case 'filter':
      return (
        <>
          <rect x="4.8" y="6" width="14.4" height="12" rx="2" strokeWidth="1.7" />
          <path
            d="M8.2 8.3v7.4M10.7 8.3v7.4M13.3 8.3v7.4M15.8 8.3v7.4"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )
    case 'service':
      return (
        <path
          d="M14.8 6.2a3.4 3.4 0 014 4L13 16l-3.2.6.6-3.2 5.8-5.8zM5.5 18.2h6"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'quiz':
      return (
        <>
          <rect x="6" y="4.5" width="12" height="15" rx="2" strokeWidth="1.7" />
          <path d="M9 9h6M9 12.5h6M9 16h3.5" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )
  }
}

function PathHead({
  icon,
  title,
  desc,
}: {
  icon: PathIconId
  title: string
  desc?: string
}) {
  return (
    <div className="know-q-head">
      <span className="know-q-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <PathGlyph id={icon} />
        </svg>
      </span>
      <h1 className="know-q-title">{title}</h1>
      {desc ? <p className="know-q-desc">{desc}</p> : null}
    </div>
  )
}

function VehicleField({
  step,
  draft,
  setDraft,
}: {
  step: number
  draft: VehicleDraft
  setDraft: (next: VehicleDraft) => void
}) {
  const titles = [m.setup_1_title(), m.setup_2_title(), m.setup_3_title(), m.setup_4_title()]

  return (
    <>
      <PathHead icon={VEHICLE_ICONS[step]} title={titles[step]} />
      <div className="mt-8">
        {step === 0 ? (
          <BrandSearchField
            brand={(draft.brand as VehicleBrandOption | '') || ''}
            brandOther={draft.brandOther}
            autoFocus
            onChange={(next) =>
              setDraft({
                ...draft,
                ...next,
                model: modelBelongsToBrand(draft.model, next.brand) ? draft.model : '',
              })
            }
          />
        ) : null}
        {step === 1 ? (
          <ModelSearchField
            brand={draft.brand === 'other' ? draft.brandOther : draft.brand}
            value={draft.model}
            onChange={(model) => setDraft({ ...draft, model })}
            autoFocus
          />
        ) : null}
        {step === 2 ? (
          <input
            value={draft.year}
            onChange={(event) =>
              setDraft({ ...draft, year: event.target.value.replace(/\D/g, '').slice(0, 4) })
            }
            placeholder={m.setup_3_placeholder()}
            inputMode="numeric"
            autoFocus
            className="w-full rounded-2xl border border-coal/8 bg-pure px-5 py-4 text-[1rem] text-coal shadow-[0_2px_12px_rgba(20,21,23,0.06)] outline-none placeholder:text-coal/35 focus:border-radiant/40"
          />
        ) : null}
        {step === 3 ? (
          <div className="relative has-unit">
            <input
              value={draft.mileage}
              onChange={(event) =>
                setDraft({ ...draft, mileage: event.target.value.replace(/[^\d]/g, '') })
              }
              placeholder={m.setup_4_placeholder()}
              inputMode="numeric"
              autoFocus
              className="w-full rounded-2xl border border-coal/8 bg-pure px-5 py-4 pr-[8.6rem] text-[1rem] text-coal shadow-[0_2px_12px_rgba(20,21,23,0.06)] outline-none placeholder:text-coal/35 focus:border-radiant/40"
            />
            <MileageUnitBox
              unit={draft.mileageUnit}
              onChange={(mileageUnit) => setDraft({ ...draft, mileageUnit })}
            />
          </div>
        ) : null}
      </div>
    </>
  )
}

export function KnowledgePath({
  profile,
  onBack,
  onFinish,
}: {
  profile: KnowledgeProfile
  onBack: () => void
  onFinish: (draft: VehicleDraft, quiz?: MaintQuizAnswers) => void
}) {
  const total = pathQuestionCount(profile)
  const [step, setStep] = useState(() => {
    if (typeof window === 'undefined') return 0
    return new URLSearchParams(window.location.search).get('phase') === 'quiz' ? 4 : 0
  })
  const [draft, setDraft] = useState<VehicleDraft>(emptyDraft)
  const [lastService, setLastService] = useState('')
  const [fairOil, setFairOil] = useState('')
  const [quiz, setQuiz] = useState<MaintQuizAnswers>({})
  const [openChoice, setOpenChoice] = useState<string | null>(null)
  const [showRecommend, setShowRecommend] = useState(false)

  useEffect(() => {
    if (!openChoice) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.know-quiz-card.is-open')) return
      setOpenChoice(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openChoice])

  const inVehicle = step < 4
  const extraIndex = step - 4

  function ready() {
    if (showRecommend) return true
    if (inVehicle) return vehicleReady(step, draft)
    if (profile === 'none') return true
    if (profile === 'fair') return extraIndex === 0 ? lastService.length > 0 : fairOil.length > 0
    return isMaintQuizReady(quiz)
  }

  function finish() {
    let answers: MaintQuizAnswers | undefined
    if (profile === 'knows') answers = quiz
    if (profile === 'fair' && fairOil) answers = { oil: fairOil }
    onFinish(draft, answers)
  }

  function handleNext() {
    if (!ready()) return
    if (
      profile === 'knows' &&
      step >= total - 1 &&
      !showRecommend &&
      majorityUnknown(quiz)
    ) {
      setShowRecommend(true)
      return
    }
    if (step >= total - 1 || showRecommend) {
      finish()
      return
    }
    setStep((current) => current + 1)
  }

  function handleBack() {
    if (showRecommend) {
      setShowRecommend(false)
      return
    }
    if (step === 0) {
      onBack()
      return
    }
    setStep((current) => current - 1)
  }

  return (
    <SetupPhaseShell
      registro="path"
      profile={profile}
      pathStep={step}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={showRecommend ? m.save_recommend_cta() : undefined}
      nextDisabled={!ready()}
    >
      {inVehicle ? (
        <VehicleField step={step} draft={draft} setDraft={setDraft} />
      ) : null}

      {profile === 'none' && !inVehicle ? (
        <>
          <PathHead icon="service" title={m.know_none_title()} desc={m.know_none_desc()} />
          <StarterCareGrid />
        </>
      ) : null}

      {profile === 'fair' && !inVehicle && extraIndex === 0 ? (
        <div className="know-stage">
          <PathHead icon="service" title={m.setup_5_title()} />
          <div className="flex flex-1 flex-col justify-center gap-2.5" role="radiogroup" aria-label={m.setup_5_title()}>
            {LAST_SERVICE.map((option) => (
              <SetupOptionButton
                key={option.id}
                selected={lastService === option.id}
                onClick={() => setLastService(option.id)}
              >
                {option.label()}
              </SetupOptionButton>
            ))}
          </div>
        </div>
      ) : null}

      {profile === 'fair' && !inVehicle && extraIndex === 1 ? (
        <div className="know-stage">
          <PathHead icon="oil" title={m.know_lesson_oil_title()} />
          <div className="flex flex-1 flex-col justify-center gap-2.5" role="radiogroup" aria-label={m.know_lesson_oil_title()}>
            {SIMPLE_WHEN.map((option) => (
              <SetupOptionButton
                key={option.id}
                selected={fairOil === option.id}
                onClick={() => setFairOil(option.id)}
              >
                {option.label()}
              </SetupOptionButton>
            ))}
          </div>
        </div>
      ) : null}

      {profile === 'knows' && !inVehicle && showRecommend ? (
        <>
          <PathHead
            icon="service"
            title={m.save_recommend_title()}
            desc={m.save_recommend_desc()}
          />
          <StarterCareGrid />
        </>
      ) : null}

      {profile === 'knows' && !inVehicle && !showRecommend ? (
        <>
          <PathHead icon="quiz" title={m.know_knows_title()} />
          <div className="mt-6 flex flex-col gap-4 pb-4">
            {MAINT_QUIZ.map((question) => {
              const note = quiz[quizNoteKey(question.id)] ?? ''
              const picked = quiz[question.id] ?? ''
              const open = openChoice === question.id
              return (
                <article
                  key={question.id}
                  className={`know-quiz-card${open ? ' is-open' : ''}`}
                >
                  <h2 className="text-[0.95rem] font-semibold text-coal">
                    {quizTitle(question.titleKey)}
                  </h2>
                  {question.kind === 'open' ? (
                    <textarea
                      className="know-quiz-note mt-3"
                      value={note}
                      rows={2}
                      placeholder={m.save_quiz_other_placeholder()}
                      onChange={(event) =>
                        setQuiz((current) => ({
                          ...current,
                          [quizNoteKey(question.id)]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <div className="know-quiz-field mt-3">
                      <button
                        type="button"
                        className={`know-quiz-pick${picked ? ' is-picked' : ''}`}
                        aria-expanded={open}
                        aria-haspopup="listbox"
                        onClick={() =>
                          setOpenChoice((current) =>
                            current === question.id ? null : question.id,
                          )
                        }
                      >
                        <span>{picked ? whenLabel(picked) : m.save_quiz_choice_empty()}</span>
                      </button>
                      {open ? (
                        <div className="know-quiz-menu" role="listbox">
                          {MAINT_WHEN_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              role="option"
                              aria-selected={picked === option.id}
                              className={`know-quiz-option${picked === option.id ? ' is-on' : ''}`}
                              onClick={() => {
                                setQuiz((current) => ({ ...current, [question.id]: option.id }))
                                setOpenChoice(null)
                              }}
                            >
                              {whenLabel(option.id)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </>
      ) : null}
    </SetupPhaseShell>
  )
}
