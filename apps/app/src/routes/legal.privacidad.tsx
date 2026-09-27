import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '../screens/Legal'

export const Route = createFileRoute('/legal/privacidad')({
  component: () => <LegalPage doc="privacidad" />,
})
