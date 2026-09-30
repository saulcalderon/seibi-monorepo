import { createFileRoute } from '@tanstack/react-router'
import { Avisos } from '../screens/Avisos'

export const Route = createFileRoute('/_app/avisos')({
  component: Avisos,
})
