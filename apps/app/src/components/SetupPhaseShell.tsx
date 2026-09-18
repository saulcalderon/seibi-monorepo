import type { ReactNode } from 'react'
import {
  getFirstRunProfile,
  registroQuestionCount,
  registroQuestionIndex,
  type KnowledgeProfile,
} from '../lib/firstRunProfile'
import * as m from '../paraglide/messages.js'

export type RegistroChapter = 'knowledge' | 'name' | 'path' | 'interests'

export function SetupPhaseShell({
  registro,
  profile,
  pathStep = 0,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  children,
}: {
  registro: RegistroChapter
  profile?: KnowledgeProfile | null
  pathStep?: number
  pathTotal?: number
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  children: ReactNode
}) {
  const knowledge = profile ?? getFirstRunProfile().knowledge
  const total = registroQuestionCount(knowledge)
  const current = registroQuestionIndex(registro, knowledge, pathStep)
  const fill = Math.min(1, current / total)

  return (
    <div className="flex h-full flex-col bg-fog">
      <header className="setup-header px-7 pt-13 pb-4">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-[0.78rem] font-medium text-black/45 transition-colors hover:text-black/75"
          >
            {m.setup_back()}
          </button>
          <span />
          <span className="w-8" />
        </div>
        <div
          className="know-registro mt-4"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current}
          aria-label={m.know_registro_progress({
            current: String(current),
            total: String(total),
          })}
        >
          <span className="know-registro-fill" style={{ width: `${fill * 100}%` }}>
            <span className="know-registro-glow" aria-hidden="true" />
          </span>
        </div>
      </header>
      <div className="know-phase-body flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pt-4">
        {children}
      </div>
      <footer className="px-7 pt-5 pb-11">
        <button
          type="button"
          disabled={nextDisabled}
          onClick={onNext}
          className="w-full rounded-full bg-radiant px-5 py-[0.95rem] text-[0.9rem] font-semibold text-pure shadow-[0_4px_20px_rgba(255,79,24,0.28)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel ?? m.setup_next()}
        </button>
      </footer>
    </div>
  )
}
