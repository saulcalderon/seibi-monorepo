import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, BellRing, Check, ChevronLeft, GraduationCap, LoaderCircle } from 'lucide-react'
import { Logo } from '../components/Logo'
import { VehicleFormBody } from '../forms/VehicleForm'
import { useAuthSession } from '../lib/authSession'
import { todayIso } from '../lib/format'
import { useGarage } from '../lib/garage'
import { identityFromUser } from '../lib/identity'
import {
  calibrateLevel,
  CHECK_QUESTIONS,
  KNOWLEDGE_LEVELS,
  knowledgeProfile,
  levelTitle,
  type KnowledgeLevel,
} from '../lib/knowledge'
import { rememberTasks, useSaveRoutine } from '../lib/mutations'
import { COUNTRIES, useProfile, useUpdateProfile, type Country } from '../lib/profile'
import { enablePush, pushSupported } from '../lib/push'
import { taskIcon } from '../lib/tasks'
import { useQueryClient } from '@tanstack/react-query'
import { garageQueryKey } from '../lib/garage'
import { cx } from '../ui/cx'
import { parseNumber, SelectField, TextField } from '../ui/fields'

type Step =
  | 'name'
  | 'level'
  | 'check'
  | 'result'
  | 'location'
  | 'vehicle'
  | 'usage'
  | 'history'
  | 'notifications'

const CATEGORY: Record<Step, string> = {
  name: 'Tú',
  level: 'Conocimiento',
  check: 'Conocimiento',
  result: 'Conocimiento',
  location: 'Ubicación',
  vehicle: 'Tu Vehículo',
  usage: 'Uso',
  history: 'Mantenimiento',
  notifications: 'Avisos',
}

const ORDER: Step[] = ['name', 'level', 'check', 'result', 'location', 'vehicle', 'usage', 'history', 'notifications']

const display = 'font-sans font-light tracking-[-0.025em]'

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { user } = useAuthSession()
  const profile = useProfile()
  const update = useUpdateProfile()
  const garage = useGarage()
  const identity = identityFromUser(user)

  const [step, setStep] = useState<Step>('name')
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState(profile.data?.displayName ?? identity.fullName?.split(' ')[0] ?? '')
  const [selfLevel, setSelfLevel] = useState<KnowledgeLevel | null>(null)
  const [checkIndex, setCheckIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  // The outgoing question stays tappable while it animates out; answers
  // count only for the question on screen now.
  const currentCheck = useRef(0)
  const [level, setLevel] = useState<KnowledgeLevel | null>(null)
  const [country, setCountry] = useState<Country>(profile.data?.country ?? 'SV')
  const [city, setCity] = useState(profile.data?.city ?? '')
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  const hasVehicle = Boolean(vehicleId)
  const steps = useMemo(
    () => ORDER.filter((s) => (s === 'usage' || s === 'history' ? hasVehicle : true)).filter((s) => (s === 'notifications' ? pushSupported() : true)),
    [hasVehicle],
  )
  const position = steps.indexOf(step)

  const go = (next: Step) => {
    setDirection(steps.indexOf(next) >= position ? 1 : -1)
    setStep(next)
  }
  const nextOf = (s: Step) => steps[steps.indexOf(s) + 1]

  async function finish() {
    setFinishing(true)
    await update.mutateAsync({ onboardedAt: new Date().toISOString() }).catch(() => undefined)
    onFinish()
  }

  const advance = (from: Step) => {
    const next = nextOf(from)
    if (next) go(next)
    else void finish()
  }

  const k = knowledgeProfile(level ?? selfLevel)
  const vehicle = garage.vehicles.find((v) => v.id === vehicleId) ?? null

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', '#f1f1f2')
    return () => {
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [])

  return (
    <div className="intro-day intro-v3 relative isolate flex h-full flex-col bg-bg pt-safe pb-safe">
      <header className="relative z-20 flex items-center justify-between px-4 pb-2 pt-4">
        {position > 0 && step !== 'check' ? (
          <button
            type="button"
            onClick={() => go(steps[position - 1])}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted"
            aria-label="Atrás"
          >
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </button>
        ) : (
          <span className="inline-flex items-center gap-[0.28em] text-[1.375rem] leading-none">
            <Logo className="text-[0.95em]" />
            <span className="inline-flex items-baseline font-bold tracking-[-0.035em] [font-stretch:125%]" aria-hidden>
              seib
              <span className="relative inline-block after:absolute after:left-1/2 after:top-[-0.02em] after:size-[0.15em] after:-translate-x-1/2 after:-skew-x-14 after:rounded-[0.02em] after:bg-[#e0464f] after:content-['']">
                ı
              </span>
            </span>
          </span>
        )}
        <span className="sr-only">
          Paso {position + 1} de {steps.length}
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step + (step === 'check' ? checkIndex : '')}
            custom={direction}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="scroll-area absolute inset-0 px-5 pb-safe pt-4"
          >
            {step === 'name' ? (
              <Panel
                eyebrow={CATEGORY.name}
                title="¡Bienvenido a Seibi!"
                body="Te haremos unas preguntas rápidas para adaptar Seibi a ti. Toma unos 2 minutos."
              >
                <TextField label="¿Cómo te llamamos?" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoFocus />
                <Footer>
                  <Pill
                    disabled={name.trim().length === 0}
                    onClick={() => {
                      update.mutate({ displayName: name })
                      advance('name')
                    }}
                  >
                    Continuar
                  </Pill>
                </Footer>
              </Panel>
            ) : null}

            {step === 'level' ? (
              <Panel eyebrow={CATEGORY.level} title="¿Cuánto sabes de carros?" body="Sé honesto: así te explicamos las cosas a tu medida. Lo puedes cambiar después.">
                <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Nivel de conocimiento">
                  {KNOWLEDGE_LEVELS.map((l) => (
                    <Option
                      key={l.id}
                      selected={selfLevel === l.id}
                      title={l.title}
                      body={l.description}
                      onClick={() => {
                        setSelfLevel(l.id)
                        setCheckIndex(0)
                        setCorrect(0)
                        currentCheck.current = 0
                        window.setTimeout(() => advance('level'), 180)
                      }}
                    />
                  ))}
                </div>
              </Panel>
            ) : null}

            {step === 'check' ? (
              <Panel
                eyebrow={CATEGORY.check}
                title={CHECK_QUESTIONS[checkIndex].question}
                body={`Pregunta ${checkIndex + 1} de ${CHECK_QUESTIONS.length}. Si no sabes, elige “No sé”: está perfecto.`}
              >
                <div className="flex flex-col gap-2.5" role="radiogroup">
                  {CHECK_QUESTIONS[checkIndex].options.map((o) => (
                    <Option
                      key={o.text}
                      title={o.text}
                      onClick={() => {
                        if (currentCheck.current !== checkIndex) return
                        currentCheck.current = checkIndex + 1
                        const total = correct + (o.correct ? 1 : 0)
                        setCorrect(total)
                        if (checkIndex < CHECK_QUESTIONS.length - 1) {
                          setDirection(1)
                          setCheckIndex(checkIndex + 1)
                        } else {
                          const final = calibrateLevel(selfLevel ?? 'basic', total)
                          setLevel(final)
                          update.mutate({ knowledgeLevel: final })
                          advance('check')
                        }
                      }}
                    />
                  ))}
                </div>
              </Panel>
            ) : null}

            {step === 'result' && level ? (
              <Panel eyebrow={CATEGORY.result} title={RESULT_COPY[level].title} body={RESULT_COPY[level].body}>
                <div className="flex items-center gap-3 rounded-[1rem] border border-white/80 bg-surface p-4 shadow-card">
                  <span className="inline-flex size-11 items-center justify-center rounded-[1rem] bg-surface-2 text-ink">
                    <GraduationCap className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[0.78rem] font-semibold text-muted">Tu nivel</p>
                    <p className="font-bold">{levelTitle(level)}</p>
                  </div>
                </div>
                <details className="rounded-[1rem] border border-white/80 bg-surface p-4 shadow-card">
                  <summary className="cursor-pointer text-[0.88rem] font-semibold">Prefiero otro nivel</summary>
                  <div className="mt-3 flex flex-col gap-2">
                    {KNOWLEDGE_LEVELS.map((l) => (
                      <Option
                        key={l.id}
                        selected={level === l.id}
                        title={l.title}
                        onClick={() => {
                          setLevel(l.id)
                          update.mutate({ knowledgeLevel: l.id })
                        }}
                      />
                    ))}
                  </div>
                </details>
                <Footer>
                  <Pill onClick={() => advance('result')}>Continuar</Pill>
                </Footer>
              </Panel>
            ) : null}

            {step === 'location' ? (
              <Panel eyebrow={CATEGORY.location} title="¿Dónde usas tu Vehículo?" body="Lo usamos para estimar precios de tu zona y ajustar el plan del fabricante a tu país.">
                <SelectField label="País" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </SelectField>
                <TextField label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} placeholder={country === 'SV' ? 'San Salvador, Santa Ana…' : 'Houston, Los Ángeles…'} />
                <Footer>
                  <Pill
                    loading={update.isPending}
                    disabled={city.trim().length < 2}
                    onClick={() => {
                      void update.mutateAsync({ country, city }).then(() => advance('location'))
                    }}
                  >
                    Continuar
                  </Pill>
                </Footer>
              </Panel>
            ) : null}

            {step === 'vehicle' ? (
              <Panel
                eyebrow={CATEGORY.vehicle}
                title="Agrega tu Vehículo"
                body={
                  k.explain
                    ? 'Con la marca, el modelo y el año buscamos qué mantenimiento necesita. Lo demás es opcional.'
                    : 'Buscamos el plan del fabricante para tu marca, modelo, año y motor.'
                }
              >
                {vehicleId ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-ok-soft p-4 text-ok">
                    <Check className="size-5" aria-hidden />
                    <p className="font-semibold">Vehículo agregado</p>
                  </div>
                ) : (
                  <VehicleFormBody
                    vehicle={null}
                    submitLabel="Agregar y continuar"
                    onCreated={(id) => {
                      setVehicleId(id)
                    }}
                    onDone={() => undefined}
                  />
                )}
                <Footer>
                  {vehicleId ? (
                    <Pill onClick={() => advance('vehicle')}>Continuar</Pill>
                  ) : (
                    <Quiet onClick={() => advance('vehicle')}>Lo agrego después</Quiet>
                  )}
                </Footer>
              </Panel>
            ) : null}

            {step === 'usage' && vehicle ? (
              <UsageStep vehicleId={vehicle.id} measure={vehicle.measure} explain={k.explain} onNext={() => advance('usage')} />
            ) : null}

            {step === 'history' && vehicle ? (
              <HistoryStep vehicleId={vehicle.id} explain={k.explain} onNext={() => advance('history')} />
            ) : null}

            {step === 'notifications' ? (
              <Panel eyebrow={CATEGORY.notifications} title="¿Te avisamos a tiempo?" body="Te mandamos una notificación cuando se acerque un mantenimiento o toque actualizar el kilometraje. Nada de publicidad.">
                <div className="flex flex-1 items-center justify-center py-6">
                  <motion.span
                    className="inline-flex size-24 items-center justify-center rounded-[2rem] bg-surface text-ink shadow-card"
                    animate={{ rotate: [0, -10, 10, -6, 0] }}
                    transition={{ repeat: Infinity, repeatDelay: 1.6, duration: 0.8 }}
                  >
                    <BellRing className="size-11" aria-hidden />
                  </motion.span>
                </div>
                <Footer>
                  <Pill
                    loading={finishing}
                    onClick={() => {
                      void (async () => {
                        if (user) await enablePush(user.id).catch(() => false)
                        await finish()
                      })()
                    }}
                  >
                    Activar avisos
                  </Pill>
                  <Quiet disabled={finishing} onClick={() => void finish()}>
                    Ahora no
                  </Quiet>
                </Footer>
              </Panel>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center pb-3" aria-hidden>
        <div className="flex items-center gap-0.5">
          {steps.map((s, i) => (
            <span key={s} className="flex h-8 items-center px-0.5">
              <span
                className={cx(
                  'block h-1.5 rounded-full transition-[width,background-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
                  i === position ? 'w-4 bg-ink' : 'w-1.5 bg-[#c9cacd]',
                )}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const RESULT_COPY: Record<KnowledgeLevel, { title: string; body: string }> = {
  none: {
    title: 'Te guiaremos paso a paso',
    body: 'Usaremos palabras sencillas, te explicaremos cada pieza y te diremos exactamente qué pedir en el taller.',
  },
  basic: {
    title: 'Vas bien encaminado',
    body: 'Te explicaremos lo menos común y te recordaremos lo importante sin llenarte de términos técnicos.',
  },
  intermediate: {
    title: 'Hablas el idioma del taller',
    body: 'Verás nombres técnicos, costos por pieza y el detalle del plan de mantenimiento.',
  },
  advanced: {
    title: 'Modo experto',
    body: 'Te mostraremos especificaciones, planes de uso severo, números de parte y fuentes del fabricante.',
  },
}

function Panel({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string
  title: string
  body?: string
  children: React.ReactNode
}) {
  const long = title.length > 42
  return (
    <div className="flex min-h-full flex-col pb-2">
      <p className="text-[0.8125rem] font-medium text-muted">{eyebrow}</p>
      <h1 className={cx(display, 'mt-2', long ? 'text-[1.35rem] leading-[1.22]' : 'text-[2rem] leading-[1.04]')}>{title}</h1>
      {body ? (
        <p className={cx('text-pretty text-muted', long ? 'mt-2 text-[0.875rem] leading-[1.45]' : 'mt-3 text-[0.9375rem] leading-[1.5]')}>
          {body}
        </p>
      ) : null}
      <div className={cx('flex flex-1 flex-col gap-2.5', long ? 'mt-4' : 'mt-6')}>{children}</div>
    </div>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto flex flex-col gap-2.5 pt-6">{children}</div>
}

function Pill({
  children,
  disabled,
  loading,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="inline-flex h-[3.25rem] w-full select-none items-center justify-center gap-2 rounded-full bg-inverse text-[1rem] font-medium text-on-inverse transition-transform duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      <span>{children}</span>
      {loading ? null : <ArrowRight className="size-[1.1em]" strokeWidth={2.2} aria-hidden />}
    </button>
  )
}

function Quiet({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 text-[0.9375rem] font-medium text-muted disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function Option({
  title,
  body,
  selected,
  onClick,
}: {
  title: string
  body?: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected ?? false}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cx(
        'flex min-h-14 items-center gap-3 rounded-[1rem] border border-white/80 bg-surface p-4 text-left shadow-card transition-colors',
        selected && 'ring-2 ring-ink',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.98rem] font-medium">{title}</span>
        {body ? <span className="mt-0.5 block text-[0.84rem] text-muted">{body}</span> : null}
      </span>
      <span
        className={cx(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-2',
          selected ? 'bg-inverse text-on-inverse ring-inverse' : 'ring-[#c9cacd]',
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
    </motion.button>
  )
}

const USAGE_PRESETS = [
  { id: 'daily', label: 'Todos los días, al trabajo o a estudiar', days: 5 },
  { id: 'some', label: 'Algunos días a la semana', days: 3 },
  { id: 'weekend', label: 'Casi solo fines de semana', days: 2 },
]

function UsageStep({
  vehicleId,
  measure,
  explain,
  onNext,
}: {
  vehicleId: string
  measure: 'km' | 'mi'
  explain: boolean
  onNext: () => void
}) {
  const [preset, setPreset] = useState<string | null>(null)
  const [distance, setDistance] = useState('')
  const [error, setError] = useState<string | null>(null)
  const save = useSaveRoutine()
  const chosen = USAGE_PRESETS.find((p) => p.id === preset)

  return (
    <Panel
      eyebrow="Uso"
      title="¿Cómo usas tu Vehículo?"
      body="Con esto calculamos cuándo te toca cada mantenimiento, incluso antes de que actualices el kilometraje."
    >
      <div className="flex flex-col gap-2.5" role="radiogroup">
        {USAGE_PRESETS.map((p) => (
          <Option key={p.id} title={p.label} selected={preset === p.id} onClick={() => setPreset(p.id)} />
        ))}
      </div>
      {chosen ? (
        <TextField
          label="Distancia de ida y vuelta en un día normal"
          inputMode="decimal"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          suffix={measure}
          hint={explain ? 'Un cálculo aproximado está bien. Puedes verlo en tu app de mapas.' : undefined}
          error={error}
        />
      ) : null}
      <Footer>
        <Pill
          disabled={!chosen}
          loading={save.isPending}
          onClick={() => {
            void (async () => {
              const d = parseNumber(distance)
              if (!chosen || d == null || d <= 0) return setError('Escribe la distancia aproximada.')
              try {
                await save.mutateAsync({
                  vehicleId,
                  name: chosen.id === 'weekend' ? 'Fines de semana' : chosen.id === 'daily' ? 'Trabajo o estudio' : 'Recorridos frecuentes',
                  roundTripDistance: d,
                  daysPerWeek: chosen.days,
                })
                onNext()
              } catch {
                setError('No pudimos guardar. Intenta de nuevo.')
              }
            })()
          }}
        >
          Continuar
        </Pill>
        <Quiet onClick={onNext}>Prefiero no decirlo</Quiet>
      </Footer>
    </Panel>
  )
}

const HISTORY_TASKS = [
  { code: 'engine_oil', question: '¿Cuándo le cambiaron el aceite por última vez?' },
  { code: 'tire_rotation', question: '¿Y la última rotación de llantas?' },
  { code: 'battery', question: '¿Cuándo cambiaron la batería?' },
]

const WHEN = [
  { label: '< 3 meses', months: 1 },
  { label: '3–6 meses', months: 4 },
  { label: '6–12 meses', months: 9 },
  { label: '+1 año', months: 18 },
  { label: 'No sé', months: null },
]

function monthsAgo(months: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return todayIso(d)
}

function HistoryStep({ vehicleId, explain, onNext }: { vehicleId: string; explain: boolean; onNext: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number | null | undefined>>({})
  const [busy, setBusy] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const answered = HISTORY_TASKS.filter((t) => answers[t.code] !== undefined).length

  return (
    <Panel
      eyebrow="Mantenimiento"
      title="Tu último mantenimiento"
      body={
        explain
          ? 'No pasa nada si no te acuerdas exacto. Con una idea aproximada te avisamos a tiempo.'
          : 'Aproximado basta. Luego puedes registrar los Servicios con fecha y kilometraje exactos.'
      }
    >
      {HISTORY_TASKS.map((t) => {
        const Icon = taskIcon(t.code)
        return (
          <div key={t.code} className="rounded-[1rem] border border-white/80 bg-surface p-4 shadow-card">
            <p className="flex items-center gap-2 text-[0.95rem] font-medium">
              <Icon className="size-4.5 text-ink" aria-hidden />
              {t.question}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t.question}>
              {WHEN.map((w) => (
                <button
                  key={w.label}
                  type="button"
                  role="radio"
                  aria-checked={answers[t.code] === w.months && answers[t.code] !== undefined}
                  onClick={() => setAnswers((a) => ({ ...a, [t.code]: w.months }))}
                  className={cx(
                    'min-h-10 rounded-full px-3.5 text-[0.84rem] font-semibold',
                    answers[t.code] === w.months && answers[t.code] !== undefined
                      ? 'bg-inverse text-on-inverse'
                      : 'bg-surface-2 ring-1 ring-line',
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      <Footer>
        <Pill
          loading={busy}
          onClick={() => {
            void (async () => {
              setBusy(true)
              try {
                await rememberTasks(
                  vehicleId,
                  HISTORY_TASKS.filter((t) => answers[t.code] !== undefined).flatMap((t) =>
                    // The oil filter is changed with the oil.
                    (t.code === 'engine_oil' ? ['engine_oil', 'oil_filter'] : [t.code]).map((code) => ({
                      taskCode: code,
                      unknown: answers[t.code] === null,
                      rememberedOn: answers[t.code] == null ? null : monthsAgo(answers[t.code]!),
                      reading: null,
                    })),
                  ),
                )
                if (user) void queryClient.invalidateQueries({ queryKey: garageQueryKey(user.id) })
              } finally {
                setBusy(false)
                onNext()
              }
            })()
          }}
        >
          {answered > 0 ? 'Calcular mis avisos' : 'Continuar'}
        </Pill>
      </Footer>
    </Panel>
  )
}
