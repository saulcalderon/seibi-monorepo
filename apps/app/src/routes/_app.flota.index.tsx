import { createFileRoute } from '@tanstack/react-router'
import { Fleet } from '../screens/Fleet'

export const Route = createFileRoute('/_app/flota/')({
  component: Fleet,
})
