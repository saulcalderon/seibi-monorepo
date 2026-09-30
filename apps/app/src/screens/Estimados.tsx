import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUp,
  Building2,
  Calculator,
  CalendarPlus,
  CarFront,
  ExternalLink,
  Info,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Store,
} from 'lucide-react'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { useChat, useSendChat, type ChatMessage } from '../lib/chat'
import { useRequestEstimate, useEstimateHistory, type Estimate, type EstimateResult } from '../lib/estimates'
import { errorMessage } from '../lib/functions'
import { formatDay, formatUsdRange, todayIso, vehicleName } from '../lib/format'
import { useGarage, type VehicleView } from '../lib/garage'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import { COUNTRIES, useProfile, useUpdateProfile, type Country } from '../lib/profile'
import { taskIcon, taskMap } from '../lib/tasks'
import { plainText } from '../lib/text'
import { useActiveVehicle } from '../lib/activeVehicle'
import { Button, IconButton } from '../ui/Button'
import { Card, IconTile, SectionHeader } from '../ui/Card'
import { cx } from '../ui/cx'
import { EmptyState, ErrorState, ScreenSkeleton } from '../ui/feedback'
import { Chip, Segmented, SelectField, TextField } from '../ui/fields'

type Mode = 'estimate' | 'chat'

const POPULAR = ['engine_oil', 'brake_pads_front', 'battery', 'tires', 'wheel_alignment', 'ac_service', 'coolant', 'spark_plugs']

export function Estimados({ vehicleParam, taskParam }: { vehicleParam?: string; taskParam?: string }) {
  const garage = useGarage()
  const { active } = useActiveVehicle(garage.vehicles)
  const actions = useActions()
  const [mode, setMode] = useState<Mode>('estimate')
  const [vehicleId, setVehicleId] = useState<string | null>(vehicleParam ?? null)
  const vehicle = garage.vehicles.find((v) => v.id === (vehicleId ?? active?.id)) ?? null

  return (
    <Screen title="Estimados" subtitle="Rangos de precio para tu Vehículo, en tu ciudad.">
      {garage.isLoading ? (
        <ScreenSkeleton />
      ) : garage.isError ? (
        <ErrorState onRetry={garage.refetch} />
      ) : !vehicle ? (
        <EmptyState
          icon={CarFront}
          title="Agrega un Vehículo"
          body="Los precios dependen de la marca, el modelo y el año. Agrega tu Vehículo para estimar."
          action={
            <Button icon={Plus} onClick={actions.addVehicle}>
              Agregar Vehículo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 px-5">
            <Segmented
              label="Modo"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'estimate', label: 'Estimar precio' },
                { value: 'chat', label: 'Chat de Seibi' },
              ]}
            />
            {garage.vehicles.length > 1 ? (
              <div className="scroll-area -mx-5 flex gap-2 overflow-x-auto px-5">
                {garage.vehicles.map((v) => (
                  <Chip key={v.id} selected={v.id === vehicle.id} onClick={() => setVehicleId(v.id)}>
                    {v.model} {v.year}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
          <LocationGate>
            {mode === 'estimate' ? (
              <EstimatePanel vehicle={vehicle} initialTask={taskParam} onAsk={() => setMode('chat')} />
            ) : (
              <ChatPanel vehicle={vehicle} />
            )}
          </LocationGate>
        </div>
      )}
    </Screen>
  )
}

/** Estimates need a country and city. Ask right here if missing. */
function LocationGate({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  const update = useUpdateProfile()
  const [country, setCountry] = useState<Country>('SV')
  const [city, setCity] = useState('')
  if (profile.isLoading) return null
  if (profile.data?.country) return <>{children}</>
  return (
    <Card className="mx-5 flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={MapPin} tone="radiant" />
        <div>
          <p className="font-bold">¿Dónde está tu Vehículo?</p>
          <p className="text-[0.82rem] text-muted">Los precios cambian mucho de una ciudad a otra.</p>
        </div>
      </div>
      <SelectField label="País" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
        {COUNTRIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.flag} {c.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Salvador" />
      <Button
        loading={update.isPending}
        disabled={city.trim().length < 2}
        onClick={() => update.mutate({ country, city })}
      >
        Guardar ubicación
      </Button>
    </Card>
  )
}

const STEPS = ['Buscando precios en tu zona…', 'Comparando fuentes…', 'Ordenando los resultados…']

function EstimatePanel({
  vehicle,
  initialTask,
  onAsk,
}: {
  vehicle: VehicleView
  initialTask?: string
  onAsk: () => void
}) {
  const garage = useGarage()
  const profile = useProfile()
  const k = knowledgeProfile(profile.data?.knowledgeLevel)
  const byCode = taskMap(garage.tasks)
  const request = useRequestEstimate()
  const history = useEstimateHistory()
  const actions = useActions()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Omit<Estimate, 'vehicleId'> | null>(null)
  const [step, setStep] = useState(0)
  const autoRan = useRef(false)

  async function run(input: { taskCode?: string; query?: string }) {
    setResult(null)
    setStep(0)
    try {
      const data = await request.mutateAsync({ vehicleId: vehicle.id, ...input })
      setResult(data)
    } catch {
      // Shown below from request.error.
    }
  }

  useEffect(() => {
    if (initialTask && !autoRan.current && byCode.has(initialTask)) {
      autoRan.current = true
      void run({ taskCode: initialTask })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTask, byCode.size])

  useEffect(() => {
    if (!request.isPending) return
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4500)
    return () => window.clearInterval(t)
  }, [request.isPending])

  const pending = vehicle.reminders
    .filter((r) => r.status === 'overdue' || r.status === 'soon')
    .map((r) => r.taskCode)
  const suggestions = [...pending, ...POPULAR].filter((c, i, a) => a.indexOf(c) === i && byCode.has(c)).slice(0, 8)
  const pastForVehicle = (history.data ?? []).filter((e) => e.vehicleId === vehicle.id)

  return (
    <div className="flex flex-col gap-5 px-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (query.trim().length >= 3) void run({ query })
        }}
        className="relative"
      >
        <label className="sr-only" htmlFor="estimate-query">
          ¿Qué quieres cotizar?
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="estimate-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej. cambio de alternador, pastillas de freno"
          className="h-13 w-full rounded-2xl bg-surface pl-11 pr-14 text-[0.95rem] shadow-card ring-1 ring-line placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-radiant"
        />
        <IconButton
          icon={ArrowUp}
          label="Estimar"
          variant="inverse"
          type="submit"
          disabled={query.trim().length < 3 || request.isPending}
          className="absolute right-1 top-1/2 size-11 -translate-y-1/2"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((code) => {
          const Icon = taskIcon(code)
          return (
            <button
              key={code}
              type="button"
              disabled={request.isPending}
              onClick={() => void run({ taskCode: code })}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-[0.84rem] font-semibold ring-1 ring-line disabled:opacity-50"
            >
              <Icon className="size-4" aria-hidden />
              {taskLabel(byCode.get(code), code, k)}
              {pending.includes(code) ? <span className="size-1.5 rounded-full bg-overdue" aria-label="Pendiente" /> : null}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {request.isPending ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="flex flex-col items-center gap-4 p-8 text-center" aria-live="polite">
              <motion.span
                className="inline-flex size-14 items-center justify-center rounded-2xl bg-radiant-soft text-radiant"
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              >
                <Calculator className="size-7" aria-hidden />
              </motion.span>
              <p className="font-semibold">{STEPS[step]}</p>
              <p className="text-[0.82rem] text-muted">Puede tardar hasta un minuto.</p>
            </Card>
          </motion.div>
        ) : request.isError ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-4 text-[0.9rem] text-overdue">{errorMessage(request.error)}</Card>
          </motion.div>
        ) : result ? (
          <motion.div key={result.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <EstimateCard
              estimate={result}
              vehicle={vehicle}
              onAsk={onAsk}
              onPlan={() => actions.planAppointment(vehicle.id, result.taskCode ? [result.taskCode] : [])}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {pastForVehicle.length > 0 && !request.isPending ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Consultas anteriores" />
          <Card className="divide-y divide-line overflow-hidden">
            {pastForVehicle.slice(0, 6).map((e) => (
              <button
                key={`${e.id}-${e.createdAt}`}
                type="button"
                onClick={() => setResult(e)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
              >
                <IconTile icon={taskIcon(e.taskCode)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold">{e.result.title || e.query}</p>
                  <p className="text-[0.78rem] text-muted">
                    {formatUsdRange(e.result.total_independent) ?? 'Sin rango'} · {formatDay(todayIso(new Date(e.createdAt)))}
                  </p>
                </div>
              </button>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  )
}

const CONFIDENCE = {
  high: { label: 'Confianza alta', bars: 3 },
  medium: { label: 'Confianza media', bars: 2 },
  low: { label: 'Confianza baja', bars: 1 },
} as const

function EstimateCard({
  estimate,
  vehicle,
  onAsk,
  onPlan,
}: {
  estimate: Omit<Estimate, 'vehicleId'>
  vehicle: VehicleView
  onAsk: () => void
  onPlan: () => void
}) {
  const r: EstimateResult = estimate.result
  const conf = CONFIDENCE[r.confidence] ?? CONFIDENCE.low
  const place = [estimate.city, COUNTRIES.find((c) => c.id === estimate.country)?.name].filter(Boolean).join(', ')

  return (
    <Card className="overflow-hidden">
      <div className="bg-inverse px-5 py-4 text-on-inverse">
        <p className="text-[0.78rem] font-semibold opacity-70">
          {vehicleName(vehicle)} {vehicle.year} · {place}
        </p>
        <h2 className="mt-0.5 text-[1.25rem]">{r.title || estimate.query}</h2>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {!r.found ? (
          <p className="text-[0.9rem] text-muted [overflow-wrap:anywhere]">{plainText(r.summary)}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <PriceTile icon={Store} label="Taller independiente" value={formatUsdRange(r.total_independent)} />
              <PriceTile icon={Building2} label="Agencia" value={formatUsdRange(r.total_dealership)} />
            </div>
            <dl className="flex flex-col gap-2 text-[0.88rem]">
              {[
                ['Piezas económicas', r.parts_economy],
                ['Piezas originales', r.parts_oem],
                ['Mano de obra', r.labor],
              ].map(([label, range]) =>
                range ? (
                  <div key={label as string} className="flex justify-between gap-3">
                    <dt className="text-muted">{label as string}</dt>
                    <dd className="font-semibold tabular">{formatUsdRange(range as EstimateResult['labor'])}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            <p className="text-[0.88rem] text-muted [overflow-wrap:anywhere]">{plainText(r.summary)}</p>
            {r.includes.length > 0 ? (
              <div>
                <p className="text-[0.8rem] font-bold text-muted">Suele incluir</p>
                <ul className="mt-1 list-inside list-disc text-[0.86rem]">
                  {r.includes.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {r.factors.length > 0 ? (
              <div>
                <p className="text-[0.8rem] font-bold text-muted">Qué mueve el precio</p>
                <ul className="mt-1 list-inside list-disc text-[0.86rem]">
                  {r.factors.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <div className="flex items-center gap-2" aria-label={conf.label}>
          <span className="flex gap-0.5" aria-hidden>
            {[1, 2, 3].map((b) => (
              <span key={b} className={cx('h-3 w-1.5 rounded-full', b <= conf.bars ? 'bg-ink' : 'bg-surface-3')} />
            ))}
          </span>
          <span className="text-[0.8rem] font-semibold text-muted">{conf.label}</span>
        </div>

        {r.sources.length > 0 ? (
          <div>
            <p className="text-[0.8rem] font-bold text-muted">Fuentes</p>
            <ul className="mt-1 flex flex-col gap-1">
              {r.sources.slice(0, 5).map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 text-[0.82rem] font-semibold text-radiant"
                  >
                    <span className="truncate">{s.title}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="flex gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-[0.78rem] text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Estimado, no presupuesto. Los precios cambian según la ciudad, el año y el motor, la calidad y el
          origen de la pieza, el tipo de taller, la mano de obra y la disponibilidad. Pide una cotización
          antes de hacer el trabajo.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={MessageCircle} onClick={onAsk}>
            Preguntar
          </Button>
          <Button variant="secondary" icon={CalendarPlus} onClick={onPlan}>
            Agendar
          </Button>
        </div>
      </div>
    </Card>
  )
}

function PriceTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5">
      <Icon className="size-4 text-muted" aria-hidden />
      <p className="mt-1.5 text-[0.75rem] font-semibold text-muted">{label}</p>
      <p className="text-[1.05rem] font-bold tabular leading-tight">{value ?? 'Sin datos'}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------

const STARTERS: Record<'guided' | 'expert', string[]> = {
  guided: [
    '¿Qué pasa si no cambio el aceite a tiempo?',
    'Hace un ruido al frenar, ¿es grave?',
    '¿Qué le debo pedir al mecánico en mi próximo Servicio?',
  ],
  expert: [
    '¿Qué aceite y cuántos litros lleva mi motor?',
    '¿Cuándo toca la banda de distribución en mi modelo?',
    '¿Pastillas cerámicas o semimetálicas para mi uso?',
  ],
}

function ChatPanel({ vehicle }: { vehicle: VehicleView }) {
  const chat = useChat()
  const send = useSendChat()
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel)
  const [text, setText] = useState('')
  const [pendingText, setPendingText] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const messages = chat.data ?? []
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, pendingText])

  async function submit(message: string) {
    const m = message.trim()
    if (m.length < 2 || send.isPending) return
    setText('')
    setPendingText(m)
    try {
      await send.mutateAsync({ message: m, vehicleId: vehicle.id })
    } finally {
      setPendingText(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 px-5">
      <p className="text-[0.8rem] text-muted">
        Pregunta sobre tu {vehicle.brand} {vehicle.model}: mantenimiento, fallas, piezas o precios. Las respuestas
        citan sus fuentes y los precios son estimados.
      </p>

      {chat.isLoading ? null : messages.length === 0 && !pendingText ? (
        <div className="flex flex-col gap-2">
          {STARTERS[k.detailed ? 'expert' : 'guided'].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void submit(q)}
              className="rounded-2xl bg-surface px-4 py-3 text-left text-[0.9rem] font-medium shadow-card"
            >
              {q}
            </button>
          ))}
        </div>
      ) : (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {pendingText ? (
            <>
              <Bubble message={{ id: 'p', role: 'user', content: pendingText, sources: [], createdAt: '', vehicleId: null }} />
              <li className="flex">
                <span className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3 shadow-card" aria-label="Seibi está escribiendo">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                    />
                  ))}
                </span>
              </li>
            </>
          ) : null}
        </ol>
      )}
      {send.isError ? <p className="text-[0.85rem] text-overdue">{errorMessage(send.error)}</p> : null}
      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit(text)
        }}
        className="sticky bottom-[calc(var(--dock-height)+var(--safe-bottom)+1rem)] mt-2 flex items-end gap-2 rounded-[1.25rem] bg-surface p-1.5 shadow-float ring-1 ring-line"
      >
        <label htmlFor="chat-input" className="sr-only">
          Tu pregunta
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit(text)
            }
          }}
          placeholder="Escribe tu pregunta"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.95rem] focus:outline-none"
        />
        <IconButton
          icon={ArrowUp}
          label="Enviar"
          variant="inverse"
          type="submit"
          disabled={text.trim().length < 2 || send.isPending}
        />
      </form>
      <button
        type="button"
        className="self-start text-[0.78rem] text-subtle underline"
        onClick={() => void navigate({ to: '/legal/terminos' })}
      >
        Cómo usamos la IA
      </button>
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <li className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[85%] rounded-2xl px-4 py-3 text-[0.92rem] leading-relaxed',
          mine ? 'rounded-br-md bg-inverse text-on-inverse' : 'rounded-bl-md bg-surface shadow-card',
        )}
      >
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{mine ? message.content : plainText(message.content)}</p>
        {!mine && message.sources.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
            {message.sources.slice(0, 3).map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-[0.78rem] font-semibold text-radiant"
                >
                  <span className="truncate">{s.title}</span>
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  )
}
