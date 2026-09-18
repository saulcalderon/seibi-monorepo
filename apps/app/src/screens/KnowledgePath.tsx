import { useState } from 'react'
import { BrandSearchField, ModelSearchField } from '../components/BrandSearchField'
import { MileageUnitBox } from '../components/MileageUnitBox'
import { SetupOptionButton } from '../components/SetupOptionButton'
import { SetupPhaseShell } from '../components/SetupPhaseShell'
import {
  addVehicle,
  getActiveVehicle,
  mileageToKm,
  modelBelongsToBrand,
  resolveBrandName,
  type MileageUnit,
  type VehicleBrandOption,
} from '../lib/vehicleProfile'
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

const STARTER_CARE = [
  { id: 'oil' as const, title: () => m.know_lesson_oil_title(), hint: () => m.know_none_oil_hint() },
  { id: 'brakes' as const, title: () => m.know_lesson_brakes_title(), hint: () => m.know_none_brakes_hint() },
  { id: 'tires' as const, title: () => m.know_lesson_tires_title(), hint: () => m.know_none_tires_hint() },
  { id: 'filter' as const, title: () => m.know_lesson_filter_title(), hint: () => m.know_none_filter_hint() },
]

const KNOWS_PARTS = [
  { id: 'oil', title: () => m.know_lesson_oil_title() },
  { id: 'brakes', title: () => m.know_lesson_brakes_title() },
  { id: 'tires', title: () => m.know_lesson_tires_title() },
  { id: 'filter', title: () => m.know_lesson_filter_title() },
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

export function saveFirstRunVehicle(draft: VehicleDraft) {
  addVehicle({
    brand: resolveBrandName(draft.brand, draft.brandOther),
    model: draft.model.trim(),
    year: draft.year,
    mileage: draft.mileage,
    mileageUnit: draft.mileageUnit,
    placa: '',
  })
  return getActiveVehicle()
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
        <path
          d="M7 5.5h10l-2.2 4.2v6.8L12 18.8l-2.8-2.3V9.7L7 5.5z"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
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

function PathHead({ icon, title }: { icon: PathIconId; title: string }) {
  return (
    <div className="know-q-head">
      <span className="know-q-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <PathGlyph id={icon} />
        </svg>
      </span>
      <h1 className="know-q-title">{title}</h1>
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
  onFinish: (draft: VehicleDraft) => void
}) {
  const total = pathQuestionCount(profile)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<VehicleDraft>(emptyDraft)
  const [lastService, setLastService] = useState('')
  const [fairOil, setFairOil] = useState('')
  const [knowsWhen, setKnowsWhen] = useState<Record<string, string>>({})

  const inVehicle = step < 4
  const extraIndex = step - 4

  function ready() {
    if (inVehicle) return vehicleReady(step, draft)
    if (profile === 'none') return true
    if (profile === 'fair') return extraIndex === 0 ? lastService.length > 0 : fairOil.length > 0
    return KNOWS_PARTS.every((part) => Boolean(knowsWhen[part.id]))
  }

  function handleNext() {
    if (!ready()) return
    if (step >= total - 1) {
      onFinish(draft)
      return
    }
    setStep((current) => current + 1)
  }

  function handleBack() {
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
      nextDisabled={!ready()}
    >
      {inVehicle ? (
        <VehicleField step={step} draft={draft} setDraft={setDraft} />
      ) : null}

      {profile === 'none' && !inVehicle ? (
        <>
          <PathHead icon="service" title={m.know_none_title()} />
          <ul className="know-suggest-grid">
            {STARTER_CARE.map((item) => (
              <li key={item.id} className="know-suggest-card">
                <span className="know-q-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <PathGlyph id={item.id} />
                  </svg>
                </span>
                <p className="know-suggest-title">{item.title()}</p>
                <p className="know-suggest-hint">{item.hint()}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {profile === 'fair' && !inVehicle && extraIndex === 0 ? (
        <>
          <PathHead icon="service" title={m.setup_5_title()} />
          <div className="mt-8 flex flex-col gap-2.5">
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
        </>
      ) : null}

      {profile === 'fair' && !inVehicle && extraIndex === 1 ? (
        <>
          <PathHead icon="oil" title={m.know_lesson_oil_title()} />
          <div className="mt-8 flex flex-col gap-2.5">
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
        </>
      ) : null}

      {profile === 'knows' && !inVehicle ? (
        <>
          <PathHead icon="quiz" title={m.know_knows_title()} />
          <div className="mt-6 flex flex-col gap-4 pb-4">
            {KNOWS_PARTS.map((part) => (
              <article key={part.id} className="know-quiz-card">
                <h2 className="text-[0.95rem] font-semibold text-coal">{part.title()}</h2>
                <div className="mt-3 flex flex-col gap-1.5">
                  {SIMPLE_WHEN.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`know-quiz-option${knowsWhen[part.id] === option.id ? ' is-on' : ''}`}
                      onClick={() =>
                        setKnowsWhen((current) => ({ ...current, [part.id]: option.id }))
                      }
                    >
                      {option.label()}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </SetupPhaseShell>
  )
}
