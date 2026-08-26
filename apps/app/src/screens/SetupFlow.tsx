import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MaintenanceQuestions } from './MaintenanceQuestions'
import { SetupIntro } from './SetupIntro'
import { markSetupDone } from '../lib/setupProgress'
import { supabase } from '../lib/supabase'
import { resetTutorial } from '../lib/tutorialProgress'

type SetupPhase = 'intro' | 'mantenimiento'

/** First-run only (post-login): intro → 3 maintenance questions → home. */
export function SetupFlow() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<SetupPhase>('intro')

  async function enterApp() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    markSetupDone(session?.user.id)
    resetTutorial()
    void navigate({ to: '/home', replace: true })
  }

  if (phase === 'intro') {
    return <SetupIntro onContinue={() => setPhase('mantenimiento')} />
  }

  return (
    <MaintenanceQuestions
      onBack={() => setPhase('intro')}
      onFinish={enterApp}
    />
  )
}
