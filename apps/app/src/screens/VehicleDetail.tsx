import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  Archive,
  BellPlus,
  CalendarClock,
  CalendarPlus,
  CarFront,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useActions } from '../app/Actions'
import { Screen } from '../app/Screen'
import { ReminderRow } from '../components/ReminderRow'
import { UnknownTasks } from '../components/UnknownTasks'
import { VehicleHero } from '../components/VehicleHero'
import { daysBetween } from '@seibi/maintenance-engine/days'
import { errorMessage } from '../lib/functions'
import {
  formatDay,
  formatMonth,
  formatNumber,
  formatUsd,
  relativeDays,
  todayIso,
  vehicleName,
} from '../lib/format'
import { useGarage, type ServiceRecord, type VehicleView } from '../lib/garage'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import {
  invoiceUrl,
  useCancelAppointment,
  useCompleteManualReminder,
  useCorrectReading,
  useDeleteManualReminder,
  useRefreshVehicleData,
  useWithdrawService,
  useWithdrawVehicle,
} from '../lib/mutations'
import { paintLabel } from '../lib/paint'
import { useProfile } from '../lib/profile'
import { taskIcon, taskMap } from '../lib/tasks'
import { Button, IconButton } from '../ui/Button'
import { Card, IconTile, SectionHeader } from '../ui/Card'
import { cx } from '../ui/cx'
import { EmptyState, ErrorState, ScreenSkeleton, STATUS_META, useToast } from '../ui/feedback'
import { parseNumber, TextField } from '../ui/fields'
import { Sheet } from '../ui/Sheet'

export type DetailTab = 'mantenimiento' | 'historial' | 'uso' | 'datos'

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'historial', label: 'Historial' },
  { id: 'uso', label: 'Uso' },
  { id: 'datos', label: 'Datos' },
]

export function VehicleDetail({ vehicleId, tab }: { vehicleId: string; tab: DetailTab }) {
  const garage = useGarage()
  const actions = useActions()
  const navigate = useNavigate()
  const vehicle = garage.vehicles.find((v) => v.id === vehicleId)

  if (garage.isLoading) {
    return (
      <Screen back>
        <ScreenSkeleton />
      </Screen>
    )
  }
  if (garage.isError) {
    return (
      <Screen back>
        <ErrorState onRetry={garage.refetch} />
      </Screen>
    )
  }
  if (!vehicle) {
    return (
      <Screen back>
        <EmptyState
          icon={CarFront}
          title="No encontramos este Vehículo"
          body="Puede que lo hayas retirado de tu flota."
          action={<Button onClick={() => void navigate({ to: '/flota' })}>Ir a Mi flota</Button>}
        />
      </Screen>
    )
  }

  const setTab = (t: DetailTab) =>
    void navigate({
      to: '/flota/$vehicleId',
      params: { vehicleId },
      search: { tab: t },
      replace: true,
    })

  return (
    <Screen
      back
      title={vehicleName(vehicle)}
      subtitle={[vehicle.year, vehicle.trimLevel, vehicle.plate].filter(Boolean).join(' · ')}
      actions={<IconButton icon={Pencil} label="Editar Vehículo" variant="secondary" onClick={() => actions.editVehicle(vehicle)} />}
    >
      <VehicleHero vehicle={vehicle} className="-mt-2 h-56" />

      <div className="mx-5 mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => actions.updateMileage(vehicle.id)}
          className="rounded-2xl bg-surface p-3 text-left shadow-card"
        >
          <Gauge className="size-4 text-muted" aria-hidden />
          <p className="mt-1.5 text-[0.95rem] font-bold tabular leading-tight">
            {vehicle.odometer != null ? formatNumber(vehicle.odometer) : '—'}
          </p>
          <p className="text-[0.72rem] text-muted">{vehicle.measure} · actualizar</p>
        </button>
        <div className="rounded-2xl bg-surface p-3 shadow-card">
          <ShieldCheck className={cx('size-4', STATUS_META[vehicle.health].text)} aria-hidden />
          <p className="mt-1.5 text-[0.95rem] font-bold leading-tight">{STATUS_META[vehicle.health].label}</p>
          <p className="text-[0.72rem] text-muted">
            {vehicle.pending > 0 ? `${vehicle.pending} pendiente${vehicle.pending > 1 ? 's' : ''}` : 'estado'}
          </p>
        </div>
        <button type="button" onClick={() => setTab('uso')} className="rounded-2xl bg-surface p-3 text-left shadow-card">
          <Route className="size-4 text-muted" aria-hidden />
          <p className="mt-1.5 text-[0.95rem] font-bold tabular leading-tight">
            {vehicle.usage ? formatNumber(vehicle.usage.perDay * 7) : '—'}
          </p>
          <p className="text-[0.72rem] text-muted">{vehicle.measure} por semana</p>
        </button>
      </div>

      <div role="tablist" aria-label="Secciones" className="scroll-area mx-5 mt-5 flex gap-1 overflow-x-auto rounded-2xl bg-surface-3 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="relative min-h-10 flex-1 rounded-xl px-3 text-[0.85rem] font-semibold"
          >
            {tab === t.id ? (
              <motion.span
                layoutId="detail-tab"
                className="absolute inset-0 -z-0 rounded-xl bg-surface shadow-card"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className={cx('relative', tab === t.id ? 'text-ink' : 'text-muted')}>{t.label}</span>
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-5 flex flex-col gap-6 px-5"
      >
        {tab === 'mantenimiento' ? <MaintenanceTab vehicle={vehicle} /> : null}
        {tab === 'historial' ? <HistoryTab vehicle={vehicle} /> : null}
        {tab === 'uso' ? <UsageTab vehicle={vehicle} /> : null}
        {tab === 'datos' ? <DataTab vehicle={vehicle} /> : null}
      </motion.div>
    </Screen>
  )
}

// ---------------------------------------------------------------------------

function ScheduleBanner({ vehicle }: { vehicle: VehicleView }) {
  const refresh = useRefreshVehicleData()
  if (vehicle.scheduleSource === 'pending') {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-radiant-soft px-4 py-3 text-[0.84rem] font-medium text-radiant">
        <Search className="size-4 shrink-0 animate-pulse" aria-hidden />
        Buscando el plan del fabricante para tu {vehicle.model}. Mientras tanto usamos recomendaciones generales.
      </p>
    )
  }
  if (vehicle.scheduleSource === 'model') {
    return (
      <div className="rounded-2xl bg-ok-soft px-4 py-3 text-[0.84rem] text-ok">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Plan del fabricante para tu {vehicle.brand} {vehicle.model} {vehicle.year}
        </p>
        {vehicle.schedule?.summary ? <p className="mt-1 opacity-90">{vehicle.schedule.summary}</p> : null}
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-surface-3 px-4 py-3 text-[0.84rem] text-muted">
      <p className="font-semibold text-ink">Recomendación general, no específica de tu modelo</p>
      <p className="mt-1">
        {vehicle.schedule?.status === 'general'
          ? vehicle.schedule.summary ?? 'No encontramos un plan publicado por el fabricante para este modelo.'
          : 'Aún no tenemos el plan del fabricante para este modelo.'}{' '}
        Revisa el manual del propietario si lo tienes.
      </p>
      {vehicle.schedule?.status !== 'general' ? (
        <Button
          size="sm"
          variant="secondary"
          icon={RefreshCw}
          className="mt-2.5"
          loading={refresh.isPending}
          onClick={() => refresh.mutate(vehicle.id)}
        >
          Buscar plan del fabricante
        </Button>
      ) : null}
    </div>
  )
}

function MaintenanceTab({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const garage = useGarage()
  const profile = useProfile()
  const byCode = taskMap(garage.tasks)
  const cancel = useCancelAppointment()
  const complete = useCompleteManualReminder()
  const remove = useDeleteManualReminder()
  const toast = useToast()
  const today = todayIso()

  const groups = (['overdue', 'soon', 'ok'] as const)
    .map((status) => ({
      status,
      items: vehicle.reminders.filter((r) => r.status === status),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <ScheduleBanner vehicle={vehicle} />

      <UnknownTasks
        vehicleId={vehicle.id}
        reminders={vehicle.reminders.filter((r) => r.status === 'unknown')}
        tasks={byCode}
        level={profile.data?.knowledgeLevel}
      />

      {groups.map((g) => (
        <section key={g.status} className="flex flex-col gap-3">
          <SectionHeader title={`${STATUS_META[g.status].label} (${g.items.length})`} />
          <Card className="divide-y divide-line overflow-hidden">
            {g.items.map((r) => (
              <ReminderRow
                key={r.taskCode}
                reminder={r}
                task={byCode.get(r.taskCode)}
                measure={vehicle.measure}
                level={profile.data?.knowledgeLevel}
                onClick={() => actions.openReminder(vehicle.id, r.taskCode)}
              />
            ))}
          </Card>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Citas y recordatorios" />
        {vehicle.upcomingAppointments.length === 0 && vehicle.openManualReminders.length === 0 ? (
          <p className="px-1 text-[0.88rem] text-muted">
            Guarda fechas de citas en el taller o cosas como el seguro y la revisión técnica.
          </p>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {vehicle.upcomingAppointments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <IconTile icon={CalendarClock} tone="radiant" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold">
                    {a.taskCodes.length > 0
                      ? a.taskCodes.map((c) => taskLabel(byCode.get(c), c, knowledgeProfile(profile.data?.knowledgeLevel))).join(', ')
                      : 'Cita en el taller'}
                  </p>
                  <p className="text-[0.8rem] text-muted">
                    {formatDay(a.scheduledOn, 'long')} · {relativeDays(daysBetween(today, a.scheduledOn))}
                    {a.shop ? ` · ${a.shop}` : ''}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        actions.logService({ vehicleId: vehicle.id, taskCodes: a.taskCodes, appointmentId: a.id, shop: a.shop })
                      }
                    >
                      Marcar hecho
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={cancel.isPending}
                      onClick={async () => {
                        await cancel.mutateAsync(a.id)
                        toast('Cita cancelada')
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {vehicle.openManualReminders.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <IconTile icon={BellPlus} tone={m.dueOn < today ? 'overdue' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold">{m.title}</p>
                  <p className="text-[0.8rem] text-muted">
                    {formatDay(m.dueOn, 'long')} · {relativeDays(daysBetween(today, m.dueOn))}
                  </p>
                  {m.notes ? <p className="mt-1 text-[0.8rem] text-muted">{m.notes}</p> : null}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await complete.mutateAsync({ id: m.id, done: true })
                    toast('Hecho')
                  }}
                >
                  Hecho
                </Button>
                <IconButton
                  icon={Trash2}
                  label="Eliminar recordatorio"
                  className="text-muted"
                  onClick={async () => {
                    await remove.mutateAsync(m.id)
                    toast('Recordatorio eliminado')
                  }}
                />
              </div>
            ))}
          </Card>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={CalendarPlus} onClick={() => actions.planAppointment(vehicle.id)}>
            Agendar Cita
          </Button>
          <Button variant="secondary" icon={BellPlus} onClick={() => actions.addReminder(vehicle.id)}>
            Recordatorio
          </Button>
        </div>
      </section>
    </>
  )
}

function HistoryTab({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const [correcting, setCorrecting] = useState<{ id: string; reading: number } | null>(null)

  const byMonth = useMemo(() => {
    const map = new Map<string, ServiceRecord[]>()
    for (const s of vehicle.services) {
      const key = s.performedOn.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.entries()]
  }, [vehicle.services])

  const yearTotal = vehicle.services
    .filter((s) => s.performedOn.slice(0, 4) === todayIso().slice(0, 4))
    .reduce((sum, s) => sum + (s.totalCost ?? 0), 0)

  const readings = [...vehicle.readings]
    .sort((a, b) => (a.recordedOn === b.recordedOn ? b.reading - a.reading : a.recordedOn < b.recordedOn ? 1 : -1))
    .slice(0, 8)

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-4">
          <p className="text-[0.75rem] font-semibold text-muted">Servicios</p>
          <p className="text-[1.3rem] font-bold tabular">{vehicle.services.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[0.75rem] font-semibold text-muted">Gastado este año</p>
          <p className="text-[1.3rem] font-bold tabular">{formatUsd(yearTotal)}</p>
        </Card>
      </div>

      <Button icon={Plus} onClick={() => actions.logService({ vehicleId: vehicle.id })}>
        Registrar Servicio
      </Button>

      {byMonth.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sin Servicios todavía"
          body="Registra mantenimientos y reparaciones, incluso de fechas pasadas, para tener el historial completo."
        />
      ) : (
        byMonth.map(([month, services]) => (
          <section key={month} className="flex flex-col gap-3">
            <SectionHeader title={formatMonth(`${month}-01`)} />
            {services.map((s) => (
              <ServiceCard key={s.id} vehicle={vehicle} service={s} />
            ))}
          </section>
        ))
      )}

      {readings.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Lecturas de kilometraje" />
          <Card className="divide-y divide-line overflow-hidden">
            {readings.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setCorrecting({ id: r.id, reading: r.reading })}
                className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left"
              >
                <Gauge className="size-4 text-muted" aria-hidden />
                <span className="flex-1 text-[0.9rem] font-semibold tabular">
                  {formatNumber(r.reading)} {vehicle.measure}
                </span>
                <span className="text-[0.8rem] text-muted">{formatDay(r.recordedOn)}</span>
                <Pencil className="size-3.5 text-subtle" aria-hidden />
              </button>
            ))}
          </Card>
        </section>
      ) : null}

      <CorrectReadingSheet
        target={correcting}
        measure={vehicle.measure}
        onClose={() => setCorrecting(null)}
      />
    </>
  )
}

function ServiceCard({ vehicle, service }: { vehicle: VehicleView; service: ServiceRecord }) {
  const actions = useActions()
  const garage = useGarage()
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel)
  const byCode = taskMap(garage.tasks)
  const withdraw = useWithdrawService()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const first = service.items[0]

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <IconTile icon={first?.taskCode ? taskIcon(first.taskCode) : Wrench} tone={service.type === 'repair' ? 'soon' : 'neutral'} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold">
            {service.items
              .map((i) => (i.taskCode ? taskLabel(byCode.get(i.taskCode), i.taskCode, k) : i.name))
              .join(', ')}
          </p>
          <p className="text-[0.8rem] text-muted">
            {formatDay(service.performedOn)}
            {service.reading != null ? ` · ${formatNumber(service.reading)} ${vehicle.measure}` : ''}
            {service.type === 'repair' ? ' · Reparación' : ''}
          </p>
        </div>
        {service.totalCost != null ? (
          <span className="text-[0.92rem] font-bold tabular">{formatUsd(service.totalCost)}</span>
        ) : null}
      </button>
      {open ? (
        <div className="border-t border-line px-4 py-3 text-[0.86rem]">
          <ul className="flex flex-col gap-1.5">
            {service.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>
                  {i.taskCode ? taskLabel(byCode.get(i.taskCode), i.taskCode, k) : i.name}
                  {i.partBrand || i.partNumber ? (
                    <span className="text-muted"> · {[i.partBrand, i.partNumber].filter(Boolean).join(' ')}</span>
                  ) : null}
                </span>
                {i.cost != null ? <span className="tabular text-muted">{formatUsd(i.cost, true)}</span> : null}
              </li>
            ))}
          </ul>
          {service.shop ? <p className="mt-2 text-muted">Taller: {service.shop}</p> : null}
          {service.notes ? <p className="mt-1 text-muted">{service.notes}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {service.invoicePath ? (
              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                onClick={async () => {
                  try {
                    window.open(await invoiceUrl(service.invoicePath!), '_blank', 'noopener')
                  } catch (e) {
                    toast(errorMessage(e), 'error')
                  }
                }}
              >
                Factura
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              icon={Pencil}
              onClick={() => actions.logService({ vehicleId: vehicle.id, service })}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Archive}
              loading={withdraw.isPending}
              onClick={async () => {
                if (!window.confirm('¿Quitar este Servicio del historial? El kilometraje registrado se conserva.')) return
                await withdraw.mutateAsync(service.id)
                toast('Servicio quitado del historial')
              }}
            >
              Quitar
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function CorrectReadingSheet({
  target,
  measure,
  onClose,
}: {
  target: { id: string; reading: number } | null
  measure: string
  onClose: () => void
}) {
  const correct = useCorrectReading()
  const toast = useToast()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <Sheet
      open={Boolean(target)}
      onClose={onClose}
      title="Corregir lectura"
      description="Si anotaste mal un número, corrígelo aquí. No afecta la fecha."
    >
      {target ? (
        <form
          className="flex flex-col gap-4 pb-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const n = parseNumber(value)
            if (n == null || n < 0) return setError('Escribe un número válido.')
            try {
              await correct.mutateAsync({ readingId: target.id, reading: n })
              toast('Lectura corregida')
              setValue('')
              onClose()
            } catch (err) {
              setError(errorMessage(err))
            }
          }}
        >
          <TextField
            label="Kilometraje correcto"
            inputMode="numeric"
            placeholder={formatNumber(target.reading)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            suffix={measure}
            error={error}
            autoFocus
          />
          <Button type="submit" size="lg" block loading={correct.isPending}>
            Guardar corrección
          </Button>
        </form>
      ) : null}
    </Sheet>
  )
}

function UsageTab({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const weekly = vehicle.routines.reduce((s, r) => s + r.roundTripDistance * r.daysPerWeek, 0)
  return (
    <>
      <Card className="p-5">
        <p className="text-[0.8rem] font-semibold text-muted">Uso estimado</p>
        <p className="mt-1 text-[1.6rem] font-bold tabular leading-tight">
          {vehicle.usage ? `${formatNumber(vehicle.usage.perDay * 7)} ${vehicle.measure}` : 'Sin datos'}
          {vehicle.usage ? <span className="text-[0.95rem] font-semibold text-muted"> por semana</span> : null}
        </p>
        <p className="mt-2 text-[0.86rem] text-muted">
          {vehicle.usage?.source === 'readings'
            ? 'Calculado con tus lecturas de kilometraje recientes.'
            : vehicle.usage?.source === 'routines'
              ? 'Calculado con tus rutinas. Con dos lecturas de kilometraje será más exacto.'
              : 'Agrega tus rutinas o actualiza el kilometraje dos veces con una semana de diferencia.'}
        </p>
        {vehicle.severe ? (
          <p className="mt-3 rounded-xl bg-soon-soft px-3 py-2 text-[0.82rem] font-medium text-soon">
            Tu uso cuenta como “severo” (mucho recorrido o viajes cortos). Si el fabricante tiene un plan
            para uso severo, lo aplicamos.
          </p>
        ) : null}
        <Button variant="secondary" icon={Gauge} className="mt-4" onClick={() => actions.updateMileage(vehicle.id)}>
          Actualizar kilometraje
        </Button>
      </Card>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Rutinas semanales" />
        {vehicle.routines.length === 0 ? (
          <p className="px-1 text-[0.88rem] text-muted">
            ¿Lo usas para ir al trabajo o a la universidad? Agrega esos recorridos y calcularemos mejor
            cuándo te toca cada mantenimiento.
          </p>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {vehicle.routines.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => actions.editRoutine(vehicle.id, r)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
              >
                <IconTile icon={Route} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold">{r.name}</p>
                  <p className="text-[0.8rem] text-muted">
                    {formatNumber(r.roundTripDistance)} {vehicle.measure} ida y vuelta · {r.daysPerWeek}{' '}
                    {r.daysPerWeek === 1 ? 'día' : 'días'} por semana
                  </p>
                </div>
                <Pencil className="size-3.5 text-subtle" aria-hidden />
              </button>
            ))}
            <div className="px-4 py-3 text-[0.82rem] text-muted">
              Total de rutinas: <strong className="tabular text-ink">{formatNumber(weekly)} {vehicle.measure}</strong> por semana
            </div>
          </Card>
        )}
        <Button variant="secondary" icon={Plus} onClick={() => actions.editRoutine(vehicle.id, null)}>
          Agregar rutina
        </Button>
      </section>
    </>
  )
}

function DataTab({ vehicle }: { vehicle: VehicleView }) {
  const actions = useActions()
  const withdraw = useWithdrawVehicle()
  const navigate = useNavigate()
  const toast = useToast()
  const rows: Array<[string, string | null]> = [
    ['Marca', vehicle.brand],
    ['Modelo', vehicle.model],
    ['Año', String(vehicle.year)],
    ['Versión', vehicle.trimLevel],
    ['Motor', vehicle.engine],
    ['Color', paintLabel(vehicle.color)],
    ['Placa', vehicle.plate],
    ['Odómetro en', vehicle.measure === 'km' ? 'Kilómetros' : 'Millas'],
  ]
  return (
    <>
      <Card className="divide-y divide-line overflow-hidden">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-[0.9rem]">
            <span className="text-muted">{label}</span>
            <span className={cx('text-right font-semibold', !value && 'font-normal text-subtle')}>{value ?? 'Sin dato'}</span>
          </div>
        ))}
      </Card>
      <Button variant="secondary" icon={Pencil} onClick={() => actions.editVehicle(vehicle)}>
        Editar datos
      </Button>

      {vehicle.schedule?.sources.length ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Fuentes del plan de mantenimiento" />
          <Card className="divide-y divide-line overflow-hidden">
            {vehicle.schedule.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center gap-3 px-4 py-3 text-[0.86rem]"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{s.title}</span>
                <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />
              </a>
            ))}
          </Card>
        </section>
      ) : null}

      <p className="px-1 text-[0.8rem] text-subtle">
        El modelo 3D es una ilustración generada a partir de la marca, el modelo, el año y el color. No es una
        foto de tu Vehículo.
      </p>

      <Button
        variant="danger"
        icon={Archive}
        loading={withdraw.isPending}
        onClick={async () => {
          if (
            !window.confirm(
              `¿Retirar ${vehicleName(vehicle)} de tu flota? Su historial se conserva y puedes restaurarlo cuando quieras.`,
            )
          )
            return
          await withdraw.mutateAsync(vehicle.id)
          toast('Vehículo retirado')
          void navigate({ to: '/flota' })
        }}
      >
        Retirar de mi flota
      </Button>
    </>
  )
}

