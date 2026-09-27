import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Logo } from '../components/Logo'
import { Silhouette } from '../components/VehicleVisual'
import { signInWithProvider, supabase } from '../lib/supabase'
import { Button } from '../ui/Button'
import { TextField } from '../ui/fields'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  )
}

export function Login() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function google() {
    setPending(true)
    setError(null)
    const { error: e } = await signInWithProvider('google')
    if (e) {
      setError('No pudimos abrir Google. Intenta de nuevo.')
      setPending(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg pt-safe pb-safe">
      <div className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full bg-radiant/15 blur-3xl" aria-hidden />
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <Logo className="text-[3.2rem]" />
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, delay: 0.1 }}
          className="mt-8"
        >
          <Silhouette bodyType="sedan" color="silver" className="h-28 w-72" />
        </motion.div>
      </div>
      <div className="flex flex-col gap-4 px-6 pb-4">
        <div>
          <h1 className="text-[2rem] leading-[1.08]">Mantenimiento con total claridad</h1>
          <p className="mt-2 text-[0.98rem] text-muted">Entra para guardar tus Vehículos y recibir tus avisos.</p>
        </div>
        <Button size="lg" variant="secondary" block loading={pending} onClick={() => void google()} className="shadow-card">
          {!pending ? <GoogleMark /> : null}
          Continuar con Google
        </Button>
        {error ? (
          <p role="alert" className="text-center text-[0.85rem] font-medium text-overdue">
            {error}
          </p>
        ) : null}
        {import.meta.env.DEV ? <DevEmailLogin /> : null}
        <p className="text-center text-[0.78rem] text-subtle">
          Al continuar aceptas los{' '}
          <Link to="/legal/terminos" className="font-semibold underline">
            Términos
          </Link>{' '}
          y la{' '}
          <Link to="/legal/privacidad" className="font-semibold underline">
            Política de privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

/** Local development only: email + password against local Supabase. */
function DevEmailLogin() {
  const [email, setEmail] = useState('demo@seibi.test')
  const [password, setPassword] = useState('password123')
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <details className="rounded-2xl bg-surface p-3 ring-1 ring-line">
      <summary className="cursor-pointer text-[0.82rem] font-semibold text-muted">Entrar con correo (solo desarrollo)</summary>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setMsg(null)
          let { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) {
            ;({ error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: 'Demo Seibi' } } }))
          }
          if (error) setMsg(error.message)
          else window.location.assign('/auth/callback')
        }}
      >
        <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" variant="inverse">
          Entrar
        </Button>
        {msg ? <p className="text-[0.8rem] text-overdue">{msg}</p> : null}
      </form>
    </details>
  )
}
