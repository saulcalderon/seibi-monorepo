import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { markIntroDone, pathAfterSplash } from '../lib/routing'
import { Intro } from '../screens/Intro'

export const Route = createFileRoute('/intro')({
  beforeLoad: async () => {
    const preview =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('preview')
    if (preview) return
    const next = await pathAfterSplash()
    if (next !== '/intro' && next !== '/login') throw redirect({ to: next })
  },
  component: IntroRoute,
})

function IntroRoute() {
  const navigate = useNavigate()
  const fromSplash = useRouterState({ select: (s) => s.location.state.fromSplash === true })
  return (
    <Intro
      fromSplash={fromSplash}
      onFinish={() => {
        markIntroDone()
        void navigate({ to: '/login', replace: true })
      }}
    />
  )
}
