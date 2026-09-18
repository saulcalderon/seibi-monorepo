import { useEffect, useRef, useState } from 'react'
import {
  isMaintQuizReady,
  majorityUnknown,
  MAINT_QUIZ,
  MAINT_WHEN_OPTIONS,
  quizNoteKey,
  type MaintQuizAnswers,
  type MaintQuizQuestion,
} from '../lib/vehicleMaintQuiz'
import { StarterCareGrid } from './StarterCareGrid'
import * as m from '../paraglide/messages.js'

type Phase = 'loading' | 'quiz' | 'recommend' | 'adding'
type LoadBeat = 'spin' | 'done'

const LOAD_SPIN_MS = 3400
const LOAD_DONE_MS = 1200
const ADD_SPIN_MS = 1800
const ADD_DONE_MS = 2000

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

function floatLabel(adding: boolean, spinning: boolean) {
  if (spinning) {
    return adding ? m.save_recommend_adding() : m.save_loading_title()
  }
  return adding ? m.save_recommend_added() : m.save_check_title()
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

function QuizField({
  question,
  answers,
  open,
  onToggle,
  onChange,
}: {
  question: MaintQuizQuestion
  answers: MaintQuizAnswers
  open: boolean
  onToggle: () => void
  onChange: (patch: MaintQuizAnswers) => void
}) {
  const note = answers[quizNoteKey(question.id)] ?? ''
  const picked = answers[question.id] ?? ''
  const preview = picked ? whenLabel(picked) : m.save_quiz_choice_empty()

  return (
    <article className={`know-quiz-card${open ? ' is-open' : ''}`}>
      <h2 className="text-[0.95rem] font-semibold text-coal">
        {quizTitle(question.titleKey)}
      </h2>
      {question.kind === 'open' ? (
        <textarea
          className="know-quiz-note mt-3"
          value={note}
          rows={2}
          placeholder={m.save_quiz_other_placeholder()}
          onChange={(event) => onChange({ [quizNoteKey(question.id)]: event.target.value })}
        />
      ) : (
        <div className="know-quiz-field mt-3">
          <button
            type="button"
            className={`know-quiz-pick${picked ? ' is-picked' : ''}`}
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={onToggle}
          >
            <span>{preview}</span>
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
                  onClick={() => onChange({ [question.id]: option.id })}
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
}

export function VehicleSaveFollowup({
  onCancel,
  onReady,
  onComplete,
}: {
  onCancel: () => void
  onReady: () => void
  onComplete: (recommendMinor: boolean, answers?: MaintQuizAnswers) => void
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [phaseDir, setPhaseDir] = useState<'forward' | 'back'>('forward')
  const [loadBeat, setLoadBeat] = useState<LoadBeat>('spin')
  const [openChoice, setOpenChoice] = useState<string | null>(null)
  const [answers, setAnswers] = useState<MaintQuizAnswers>({})
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const answersRef = useRef(answers)
  answersRef.current = answers

  useEffect(() => {
    onReadyRef.current()
  }, [])

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

  useEffect(() => {
    if (phase !== 'loading' && phase !== 'adding') return
    const reduce = prefersReducedMotion()
    const spinMs = phase === 'adding' ? ADD_SPIN_MS : LOAD_SPIN_MS
    const doneMs = phase === 'adding' ? ADD_DONE_MS : LOAD_DONE_MS
    if (loadBeat === 'spin') {
      const timer = window.setTimeout(() => setLoadBeat('done'), reduce ? 350 : spinMs)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      if (phase === 'adding') {
        onCompleteRef.current(true, answersRef.current)
        return
      }
      setPhaseDir('forward')
      setPhase('quiz')
    }, reduce ? 250 : doneMs)
    return () => window.clearTimeout(timer)
  }, [phase, loadBeat])

  const quizReady = isMaintQuizReady(answers)

  function finishQuiz() {
    if (majorityUnknown(answers)) {
      setPhaseDir('forward')
      setPhase('recommend')
      return
    }
    onComplete(false, answers)
  }

  function goPhase(next: Phase, dir: 'forward' | 'back' = 'forward') {
    setPhaseDir(dir)
    setPhase(next)
  }

  function handleBack() {
    if (phase === 'loading' || phase === 'adding') return
    if (phase === 'recommend') {
      goPhase('quiz', 'back')
      return
    }
    if (phase === 'quiz') {
      setOpenChoice(null)
      onCancel()
    }
  }

  function skipQuiz() {
    onComplete(false)
  }

  function patchAnswers(patch: MaintQuizAnswers) {
    const closed = Object.keys(patch).some((key) => !key.endsWith('_note'))
    setAnswers((prev) => ({ ...prev, ...patch }))
    if (closed) setOpenChoice(null)
  }

  const spinning = loadBeat === 'spin'
  const adding = phase === 'adding'
  const showQuiz = phase === 'quiz'
  const showRecommend = phase === 'recommend'
  const showFloat = phase === 'loading' || phase === 'adding'
  const paneKey = showQuiz ? 'quiz' : 'recommend'
  const paneClass = `vehicle-setup-pane${phaseDir === 'back' ? ' is-back' : ''}`

  return (
    <div className="avisos-screen vehicle-setup-screen vehicle-save-followup">
      {showQuiz || phase === 'recommend' ? (
        <header className="avisos-header">
          <button type="button" className="avisos-back" onClick={handleBack}>
            {m.setup_back()}
          </button>
        </header>
      ) : null}

      {showQuiz || showRecommend ? (
      <div key={paneKey} className={paneClass}>
      {showQuiz ? (
        <>
          <h1 className="avisos-title vehicle-save-form-title">{m.save_quiz_title()}</h1>
          <div className="vehicle-save-form mt-6 flex flex-col gap-4 pb-4">
            {MAINT_QUIZ.map((question) => (
              <QuizField
                key={question.id}
                question={question}
                answers={answers}
                open={openChoice === question.id}
                onToggle={() =>
                  setOpenChoice((current) => (current === question.id ? null : question.id))
                }
                onChange={patchAnswers}
              />
            ))}
          </div>
          <button
            type="button"
            className="vehicle-setup-cta"
            disabled={!quizReady}
            onClick={finishQuiz}
          >
            {m.setup_next()}
          </button>
          <button type="button" className="vehicle-save-skip" onClick={skipQuiz}>
            {m.save_quiz_skip()}
          </button>
        </>
      ) : null}

      {showRecommend ? (
        <>
          <h1 className="avisos-title vehicle-save-form-title">{m.save_recommend_title()}</h1>
          <StarterCareGrid />
          <button
            type="button"
            className="vehicle-setup-cta"
            onClick={() => {
              setLoadBeat('spin')
              goPhase('adding')
            }}
          >
            {m.save_recommend_cta()}
          </button>
        </>
      ) : null}
      </div>
      ) : null}

      {showFloat ? (
        <div className="vehicle-save-float" role="status" aria-live="polite">
          <div className={`vehicle-save-float-card${spinning ? '' : ' is-done'}`}>
            {spinning ? (
              <span className="vehicle-save-spinner" aria-hidden="true" />
            ) : (
              <span className="vehicle-save-check-ring" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />
                </svg>
              </span>
            )}
            <p
              className={
                adding && !spinning
                  ? 'vehicle-save-check-label is-long'
                  : 'vehicle-save-check-label'
              }
            >
              {floatLabel(adding, spinning)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
