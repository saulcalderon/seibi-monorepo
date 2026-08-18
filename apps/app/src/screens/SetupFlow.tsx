import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MaintenanceQuestions } from './MaintenanceQuestions'
import { SetupIntro } from './SetupIntro'
import { markSetupDone } from '../lib/setupProgress'
import { resetTutorial } from '../lib/tutorialProgress'

type SetupPhase = 'intro' | 'mantenimiento'

/**
 * Preview first-run path (login bypassed):
 * intro → preguntas de mantenimiento → app home with guided unlock tutorial
 */
export function SetupFlow() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<SetupPhase>('intro')

  function enterApp() {
    markSetupDone()
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
