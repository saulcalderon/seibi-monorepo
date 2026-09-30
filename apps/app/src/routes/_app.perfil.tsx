import { createFileRoute } from '@tanstack/react-router'
import { Perfil } from '../screens/Perfil'

export const Route = createFileRoute('/_app/perfil')({
  component: Perfil,
})
