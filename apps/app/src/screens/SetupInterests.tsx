import { useState } from 'react'
import { SetupPhaseShell } from '../components/SetupPhaseShell'
import {
  INTEREST_IDS,
  saveFirstRunProfile,
  type InterestId,
} from '../lib/firstRunProfile'
import * as m from '../paraglide/messages.js'

function interestCopy(id: InterestId) {
  switch (id) {
    case 'reminders':
      return { title: m.know_interest_reminders(), desc: m.know_interest_reminders_desc() }
    case 'history':
      return { title: m.know_interest_history(), desc: m.know_interest_history_desc() }
    case 'services':
      return { title: m.know_interest_services(), desc: m.know_interest_services_desc() }
    case 'estimates':
      return { title: m.know_interest_estimates(), desc: m.know_interest_estimates_desc() }
  }
}

function InterestGlyph({ id }: { id: InterestId }) {
  switch (id) {
    case 'reminders':
      return (
        <>
          <path
            d="M6.4 9.6a5.6 5.6 0 0111.2 0c0 4.2 1.4 5.4 1.4 5.4H5s1.4-1.2 1.4-5.4"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M10 18.2a2 2 0 004 0" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )
    case 'history':
      return (
        <>
          <rect x="6.2" y="4.6" width="11.6" height="14.8" rx="1.8" strokeWidth="1.7" />
          <path d="M9 9.2h6M9 12.4h6M9 15.6h3.6" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )
    case 'services':
      return (
        <path
          d="M14.8 6.2a3.4 3.4 0 014 4L13 16l-3.2.6.6-3.2 5.8-5.8zM5.5 18.2h6"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'estimates':
      return (
        <>
          <path
            d="M12 20.4s-6.2-4.4-6.2-9.1a6.2 6.2 0 0112.4 0c0 4.7-6.2 9.1-6.2 9.1z"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11.1" r="2" strokeWidth="1.7" />
        </>
      )
  }
}

export function SetupInterests({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (interests: InterestId[]) => void
}) {
  const [picked, setPicked] = useState<InterestId[]>([])

  function toggle(id: InterestId) {
    setPicked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <SetupPhaseShell
      registro="interests"
      onBack={onBack}
      nextDisabled={picked.length === 0}
      onNext={() => {
        if (picked.length === 0) return
        saveFirstRunProfile({ interests: picked })
        onContinue(picked)
      }}
    >
      <h1 className="text-center text-[1.75rem] leading-tight tracking-tight text-balance text-coal">
        {m.know_interest_title()}
      </h1>
      <p className="mx-auto mt-2 max-w-80 text-center text-[0.88rem] leading-relaxed text-black/55">
        {m.know_interest_desc()}
      </p>
      <div className="know-interest-grid mt-7">
        {INTEREST_IDS.map((id) => {
          const copy = interestCopy(id)
          const on = picked.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`know-interest-tile${on ? ' is-on' : ''}`}
              aria-pressed={on}
            >
              <span className="know-interest-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <InterestGlyph id={id} />
                </svg>
              </span>
              <span className="know-interest-title">{copy.title}</span>
              <span className="know-interest-desc">{copy.desc}</span>
            </button>
          )
        })}
      </div>
    </SetupPhaseShell>
  )
}
