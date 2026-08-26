import { useState } from 'react'
import { markSetupDone } from '../lib/setupProgress'
import { BrandSearchField } from '../components/BrandSearchField'
import type { VehicleBrandOption } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

const TOTAL = 5

const LAST_SERVICE_OPTIONS = [
  { id: 'recent', label: () => m.setup_5_opt_recent() },
  { id: 'mid', label: () => m.setup_5_opt_mid() },
  { id: 'year', label: () => m.setup_5_opt_year() },
  { id: 'old', label: () => m.setup_5_opt_old() },
  { id: 'unknown', label: () => m.setup_5_opt_unknown() },
] as const

interface Answers {
  brand: string
  brandOther: string
  model: string
  year: string
  mileage: string
  lastService: string
}

const initialAnswers: Answers = {
  brand: '',
  brandOther: '',
  model: '',
  year: '',
  mileage: '',
  lastService: '',
}

function canContinue(step: number, answers: Answers): boolean {
  switch (step) {
    case 0:
      return answers.brand === 'other'
        ? answers.brandOther.trim().length > 1
        : answers.brand.length > 0
    case 1:
      return answers.model.trim().length > 1
    case 2: {
      const year = Number(answers.year)
      return Number.isInteger(year) && year >= 1980 && year <= new Date().getFullYear() + 1
    }
    case 3: {
      if (!answers.mileage.trim()) return false
      const km = Number(answers.mileage.replace(/,/g, ''))
      return Number.isFinite(km) && km >= 0 && km < 2_000_000
    }
    case 4:
      return answers.lastService.length > 0
    default:
      return false
  }
}

function ProgressHeader({
  current,
  onBack,
}: {
  current: number
  onBack: () => void
}) {
  return (
    <header className="setup-header px-7 pt-13 pb-4">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1 text-[0.78rem] font-medium text-black/45 transition-colors hover:text-black/75"
        >
          {m.setup_back()}
        </button>
        <p className="text-[0.78rem] font-medium tracking-wide text-black/55">
          {m.setup_progress({ current: String(current + 1), total: String(TOTAL) })}
        </p>
        <span className="w-12" aria-hidden="true" />
      </div>
      <div
        className="setup-progress mt-4"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL}
        aria-valuenow={current + 1}
        aria-label={m.setup_progress({
          current: String(current + 1),
          total: String(TOTAL),
        })}
      >
        {Array.from({ length: TOTAL }).map((_, index) => (
          <span
            key={index}
            className={`setup-progress-seg${
              index < current ? ' is-done' : index === current ? ' is-current' : ''
            }`}
          />
        ))}
      </div>
    </header>
  )
}

function FieldInput({
  value,
  onChange,
  placeholder,
  inputMode,
  suffix,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  suffix?: string
  autoFocus?: boolean
}) {
  return (
    <label className="relative block">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className="w-full rounded-2xl border border-coal/8 bg-pure px-5 py-4 text-[1rem] text-coal shadow-[0_2px_12px_rgba(20,21,23,0.06)] outline-none placeholder:text-coal/35 focus:border-radiant/40"
      />
      {suffix ? (
        <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-[0.85rem] font-medium text-black/40">
          {suffix}
        </span>
      ) : null}
    </label>
  )
}

function StepBody({
  step,
  answers,
  setAnswers,
}: {
  step: number
  answers: Answers
  setAnswers: (next: Answers) => void
}) {
  const titles = [
    m.setup_1_title(),
    m.setup_2_title(),
    m.setup_3_title(),
    m.setup_4_title(),
    m.setup_5_title(),
  ]
  const descs = [
    m.setup_1_desc(),
    m.setup_2_desc(),
    m.setup_3_desc(),
    m.setup_4_desc(),
    m.setup_5_desc(),
  ]

  return (
    <div key={step} className="setup-step flex flex-1 flex-col pt-4">
      <div className="px-7">
        <h1 className="text-[1.75rem] leading-tight tracking-tight text-coal">
          {titles[step]}
        </h1>
        <p className="mt-2 max-w-80 text-[0.88rem] leading-relaxed text-black/55">
          {descs[step]}
        </p>
      </div>

      <div className="mt-8 flex flex-1 flex-col gap-3">
        {step === 0 ? (
          <div className="px-7">
            <BrandSearchField
              brand={(answers.brand as VehicleBrandOption | '') || ''}
              brandOther={answers.brandOther}
              autoFocus
              onChange={(next) => setAnswers({ ...answers, ...next })}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="px-7">
            <FieldInput
              value={answers.model}
              onChange={(model) => setAnswers({ ...answers, model })}
              placeholder={m.setup_2_placeholder()}
              autoFocus
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="px-7">
            <FieldInput
              value={answers.year}
              onChange={(year) =>
                setAnswers({ ...answers, year: year.replace(/\D/g, '').slice(0, 4) })
              }
              placeholder={m.setup_3_placeholder()}
              inputMode="numeric"
              autoFocus
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="px-7">
            <FieldInput
              value={answers.mileage}
              onChange={(mileage) =>
                setAnswers({
                  ...answers,
                  mileage: mileage.replace(/[^\d]/g, ''),
                })
              }
              placeholder={m.setup_4_placeholder()}
              inputMode="numeric"
              suffix={m.setup_4_suffix()}
              autoFocus
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-2.5 px-7">
            {LAST_SERVICE_OPTIONS.map((option) => {
              const selected = answers.lastService === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setAnswers({ ...answers, lastService: option.id })
                  }
                  className={`setup-option setup-option--block${selected ? ' is-selected' : ''}`}
                >
                  <span className="setup-option-fill" aria-hidden="true" />
                  <span className="setup-option-label">{option.label()}</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function VehicleSetup({
  onBackFromStart,
  onFinish,
}: {
  onBackFromStart: () => void
  onFinish: () => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const ready = canContinue(step, answers)
  const isLast = step === TOTAL - 1

  function handleBack() {
    if (step === 0) {
      onBackFromStart()
      return
    }
    setStep((current) => Math.max(0, current - 1))
  }

  function handleNext() {
    if (!ready) return
    if (isLast) {
      markSetupDone()
      onFinish()
      return
    }
    setStep((current) => Math.min(TOTAL - 1, current + 1))
  }

  return (
    <div className="flex h-full flex-col bg-fog">
      <ProgressHeader current={step} onBack={handleBack} />

      <StepBody step={step} answers={answers} setAnswers={setAnswers} />

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
