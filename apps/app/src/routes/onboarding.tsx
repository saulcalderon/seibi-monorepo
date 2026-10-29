import { useEffect } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useAuthSession } from '../lib/authSession'
import { getSession, homePathFor } from '../lib/routing'
import { Onboarding } from '../screens/Onboarding'

function isPreview() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('preview')
}

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    if (isPreview()) return
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    if ((await homePathFor(session)) === '/home') throw redirect({ to: '/home' })
  },
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const preview = isPreview()
  const navigate = useNavigate()
  const { status } = useAuthSession()
  useEffect(() => {
    if (preview || status !== 'signed_out') return
    void navigate({ to: '/login', replace: true })
  }, [navigate, preview, status])
  return <Onboarding onFinish={() => void navigate({ to: '/home', replace: true })} />
}
