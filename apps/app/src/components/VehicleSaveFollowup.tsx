import { useEffect, useRef, useState } from 'react'
import {
  isMaintQuizReady,
  isQuizAnswered,
  majorityUnknown,
  MAINT_QUIZ,
  MAINT_WHEN_OPTIONS,
  quizNoteKey,
  type MaintQuizAnswers,
  type MaintQuizQuestion,
} from '../lib/vehicleMaintQuiz'
import * as m from '../paraglide/messages.js'

type Phase = 'loading' | 'ask' | 'quiz' | 'recommend' | 'adding'
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
  index,
  answers,
  open,
  onToggle,
  onChange,
}: {
  question: MaintQuizQuestion
  index: number
  answers: MaintQuizAnswers
  open: boolean
  onToggle: () => void
  onChange: (patch: MaintQuizAnswers) => void
}) {
  const note = answers[quizNoteKey(question.id)] ?? ''
  const picked = answers[question.id] ?? ''
  const done = isQuizAnswered(answers, question.id)
  const preview = picked ? whenLabel(picked) : m.save_quiz_choice_empty()

  return (
    <article className={`vehicle-save-q${done ? ' is-done' : ''}`}>
      <header className="vehicle-save-q-head">
        <span className="vehicle-save-q-num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="vehicle-save-q-title">{quizTitle(question.titleKey)}</h2>
      </header>

      <label className="vehicle-save-quiz-write">
        <span className="vehicle-edit-label">{m.save_quiz_write_label()}</span>
        <textarea
          className="vehicle-save-open"
          value={note}
          onChange={(event) =>
            onChange({ [quizNoteKey(question.id)]: event.target.value })
          }
          placeholder={
            question.kind === 'open'
              ? m.save_quiz_other_placeholder()
              : m.save_quiz_write_placeholder()
          }
          rows={1}
        />
      </label>

      {question.kind === 'choice' ? (
        <div className="vehicle-save-choices">
          <p className="vehicle-edit-label">{m.save_quiz_choice_label()}</p>
          <button
            type="button"
            className={`vehicle-save-choices-tab${open ? ' is-open' : ''}${
              picked ? ' is-picked' : ''
            }`}
            aria-expanded={open}
            onClick={onToggle}
          >
            <span>
              <strong>{preview}</strong>
            </span>
            <span className="vehicle-save-choices-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
          {open ? (
            <div className="vehicle-save-choices-list" role="listbox">
              {MAINT_WHEN_OPTIONS.map((option) => {
                const selected = picked === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`vehicle-save-choices-option${selected ? ' is-on' : ''}`}
                    onClick={() => onChange({ [question.id]: option.id })}
                  >
                    {whenLabel(option.id)}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
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
  const [phase, setPhase] = useState<Phase>('ask')
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
      onCompleteRef.current(false)
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
    if (phase === 'ask') {
      onCancel()
      return
    }
    if (phase === 'quiz') {
      setOpenChoice(null)
      goPhase('ask', 'back')
    }
  }

  function patchAnswers(patch: MaintQuizAnswers) {
    const closed = Object.keys(patch).some((key) => !key.endsWith('_note'))
    setAnswers((prev) => ({ ...prev, ...patch }))
    if (closed) setOpenChoice(null)
  }

  const spinning = loadBeat === 'spin'
  const adding = phase === 'adding'
  const showAsk = phase === 'ask' || phase === 'loading'
  const showQuiz = phase === 'quiz'
  const showRecommend = phase === 'recommend' || phase === 'adding'
  const showFloat = phase === 'loading' || phase === 'adding'
  const paneKey = showAsk ? 'ask' : showQuiz ? 'quiz' : 'recommend'
  const paneClass = `vehicle-setup-pane${phaseDir === 'back' ? ' is-back' : ''}`

  return (
    <div className="avisos-screen vehicle-setup-screen vehicle-save-followup">
      {showAsk || showQuiz ? (
        <header className="avisos-header">
          <button type="button" className="avisos-back" onClick={handleBack}>
            {m.setup_back()}
          </button>
        </header>
      ) : null}

      <div key={paneKey} className={paneClass}>
      {showAsk ? (
        <div className="vehicle-save-ask">
          <span className="vehicle-save-ask-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M8.2 12.2l2.6 2.6 5-5.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="avisos-title">{m.save_ask_title()}</h1>
          <p className="avisos-context">{m.save_ask_desc()}</p>
          <div className="vehicle-save-ask-pills">
            <button
              type="button"
              className="vehicle-save-ask-btn is-yes"
              onClick={() => {
                setLoadBeat('spin')
                goPhase('loading')
              }}
            >
              {m.save_ask_yes()}
            </button>
            <button
              type="button"
              className="vehicle-save-ask-btn is-no"
              onClick={() => {
                setOpenChoice(null)
                goPhase('quiz')
              }}
            >
              {m.save_ask_no()}
            </button>
          </div>
        </div>
      ) : null}

      {showQuiz ? (
        <>
          <p className="avisos-eyebrow">{m.save_quiz_eyebrow()}</p>
          <h1 className="avisos-title vehicle-save-form-title">{m.save_quiz_title()}</h1>
          <p className="avisos-context vehicle-save-form-lead">{m.save_quiz_desc()}</p>
          <div className="vehicle-setup-body vehicle-save-quiz vehicle-save-form">
            {MAINT_QUIZ.map((question, index) => (
              <QuizField
                key={question.id}
                question={question}
                index={index}
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
        </>
      ) : null}

      {showRecommend ? (
        <div className="vehicle-save-priority">
          <div className="vehicle-save-priority-card">
            <p className="avisos-eyebrow">{m.save_quiz_eyebrow()}</p>
            <h1 className="avisos-title vehicle-save-priority-title">
              {m.save_recommend_title()}
            </h1>
            <p className="avisos-context">{m.save_recommend_desc()}</p>
            <button
              type="button"
              className="vehicle-save-ask-btn is-yes"
              onClick={() => {
                setLoadBeat('spin')
                goPhase('adding')
              }}
            >
              {m.save_recommend_cta()}
            </button>
          </div>
        </div>
      ) : null}
      </div>

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
