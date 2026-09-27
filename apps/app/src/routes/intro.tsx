import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { markIntroDone, pathAfterSplash } from '../lib/routing'
import { Intro } from '../screens/Intro'

export const Route = createFileRoute('/intro')({
  beforeLoad: async () => {
    const next = await pathAfterSplash()
    if (next !== '/intro' && next !== '/login') throw redirect({ to: next })
  },
  component: IntroRoute,
})

function IntroRoute() {
  const navigate = useNavigate()
  return (
    <Intro
      onFinish={() => {
        markIntroDone()
        void navigate({ to: '/login', replace: true })
      }}
    />
  )
}
