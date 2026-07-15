import { Logo } from '../components/Logo'
import * as m from '../paraglide/messages.js'

// Placeholder authenticated landing. The real vehicle/service UI is scoped in
// the deferred domain-modeling session (see GitHub issue #1).
export function Home() {
  return (
    <div className="flex h-full flex-col bg-splash">
      <header className="flex items-center justify-between px-7 pt-14 pb-4">
        <Logo className="text-2xl" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {m.home_title()}
        </h1>
        <p className="max-w-70 text-[0.85rem] leading-relaxed text-black/60">
          {m.home_empty()}
        </p>
      </div>
    </div>
  )
}
