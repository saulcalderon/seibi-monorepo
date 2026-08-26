import { useState, type ReactNode } from 'react'
import * as m from '../paraglide/messages.js'

/**
 * Preguntas de mantenimiento — 3 pantallas tras el login (solo primera vez).
 */
const TOTAL = 3

const QUESTIONS = [
  {
    title: () => m.maint_1_title(),
    options: [
      { id: 'new', label: () => m.maint_1_opt_new() },
      { id: 'basic', label: () => m.maint_1_opt_basic() },
      { id: 'confident', label: () => m.maint_1_opt_confident() },
    ],
  },
  {
    title: () => m.maint_2_title(),
    options: [
      { id: 'weekly', label: () => m.maint_2_opt_weekly() },
      { id: 'monthly', label: () => m.maint_2_opt_monthly() },
      { id: 'service', label: () => m.maint_2_opt_service() },
      { id: 'rare', label: () => m.maint_2_opt_rare() },
    ],
  },
  {
    title: () => m.maint_3_title(),
    options: [
      { id: 'cost', label: () => m.maint_3_opt_cost() },
      { id: 'reminders', label: () => m.maint_3_opt_reminders() },
      { id: 'history', label: () => m.maint_3_opt_history() },
      { id: 'all', label: () => m.maint_3_opt_all() },
    ],
  },
] as const

interface MaintenanceQuestionsProps {
  onBack: () => void
  onFinish: () => void
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`setup-option setup-option--block${selected ? ' is-selected' : ''}`}
    >
      <span className="setup-option-fill" aria-hidden="true" />
      <span className="setup-option-label">{children}</span>
    </button>
  )
}

export function MaintenanceQuestions({
  onBack,
  onFinish,
}: MaintenanceQuestionsProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const selected = answers[step]
  const ready = selected.length > 0
  const isLast = step === TOTAL - 1
  const question = QUESTIONS[step]

  function handleSkip() {
    if (isLast) {
      onFinish()
      return
    }
    setStep((current) => Math.min(TOTAL - 1, current + 1))
  }

  function handleBack() {
    if (step === 0) {
      onBack()
      return
    }
    setStep((current) => Math.max(0, current - 1))
  }

  function handleNext() {
    if (!ready) return
    if (isLast) {
      onFinish()
      return
    }
    setStep((current) => Math.min(TOTAL - 1, current + 1))
  }

  return (
    <div className="flex h-full flex-col bg-fog">
      <header className="setup-header px-7 pt-13 pb-4">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-1 text-[0.78rem] font-medium text-black/45 transition-colors hover:text-black/75"
          >
            {m.setup_back()}
          </button>
          <div className="text-center">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-radiant uppercase">
              {m.maint_section()}
            </p>
            <p className="mt-0.5 text-[0.78rem] font-medium tracking-wide text-black/55">
              {m.maint_progress({
                current: String(step + 1),
                total: String(TOTAL),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1 text-[0.78rem] font-medium text-black/45 transition-colors hover:text-black/75"
          >
            {m.onboarding_skip()}
          </button>
        </div>

        <div
          className="setup-progress mt-4"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL}
          aria-valuenow={step + 1}
          aria-label={m.maint_progress({
            current: String(step + 1),
            total: String(TOTAL),
          })}
        >
          {Array.from({ length: TOTAL }).map((_, index) => (
            <span
              key={index}
              className={`setup-progress-seg${
                index < step ? ' is-done' : index === step ? ' is-current' : ''
              }`}
            />
          ))}
        </div>
      </header>

      <div key={step} className="setup-step flex flex-1 flex-col px-7 pt-4">
        <h1 className="text-[1.75rem] leading-tight tracking-tight text-coal">
          {question.title()}
        </h1>

        <div className="mt-8 flex flex-col gap-2.5">
          {question.options.map((option) => (
            <OptionButton
              key={option.id}
              selected={selected === option.id}
              onClick={() => {
                const next = [...answers]
                next[step] = option.id
                setAnswers(next)
              }}
            >
              {option.label()}
            </OptionButton>
          ))}
        </div>
      </div>

      <footer className="px-7 pt-5 pb-11">
        <button
          type="button"
          disabled={!ready}
          onClick={handleNext}
          className="w-full rounded-full bg-radiant px-5 py-[0.95rem] text-[0.9rem] font-semibold text-pure shadow-[0_4px_20px_rgba(255,79,24,0.28)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {m.setup_next()}
        </button>
      </footer>
    </div>
  )
}
