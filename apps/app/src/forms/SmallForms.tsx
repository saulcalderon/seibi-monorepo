import { useState, type CSSProperties } from 'react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import type { RoutineRecord, VehicleView } from '../lib/garage'
import { errorMessage } from '../lib/functions'
import { formatNumber, measureLabel, relativeDays, todayIso, vehicleName } from '../lib/format'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import {
  InputError,
  useAddReading,
  useDeleteRoutine,
  useReminderState,
  useSaveAppointment,
  useSaveManualReminder,
  useSaveRoutine,
} from '../lib/mutations'
import { paintAccent, paintHex } from '../lib/paint'
import { useProfile } from '../lib/profile'
import { orderedTaskCodes, taskIcon, taskMap, useTasks } from '../lib/tasks'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { useToast } from '../ui/feedback'
import { Field, parseNumber, SelectField, TextAreaField, TextField } from '../ui/fields'
import { Sheet } from '../ui/Sheet'

type FieldError = { field: string; message: string } | null

function useFormError() {
  const [error, setError] = useState<FieldError>(null)
  return {
    error,
    clear: () => setError(null),
    set: (e: unknown) =>
      setError(
        e instanceof InputError
          ? { field: e.field, message: e.message }
          : { field: 'form', message: errorMessage(e) },
      ),
    field: (f: string) => (error?.field === f ? error.message : null),
    form: error?.field === 'form' ? error.message : null,
  }
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-2xl bg-overdue-soft px-4 py-3 text-[0.88rem] font-medium text-overdue">
      {message}
    </p>
  )
}

function VehiclePicker({
  vehicles,
  value,
  onChange,
}: {
  vehicles: VehicleView[]
  value: string
  onChange: (id: string) => void
}) {
  if (vehicles.length < 2) return null
  return (
    <SelectField label="Vehículo" value={value} onChange={(e) => onChange(e.target.value)}>
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {vehicleName(v)} {v.year}
        </option>
      ))}
    </SelectField>
  )
}

// ---------------------------------------------------------------------------
// Mileage
// ---------------------------------------------------------------------------

export function MileageForm({
  open,
  onClose,
  vehicles,
  vehicleId,
}: {
  open: boolean
  onClose: () => void
  vehicles: VehicleView[]
  vehicleId: string | null
}) {
  return (
    <Sheet open={open} onClose={onClose} look="v3" title="Actualizar kilometraje">
      {open && vehicleId ? (
        <MileageBody vehicles={vehicles} initialId={vehicleId} onDone={onClose} />
      ) : null}
    </Sheet>
  )
}

/** "Yaris 2017 · último: 31,870 km · hace 12 días" */
function mileageContext(vehicle: VehicleView) {
  const name = `${vehicle.model} ${vehicle.year}`
  if (vehicle.odometer == null) return `${name} · sin registros todavía`
  const last = `último: ${formatNumber(vehicle.odometer)} ${measureLabel(vehicle.measure)}`
  if (!vehicle.odometerOn) return `${name} · ${last}`
  const days = Math.round((Date.parse(todayIso()) - Date.parse(vehicle.odometerOn)) / 86_400_000)
  return `${name} · ${last} · ${relativeDays(-Math.max(0, days))}`
}

const BUMPS = [100, 500, 1000]
const MAX_DIGITS = 7

function MileageBody({
  vehicles,
  initialId,
  onDone,
}: {
  vehicles: VehicleView[]
  initialId: string
  onDone: () => void
}) {
  const [vehicleId, setVehicleId] = useState(initialId)
  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const [digits, setDigits] = useState('')
  const add = useAddReading()
  const toast = useToast()
  const err = useFormError()
  const reading = digits ? Number(digits) : null
  const unit = measureLabel(vehicle?.measure ?? 'km')
  const accent = paintAccent(paintHex(vehicle?.color))
  const error = err.field('reading') ?? err.form

  const change = (next: string) => {
    err.clear()
    setDigits(next.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS))
  }

  async function submit() {
    err.clear()
    if (!vehicle) return
    try {
      if (reading == null) throw new InputError('reading', 'Escribe el número del odómetro.')
      await add.mutateAsync({ vehicle, reading })
      toast('Kilometraje actualizado')
      onDone()
    } catch (e) {
      err.set(e)
    }
  }

  return (
    <form
      className="flex flex-col pb-2"
      style={{ '--accent': accent } as CSSProperties}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {vehicle ? (
        <p className="-mt-2 font-mono text-[12px] leading-[16px] text-muted">{mileageContext(vehicle)}</p>
      ) : null}
      {vehicles.length > 1 ? (
        <div className="mt-4">
          <VehiclePicker
            vehicles={vehicles}
            value={vehicleId}
            onChange={(id) => {
              setVehicleId(id)
              err.clear()
            }}
          />
        </div>
      ) : null}
      <div
        className={cx(
          'mt-[18px] flex h-16 items-center gap-2.5 rounded-xl px-4 transition-[background-color,box-shadow] duration-200',
          error
            ? 'bg-surface shadow-[0_0_0_2px_var(--app-overdue)]'
            : 'bg-surface-2 focus-within:bg-surface focus-within:shadow-[0_0_0_2px_var(--accent)]',
        )}
      >
        <input
          aria-label="Kilometraje de hoy"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'mileage-error' : undefined}
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          enterKeyHint="done"
          placeholder={vehicle?.odometer != null ? formatNumber(vehicle.odometer) : '0'}
          value={reading != null ? formatNumber(reading) : ''}
          onChange={(e) => change(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[30px] font-light leading-none tracking-[-0.03em] tabular outline-none placeholder:text-subtle focus-visible:outline-none"
        />
        <span className="font-mono text-[14px] text-muted">{unit}</span>
      </div>
      {error ? (
        <p id="mileage-error" role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium leading-[17px] text-overdue">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        {BUMPS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => change(String((reading ?? vehicle?.odometer ?? 0) + n))}
            className="relative inline-flex h-9 items-center rounded-full bg-surface-3 px-3.5 text-[14px] font-medium tabular transition-transform duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] active:scale-[0.97]"
          >
            +{formatNumber(n)}
          </button>
        ))}
      </div>
      <p className="mb-5 mt-4 text-[14px] leading-[21px] text-muted">
        Recalculamos tus próximos mantenimientos con este dato.
      </p>
      <button
        type="submit"
        disabled={reading == null || add.isPending}
        aria-busy={add.isPending || undefined}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-inverse px-[22px] text-[16px] font-medium text-on-inverse transition-transform duration-200 active:scale-[0.97] disabled:bg-surface-3 disabled:text-[#a3a5aa] aria-busy:bg-inverse aria-busy:text-on-inverse"
      >
        {add.isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Guardando
          </>
        ) : reading != null ? (
          <span className="tabular">
            Guardar {formatNumber(reading)} {unit}
          </span>
        ) : (
          'Guardar'
        )}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

export function AppointmentForm({
  open,
  onClose,
  vehicles,
  init,
}: {
  open: boolean
  onClose: () => void
  vehicles: VehicleView[]
  init: { vehicleId: string; taskCodes?: string[] } | null
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title="Agendar Cita"
      description="Guarda la fecha de un mantenimiento que harás. Cuando lo hagas, lo marcas como hecho."
    >
      {open && init ? <AppointmentBody vehicles={vehicles} init={init} onDone={onClose} /> : null}
    </Sheet>
  )
}

function AppointmentBody({
  vehicles,
  init,
  onDone,
}: {
  vehicles: VehicleView[]
  init: { vehicleId: string; taskCodes?: string[] }
  onDone: () => void
}) {
  const { data: tasks } = useTasks()
  const byCode = taskMap(tasks)
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel)
  const [vehicleId, setVehicleId] = useState(init.vehicleId)
  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const [date, setDate] = useState('')
  const [shop, setShop] = useState('')
  const [notes, setNotes] = useState('')
  const [codes, setCodes] = useState<string[]>(init.taskCodes ?? [])
  const save = useSaveAppointment()
  const toast = useToast()
  const err = useFormError()

  const suggested = orderedTaskCodes(
    (vehicle?.reminders ?? []).filter((r) => r.status === 'overdue' || r.status === 'soon').map((r) => r.taskCode),
    tasks ?? [],
  )

  async function submit() {
    err.clear()
    try {
      await save.mutateAsync({ vehicleId, scheduledOn: date, shop, notes, taskCodes: codes })
      toast('Cita guardada')
      onDone()
    } catch (e) {
      err.set(e)
    }
  }

  return (
    <form
      className="flex flex-col gap-5 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <VehiclePicker vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
      <TextField
        label="Fecha"
        type="date"
        min={todayIso()}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={err.field('scheduledOn')}
      />
      <Field label="¿Para qué es?" optional>
        <div className="flex flex-wrap gap-2">
          {suggested.slice(0, 14).map((code) => {
            const Icon = taskIcon(code)
            const on = codes.includes(code)
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => setCodes((c) => (on ? c.filter((x) => x !== code) : [...c, code]))}
                className={cx(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[0.84rem] font-semibold',
                  on ? 'bg-inverse text-on-inverse' : 'bg-surface ring-1 ring-line',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {taskLabel(byCode.get(code), code, k)}
              </button>
            )
          })}
        </div>
      </Field>
      <TextField label="Taller" optional value={shop} onChange={(e) => setShop(e.target.value)} />
      <TextAreaField label="Notas" optional value={notes} onChange={(e) => setNotes(e.target.value)} />
      <FormError message={err.form} />
      <Button type="submit" size="lg" block loading={save.isPending}>
        Guardar Cita
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Hand-written Reminder
// ---------------------------------------------------------------------------

export function ManualReminderForm({
  open,
  onClose,
  vehicles,
  vehicleId,
}: {
  open: boolean
  onClose: () => void
  vehicles: VehicleView[]
  vehicleId: string | null
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo Recordatorio"
      description="Para cosas con fecha: marchamo, seguro, revisión técnica, garantía…"
    >
      {open && vehicleId ? <ManualReminderBody vehicles={vehicles} initialId={vehicleId} onDone={onClose} /> : null}
    </Sheet>
  )
}

function ManualReminderBody({
  vehicles,
  initialId,
  onDone,
}: {
  vehicles: VehicleView[]
  initialId: string
  onDone: () => void
}) {
  const [vehicleId, setVehicleId] = useState(initialId)
  const [title, setTitle] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [notes, setNotes] = useState('')
  const save = useSaveManualReminder()
  const toast = useToast()
  const err = useFormError()

  async function submit() {
    err.clear()
    try {
      await save.mutateAsync({ vehicleId, title, dueOn, notes })
      toast('Recordatorio guardado')
      onDone()
    } catch (e) {
      err.set(e)
    }
  }

  return (
    <form
      className="flex flex-col gap-5 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <VehiclePicker vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
      <TextField
        label="¿Qué quieres recordar?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Renovar el seguro"
        error={err.field('title')}
      />
      <TextField
        label="Fecha"
        type="date"
        value={dueOn}
        onChange={(e) => setDueOn(e.target.value)}
        error={err.field('dueOn')}
      />
      <TextAreaField label="Notas" optional value={notes} onChange={(e) => setNotes(e.target.value)} />
      <FormError message={err.form} />
      <Button type="submit" size="lg" block loading={save.isPending}>
        Guardar
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Routine
// ---------------------------------------------------------------------------

export function RoutineForm({
  open,
  onClose,
  vehicle,
  routine,
}: {
  open: boolean
  onClose: () => void
  vehicle: VehicleView | null
  routine?: RoutineRecord | null
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={routine ? 'Editar Rutina' : 'Agregar Rutina'}
      description="Un recorrido que repites cada semana. Nos ayuda a calcular cuánto usas tu Vehículo."
    >
      {open && vehicle ? <RoutineBody vehicle={vehicle} routine={routine ?? null} onDone={onClose} /> : null}
    </Sheet>
  )
}

const ROUTINE_PRESETS = ['Trabajo', 'Universidad', 'Colegio de los niños', 'Supermercado', 'Gimnasio']

function RoutineBody({
  vehicle,
  routine,
  onDone,
}: {
  vehicle: VehicleView
  routine: RoutineRecord | null
  onDone: () => void
}) {
  const [name, setName] = useState(routine?.name ?? '')
  const [distance, setDistance] = useState(routine ? String(routine.roundTripDistance) : '')
  const [days, setDays] = useState(routine?.daysPerWeek ?? 5)
  const save = useSaveRoutine()
  const remove = useDeleteRoutine()
  const toast = useToast()
  const err = useFormError()

  async function submit() {
    err.clear()
    try {
      const d = parseNumber(distance)
      if (d == null) throw new InputError('roundTripDistance', 'Escribe la distancia de ida y vuelta.')
      await save.mutateAsync({
        id: routine?.id,
        vehicleId: vehicle.id,
        name,
        roundTripDistance: d,
        daysPerWeek: days,
      })
      toast('Rutina guardada')
      onDone()
    } catch (e) {
      err.set(e)
    }
  }

  return (
    <form
      className="flex flex-col gap-5 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <TextField
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Trabajo"
        error={err.field('name')}
      />
      {!routine ? (
        <div className="-mt-2 flex flex-wrap gap-2">
          {ROUTINE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setName(p)}
              className="min-h-9 rounded-full bg-surface px-3 text-[0.82rem] font-semibold ring-1 ring-line"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}
      <TextField
        label="Distancia de ida y vuelta"
        inputMode="decimal"
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
        suffix={vehicle.measure}
        hint="Si no la sabes, búscala en tu app de mapas y multiplícala por dos."
        error={err.field('roundTripDistance')}
      />
      <Field label="Días por semana" error={err.field('daysPerWeek')}>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Días por semana">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              className={cx(
                'h-11 flex-1 rounded-xl text-[0.95rem] font-bold tabular',
                days === d ? 'bg-inverse text-on-inverse' : 'bg-surface ring-1 ring-line',
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </Field>
      <FormError message={err.form} />
      <Button type="submit" size="lg" block loading={save.isPending}>
        Guardar Rutina
      </Button>
      {routine ? (
        <Button
          variant="danger"
          block
          loading={remove.isPending}
          onClick={async () => {
            await remove.mutateAsync(routine.id)
            toast('Rutina eliminada')
            onDone()
          }}
        >
          Eliminar Rutina
        </Button>
      ) : null}
    </form>
  )
}

// ---------------------------------------------------------------------------
// "¿Cuándo fue la última vez?"
// ---------------------------------------------------------------------------

export function LastDoneForm({
  open,
  onClose,
  vehicle,
  taskCode,
  onRecordService,
}: {
  open: boolean
  onClose: () => void
  vehicle: VehicleView | null
  taskCode: string | null
  onRecordService: () => void
}) {
  const { data: tasks } = useTasks()
  const k = knowledgeProfile(useProfile().data?.knowledgeLevel)
  const task = taskCode ? taskMap(tasks).get(taskCode) : undefined
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`¿Cuándo fue ${task ? `“${taskLabel(task, taskCode!, k)}”` : 'la última vez'}?`}
      description="Con una fecha aproximada ya podemos calcular el próximo."
    >
      {open && vehicle && taskCode ? (
        <LastDoneBody
          vehicle={vehicle}
          taskCode={taskCode}
          explain={k.explain ? task?.description : undefined}
          onDone={onClose}
          onRecordService={onRecordService}
        />
      ) : null}
    </Sheet>
  )
}

const APPROX = [
  { label: 'Hace menos de 1 mes', months: 0 },
  { label: 'Hace 1 a 3 meses', months: 2 },
  { label: 'Hace 3 a 6 meses', months: 4 },
  { label: 'Hace 6 a 12 meses', months: 9 },
  { label: 'Hace más de un año', months: 15 },
]

function monthsAgo(months: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return todayIso(d)
}

function LastDoneBody({
  vehicle,
  taskCode,
  explain,
  onDone,
  onRecordService,
}: {
  vehicle: VehicleView
  taskCode: string
  explain?: string
  onDone: () => void
  onRecordService: () => void
}) {
  const setState = useReminderState()
  const toast = useToast()
  const [exact, setExact] = useState('')
  const [reading, setReading] = useState('')

  async function remember(on: string) {
    const r = parseNumber(reading)
    await setState.mutateAsync({
      vehicleId: vehicle.id,
      taskCode,
      patch: {
        last_unknown: false,
        remembered_on: on,
        remembered_reading: r == null ? null : Math.round(r),
      },
    })
    toast('Listo, ya calculamos el próximo')
    onDone()
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {explain ? <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[0.86rem] text-muted">{explain}</p> : null}
      <div className="flex flex-col gap-2">
        {APPROX.map((a) => (
          <Button
            key={a.label}
            variant="secondary"
            block
            disabled={setState.isPending}
            onClick={() => void remember(monthsAgo(a.months))}
            className="justify-start"
          >
            {a.label}
          </Button>
        ))}
      </div>
      <details className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <summary className="cursor-pointer text-[0.9rem] font-semibold">Sé la fecha exacta</summary>
        <div className="mt-3 flex flex-col gap-3">
          <TextField label="Fecha" type="date" max={todayIso()} value={exact} onChange={(e) => setExact(e.target.value)} />
          <TextField
            label="Kilometraje ese día"
            optional
            inputMode="numeric"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            suffix={vehicle.measure}
          />
          <Button disabled={!exact} loading={setState.isPending} onClick={() => void remember(exact)}>
            Guardar fecha
          </Button>
        </div>
      </details>
      <Button variant="ghost" block onClick={onRecordService}>
        Tengo la factura: registrar el Servicio completo
      </Button>
      <Button
        variant="ghost"
        block
        className="text-muted"
        disabled={setState.isPending}
        onClick={async () => {
          await setState.mutateAsync({
            vehicleId: vehicle.id,
            taskCode,
            patch: { last_unknown: true, remembered_on: null, remembered_reading: null },
          })
          toast('Anotado. Te recomendamos revisarlo pronto.')
          onDone()
        }}
      >
        No sé
      </Button>
    </div>
  )
}
