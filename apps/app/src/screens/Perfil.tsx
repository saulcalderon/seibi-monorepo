import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  BookOpen,
  ChevronRight,
  Crown,
  FileText,
  GraduationCap,
  LogOut,
  MapPin,
  Palette,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Screen } from '../app/Screen'
import { deleteAccount } from '../lib/account'
import { useAuthSession, useSignOutToLogin } from '../lib/authSession'
import { errorMessage } from '../lib/functions'
import { identityFromUser, initials } from '../lib/identity'
import { KNOWLEDGE_LEVELS, levelTitle, type KnowledgeLevel } from '../lib/knowledge'
import { COUNTRIES, useProfile, useUpdateProfile, type Country } from '../lib/profile'
import { disablePush, enablePush, pushPermission, pushSupported } from '../lib/push'
import { getThemePreference, setThemePreference, type ThemePreference } from '../lib/theme'
import { Button } from '../ui/Button'
import { Card, IconTile, ListRow, SectionHeader } from '../ui/Card'
import { cx } from '../ui/cx'
import { useToast } from '../ui/feedback'
import { Segmented, SelectField, TextField, Toggle } from '../ui/fields'
import { Sheet } from '../ui/Sheet'

export function Perfil() {
  const { user } = useAuthSession()
  const profile = useProfile()
  const update = useUpdateProfile()
  const signOut = useSignOutToLogin()
  const toast = useToast()
  const identity = identityFromUser(user)
  const [sheet, setSheet] = useState<'name' | 'level' | 'location' | 'delete' | null>(null)
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference())
  const [pushOn, setPushOn] = useState(pushPermission() === 'granted' && (profile.data?.notificationsEnabled ?? true))
  const p = profile.data
  const name = p?.displayName ?? identity.fullName ?? identity.email ?? 'Tu cuenta'
  const country = COUNTRIES.find((c) => c.id === p?.country)

  return (
    <Screen back title="Perfil">
      <div className="flex flex-col gap-6 px-5">
        <Card className="flex items-center gap-4 p-5">
          <span className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-inverse text-[1.2rem] font-bold text-on-inverse">
            {identity.avatarUrl ? (
              <img src={identity.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              initials(name)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.15rem] font-bold">{name}</p>
            {identity.email ? <p className="truncate text-[0.85rem] text-muted">{identity.email}</p> : null}
          </div>
        </Card>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Tú" />
          <Card className="divide-y divide-line overflow-hidden">
            <ListRow
              leading={<IconTile icon={UserRound} size="sm" />}
              title="Cómo te llamamos"
              subtitle={p?.displayName ?? 'Sin nombre'}
              onClick={() => setSheet('name')}
            />
            <ListRow
              leading={<IconTile icon={GraduationCap} size="sm" />}
              title="Nivel de conocimiento"
              subtitle={levelTitle(p?.knowledgeLevel)}
              onClick={() => setSheet('level')}
            />
            <ListRow
              leading={<IconTile icon={MapPin} size="sm" />}
              title="Ubicación"
              subtitle={country ? `${p?.city ? `${p.city}, ` : ''}${country.name}` : 'Sin definir'}
              onClick={() => setSheet('location')}
            />
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Preferencias" />
          <Card className="divide-y divide-line overflow-hidden">
            <Toggle
              label="Notificaciones de avisos"
              description={
                !pushSupported()
                  ? 'Instala Seibi en tu pantalla de inicio para recibir notificaciones.'
                  : pushPermission() === 'denied'
                    ? 'Bloqueadas en la configuración de tu teléfono.'
                    : 'Te avisamos cuando se acerque un mantenimiento.'
              }
              checked={pushOn}
              disabled={!pushSupported() || pushPermission() === 'denied'}
              onChange={async (next) => {
                if (!user) return
                try {
                  if (next) {
                    const ok = await enablePush(user.id)
                    setPushOn(ok)
                    if (ok) update.mutate({ notificationsEnabled: true })
                  } else {
                    await disablePush()
                    setPushOn(false)
                    update.mutate({ notificationsEnabled: false })
                  }
                } catch {
                  toast('No pudimos cambiar las notificaciones', 'error')
                }
              }}
            />
            <div className="flex items-center gap-3 px-4 py-3">
              <IconTile icon={Palette} size="sm" />
              <div className="flex-1">
                <Segmented
                  label="Tema"
                  value={theme}
                  onChange={(t) => {
                    setTheme(t)
                    setThemePreference(t)
                  }}
                  options={[
                    { value: 'system', label: 'Auto' },
                    { value: 'day', label: 'Claro' },
                    { value: 'night', label: 'Oscuro' },
                  ]}
                />
              </div>
            </div>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Planes" />
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <IconTile icon={Crown} tone="radiant" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Seibi Común</p>
                <p className="text-[0.82rem] text-muted">Todo incluido mientras estamos en lanzamiento.</p>
              </div>
              <span className="rounded-full bg-radiant-soft px-2.5 py-1 text-[0.72rem] font-bold text-radiant">
                Próximamente
              </span>
            </div>
            <p className="border-t border-line px-4 py-3 text-[0.8rem] text-muted">
              Los planes Plus y Premium para flotas grandes llegarán pronto. Te avisaremos antes de cualquier cambio.
            </p>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Legal y ayuda" />
          <Card className="divide-y divide-line overflow-hidden">
            <Link to="/legal/terminos" className="block">
              <ListRow leading={<IconTile icon={FileText} size="sm" />} title="Términos de uso" chevron />
            </Link>
            <Link to="/legal/privacidad" className="block">
              <ListRow leading={<IconTile icon={ShieldCheck} size="sm" />} title="Política de privacidad" chevron />
            </Link>
            <a href="mailto:hola@seibiapp.com" className="block">
              <ListRow leading={<IconTile icon={BookOpen} size="sm" />} title="Escríbenos" subtitle="hola@seibiapp.com" chevron />
            </a>
          </Card>
        </section>

        <div className="flex flex-col gap-2">
          <Button variant="secondary" icon={LogOut} onClick={() => void signOut()}>
            Cerrar sesión
          </Button>
          <Button variant="ghost" icon={Trash2} className="text-overdue" onClick={() => setSheet('delete')}>
            Eliminar mi cuenta
          </Button>
        </div>
        <p className="pb-2 text-center text-[0.75rem] text-subtle">Seibi · {import.meta.env.VITE_APP_VERSION ?? 'MVP'}</p>
      </div>

      <NameSheet open={sheet === 'name'} onClose={() => setSheet(null)} />
      <LevelSheet open={sheet === 'level'} onClose={() => setSheet(null)} />
      <LocationSheet open={sheet === 'location'} onClose={() => setSheet(null)} />
      <DeleteSheet open={sheet === 'delete'} onClose={() => setSheet(null)} />
    </Screen>
  )
}

function NameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile()
  const update = useUpdateProfile()
  const [name, setName] = useState(profile.data?.displayName ?? '')
  return (
    <Sheet open={open} onClose={onClose} title="¿Cómo te llamamos?">
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          update.mutate({ displayName: name }, { onSuccess: onClose })
        }}
      >
        <TextField label="Nombre" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus />
        <Button type="submit" size="lg" block loading={update.isPending}>
          Guardar
        </Button>
      </form>
    </Sheet>
  )
}

function LevelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile()
  const update = useUpdateProfile()
  const current = profile.data?.knowledgeLevel
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nivel de conocimiento"
      description="Cambia cómo te explicamos las cosas. Tus datos y avisos no cambian."
    >
      <div className="flex flex-col gap-2 pb-2" role="radiogroup" aria-label="Nivel">
        {KNOWLEDGE_LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={current === l.id}
            onClick={() => update.mutate({ knowledgeLevel: l.id as KnowledgeLevel }, { onSuccess: onClose })}
            className={cx(
              'flex items-start gap-3 rounded-2xl p-4 text-left ring-1',
              current === l.id ? 'bg-radiant-soft ring-radiant' : 'bg-surface ring-line',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{l.title}</span>
              <span className="block text-[0.84rem] text-muted">{l.description}</span>
            </span>
            {current === l.id ? <ChevronRight className="mt-1 size-4 text-radiant" aria-hidden /> : null}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile()
  const update = useUpdateProfile()
  const [country, setCountry] = useState<Country>(profile.data?.country ?? 'SV')
  const [city, setCity] = useState(profile.data?.city ?? '')
  return (
    <Sheet open={open} onClose={onClose} title="Ubicación" description="La usamos para estimar precios de tu zona.">
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          update.mutate({ country, city }, { onSuccess: onClose })
        }}
      >
        <SelectField label="País" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
          {COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.flag} {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button type="submit" size="lg" block loading={update.isPending}>
          Guardar
        </Button>
      </form>
    </Sheet>
  )
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Eliminar mi cuenta"
      description="Se borran para siempre tu cuenta, tus Vehículos, Servicios, facturas, avisos y consultas. No se puede deshacer."
    >
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await deleteAccount()
            void navigate({ to: '/login', replace: true })
          } catch (err) {
            setError(errorMessage(err))
            setBusy(false)
          }
        }}
      >
        <TextField
          label='Escribe "ELIMINAR" para confirmar'
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoCapitalize="characters"
          error={error}
        />
        <Button type="submit" variant="danger" size="lg" block loading={busy} disabled={confirm.trim().toUpperCase() !== 'ELIMINAR'}>
          Eliminar definitivamente
        </Button>
      </form>
    </Sheet>
  )
}
