import { useState } from 'react'
import { SetupPhaseShell } from '../components/SetupPhaseShell'
import {
  saveFirstRunProfile,
  type KnowledgeProfile,
} from '../lib/firstRunProfile'
import * as m from '../paraglide/messages.js'

function LightGlyph() {
  return (
    <>
      <path
        d="M12 3a5.5 5.5 0 0 0-3.2 9.9c.45.4.8 1 .85 1.6h4.7c.05-.6.4-1.2.85-1.6A5.5 5.5 0 0 0 12 3Z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 16.7h4.8M10.15 18.9h3.7M10.7 21.1h2.6"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.7 8.1c.55-.95 1.55-1.5 2.7-1.5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  )
}

function PickGlyph({ id }: { id: KnowledgeProfile }) {
  if (id === 'none') {
    return (
      <path
        d="M5 7.1c2.1-.9 4.3-.6 7 .9 2.7-1.5 4.9-1.8 7-.9v10.2c-2.1-.8-4.3-.5-7 1-2.7-1.5-4.9-1.8-7-1V7.1zM12 8v10.3"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    )
  }
  if (id === 'knows') {
    return (
      <>
        <path
          d="M4.6 14.1l1.1-3.1A2.3 2.3 0 017.9 9.3h8.2a2.3 2.3 0 012.2 1.7l1.1 3.1M3.9 14.1h16.2v2.5a1 1 0 01-1 1.1H4.9a1 1 0 01-1-1.1v-2.5zM8.3 9.3l.6-1.8h6.2l.6 1.8"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="7.6" cy="16.2" r="1.05" fill="currentColor" stroke="none" />
        <circle cx="16.4" cy="16.2" r="1.05" fill="currentColor" stroke="none" />
      </>
    )
  }
  return (
    <>
      <circle cx="12" cy="12" r="7.2" strokeWidth="1.7" />
      <path d="M12 4.8a7.2 7.2 0 0 1 0 14.4" fill="currentColor" stroke="none" />
    </>
  )
}

const OPTIONS: {
  id: KnowledgeProfile
  label: () => string
  hint: () => string
}[] = [
  { id: 'none', label: () => m.know_opt_none(), hint: () => m.know_opt_none_hint() },
  { id: 'knows', label: () => m.know_opt_knows(), hint: () => m.know_opt_knows_hint() },
  { id: 'fair', label: () => m.know_opt_fair(), hint: () => m.know_opt_fair_hint() },
]

export function KnowledgeQuestion({
  initial,
  onBack,
  onContinue,
}: {
  initial?: KnowledgeProfile | null
  onBack: () => void
  onContinue: (profile: KnowledgeProfile) => void
}) {
  const [selected, setSelected] = useState<KnowledgeProfile | null>(initial ?? null)

  return (
    <SetupPhaseShell
      registro="knowledge"
      profile={selected ?? initial}
      onBack={onBack}
      nextDisabled={!selected}
      onNext={() => {
        if (!selected) return
        saveFirstRunProfile({ knowledge: selected })
        onContinue(selected)
      }}
    >
      <div className="know-q-head">
        <span className="know-q-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <LightGlyph />
          </svg>
        </span>
        <h1 className="know-title">
          {m.know_title()} <em>{m.know_title_em()}</em>
        </h1>
      </div>
      <div className="know-pick know-pick--few mt-8">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`know-pick-item${selected === option.id ? ' is-on' : ''}`}
            onClick={() => setSelected(option.id)}
          >
            <span className="know-pick-orb" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <PickGlyph id={option.id} />
              </svg>
            </span>
            <span className="know-pick-copy">
              <span className="know-pick-label">{option.label()}</span>
              <span className="setup-option-hint">{option.hint()}</span>
            </span>
          </button>
        ))}
      </div>
    </SetupPhaseShell>
  )
}
