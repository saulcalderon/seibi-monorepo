import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  KnowledgePath,
  saveFirstRunVehicle,
  type FirstRunVehicleDraft,
} from './KnowledgePath'
import { KnowledgeQuestion } from './KnowledgeQuestion'
import { SetupIntro } from './SetupIntro'
import { SetupInterests } from './SetupInterests'
import { SetupName } from './SetupName'
import { SetupWelcome } from './SetupWelcome'
import { VehicleAdded } from './VehicleAdded'
import { useRequireProductionSession } from '../lib/authSession'
import { getFirstRunProfile, type KnowledgeProfile } from '../lib/firstRunProfile'
import { markSetupDone } from '../lib/setupProgress'
import { supabase } from '../lib/supabase'

type SetupPhase =
  | 'intro'
  | 'knowledge'
  | 'name'
  | 'path'
  | 'interests'
  | 'added'
  | 'welcome'

function initialPhase(): SetupPhase {
  if (typeof window === 'undefined') return 'intro'
  const params = new URLSearchParams(window.location.search)
  if (params.has('stay')) return 'intro'
  if (params.get('phase') === 'knowledge' || params.has('skipIntro')) return 'knowledge'
  return 'intro'
}

/** First-run: intro → knowledge → name → path → interests → vehicle added → welcome → home. */
export function SetupFlow() {
  useRequireProductionSession()
  const navigate = useNavigate()
  const stored = getFirstRunProfile()
  const [phase, setPhase] = useState<SetupPhase>(initialPhase)
  const [knowledge, setKnowledge] = useState<KnowledgeProfile | null>(stored.knowledge)
  const [name, setName] = useState(stored.name)
  const [pending, setPending] = useState<FirstRunVehicleDraft | null>(null)

  async function enterApp() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    markSetupDone(session?.user.id)
    void navigate({ to: '/home', replace: true })
  }

  if (phase === 'intro') {
    return <SetupIntro onContinue={() => setPhase('knowledge')} />
  }

  if (phase === 'knowledge') {
    return (
      <KnowledgeQuestion
        initial={knowledge}
        onBack={() => setPhase('intro')}
        onContinue={(profile) => {
          setKnowledge(profile)
          setPhase('name')
        }}
      />
    )
  }

  if (phase === 'name') {
    return (
      <SetupName
        initial={name}
        onBack={() => setPhase('knowledge')}
        onContinue={(next) => {
          setName(next)
          setPhase('path')
        }}
      />
    )
  }

  if (phase === 'path') {
    if (!knowledge) {
      return (
        <KnowledgeQuestion
          initial={null}
          onBack={() => setPhase('intro')}
          onContinue={(profile) => {
            setKnowledge(profile)
            setPhase('name')
          }}
        />
      )
    }
    return (
      <KnowledgePath
        profile={knowledge}
        onBack={() => setPhase('name')}
        onFinish={(draft) => {
          setPending(draft)
          setPhase('interests')
        }}
      />
    )
  }

  if (phase === 'interests') {
    return (
      <SetupInterests
        onBack={() => setPhase('path')}
        onContinue={() => {
          if (pending) saveFirstRunVehicle(pending)
          setPhase('added')
        }}
      />
    )
  }

  if (phase === 'added') {
    return <VehicleAdded onContinue={() => setPhase('welcome')} />
  }

  return <SetupWelcome name={name} onContinue={() => void enterApp()} />
}
