import { useState } from 'react'
import { SetupPhaseShell } from '../components/SetupPhaseShell'
import { saveFirstRunProfile } from '../lib/firstRunProfile'
import * as m from '../paraglide/messages.js'

export function SetupName({
  initial,
  onBack,
  onContinue,
}: {
  initial?: string
  onBack: () => void
  onContinue: (name: string) => void
}) {
  const [name, setName] = useState(initial ?? '')
  const ready = name.trim().length > 1

  return (
    <SetupPhaseShell
      registro="name"
      onBack={onBack}
      nextDisabled={!ready}
      onNext={() => {
        const next = name.trim()
        if (next.length < 2) return
        saveFirstRunProfile({ name: next })
        onContinue(next)
      }}
    >
      <h1 className="text-center text-[1.75rem] leading-tight tracking-tight text-balance text-coal">
        {m.know_name_title()}
      </h1>
      <label className="mt-8 block">
        <span className="sr-only">{m.know_name_title()}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 40))}
          placeholder={m.know_name_placeholder()}
          autoComplete="given-name"
          autoFocus
          className="w-full rounded-2xl border border-coal/8 bg-pure px-5 py-4 text-[1rem] text-coal shadow-[0_2px_12px_rgba(20,21,23,0.06)] outline-none placeholder:text-coal/35 focus:border-radiant/40"
        />
      </label>
    </SetupPhaseShell>
  )
}
