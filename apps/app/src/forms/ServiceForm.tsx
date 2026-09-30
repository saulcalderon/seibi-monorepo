import { useMemo, useRef, useState } from 'react'
import { Camera, CircleHelp, Paperclip, Plus, Trash2, X } from 'lucide-react'
import type { ServiceRecord, VehicleView } from '../lib/garage'
import { errorMessage } from '../lib/functions'
import { formatNumber, todayIso, vehicleName } from '../lib/format'
import { knowledgeProfile, taskLabel } from '../lib/knowledge'
import { InputError, useSaveService, type ServiceItemInput } from '../lib/mutations'
import { useProfile } from '../lib/profile'
import { orderedTaskCodes, taskIcon, taskMap, useTasks } from '../lib/tasks'
import { Button, IconButton } from '../ui/Button'
import { cx } from '../ui/cx'
import { useToast } from '../ui/feedback'
import { Field, parseNumber, Segmented, SelectField, TextAreaField, TextField } from '../ui/fields'
import { Sheet } from '../ui/Sheet'

export type ServiceFormInit = {
  vehicleId: string
  taskCodes?: string[]
  service?: ServiceRecord
  appointmentId?: string
  shop?: string | null
}

type ItemDraft = {
  key: string
  taskCode: string | null
  name: string
  cost: string
  partBrand: string
  partNumber: string
}

let seq = 0
const nextKey = () => `i${++seq}`

export function ServiceForm({
  open,
  onClose,
  vehicles,
  init,
}: {
  open: boolean
  onClose: () => void
  vehicles: VehicleView[]
  init: ServiceFormInit | null
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title={init?.service ? 'Editar Servicio' : 'Registrar Servicio'}
      description={init?.service ? undefined : 'Puedes registrar trabajos de hoy o de fechas pasadas.'}
    >
      {open && init ? <ServiceFormBody vehicles={vehicles} init={init} onDone={onClose} /> : null}
    </Sheet>
  )
}

function ServiceFormBody({
  vehicles,
  init,
  onDone,
}: {
  vehicles: VehicleView[]
  init: ServiceFormInit
  onDone: () => void
}) {
  const { data: tasks } = useTasks()
  const byCode = taskMap(tasks)
  const profile = useProfile()
  const k = knowledgeProfile(profile.data?.knowledgeLevel)
  const toast = useToast()
  const save = useSaveService()
  const fileRef = useRef<HTMLInputElement>(null)

  const editing = init.service
  const [vehicleId, setVehicleId] = useState(init.vehicleId)
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null
  const [type, setType] = useState<'maintenance' | 'repair'>(editing?.type ?? 'maintenance')
  const [performedOn, setPerformedOn] = useState(editing?.performedOn ?? todayIso())
  const [reading, setReading] = useState(
    editing?.reading != null
      ? String(editing.reading)
      : vehicle?.odometer != null
        ? String(vehicle.odometer)
        : '',
  )
  const [items, setItems] = useState<ItemDraft[]>(() => {
    if (editing) {
      return editing.items.map((i) => ({
        key: nextKey(),
        taskCode: i.taskCode,
        name: i.name,
        cost: i.cost != null ? String(i.cost) : '',
        partBrand: i.partBrand ?? '',
        partNumber: i.partNumber ?? '',
      }))
    }
    return (init.taskCodes ?? []).map((code) => ({
      key: nextKey(),
      taskCode: code,
      name: byCode.get(code)?.name ?? code,
      cost: '',
      partBrand: '',
      partNumber: '',
    }))
  })
  const [perItemCost, setPerItemCost] = useState(
    Boolean(editing?.items.some((i) => i.cost != null)) || k.detailed,
  )
  const [totalCost, setTotalCost] = useState(editing?.totalCost != null ? String(editing.totalCost) : '')
  const [shop, setShop] = useState(editing?.shop ?? init.shop ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [invoice, setInvoice] = useState<File | null>(null)
  const [error, setError] = useState<{ field: string; message: string } | null>(null)
  const [helpFor, setHelpFor] = useState<string | null>(null)

  // Tasks to suggest: what this Vehicle needs first, then the catalog.
  const suggested = useMemo(() => {
    const due = (vehicle?.reminders ?? [])
      .filter((r) => r.status === 'overdue' || r.status === 'soon')
      .map((r) => r.taskCode)
    return orderedTaskCodes(due, tasks ?? [])
  }, [vehicle, tasks])

  const selectedCodes = new Set(items.map((i) => i.taskCode).filter(Boolean))

  function toggleTask(code: string) {
    setError(null)
    if (selectedCodes.has(code)) {
      setItems((list) => list.filter((i) => i.taskCode !== code))
    } else {
      setItems((list) => [
        ...list,
        {
          key: nextKey(),
          taskCode: code,
          name: byCode.get(code)?.name ?? code,
          cost: '',
          partBrand: '',
          partNumber: '',
        },
      ])
    }
  }

  function addCustom() {
    setItems((list) => [
      ...list,
      { key: nextKey(), taskCode: null, name: '', cost: '', partBrand: '', partNumber: '' },
    ])
  }

  function patchItem(key: string, patch: Partial<ItemDraft>) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  const itemsTotal = items.reduce((sum, i) => sum + (parseNumber(i.cost) ?? 0), 0)

  async function submit() {
    setError(null)
    try {
      const readingValue = parseNumber(reading)
      if (readingValue == null) throw new InputError('reading', 'Escribe el kilometraje de ese día.')
      const cleanItems: ServiceItemInput[] = items
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          taskCode: i.taskCode,
          name: i.name,
          cost: perItemCost ? parseNumber(i.cost) : null,
          partBrand: i.partBrand,
          partNumber: i.partNumber,
        }))
      const total = perItemCost
        ? itemsTotal > 0
          ? itemsTotal
          : null
        : parseNumber(totalCost)
      await save.mutateAsync({
        vehicleId,
        serviceId: editing?.id,
        readingId: editing?.readingId,
        type,
        performedOn,
        reading: readingValue,
        shop,
        notes,
        totalCost: total,
        items: cleanItems,
        invoice,
        appointmentId: init.appointmentId ?? null,
      })
      toast(editing ? 'Servicio actualizado' : 'Servicio registrado')
      onDone()
    } catch (e) {
      if (e instanceof InputError) setError({ field: e.field, message: e.message })
      else setError({ field: 'form', message: errorMessage(e) })
    }
  }

  const fieldError = (f: string) => (error?.field === f ? error.message : null)
  const measure = vehicle?.measure ?? 'km'

  return (
    <form
      className="flex flex-col gap-5 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {vehicles.length > 1 && !editing ? (
        <SelectField label="Vehículo" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {vehicleName(v)} {v.year}
            </option>
          ))}
        </SelectField>
      ) : null}

      <Segmented
        label="Tipo de Servicio"
        value={type}
        onChange={setType}
        options={[
          { value: 'maintenance', label: 'Mantenimiento' },
          { value: 'repair', label: 'Reparación' },
        ]}
      />

      <Field
        label="¿Qué se hizo?"
        error={fieldError('items')}
        hint={k.explain ? 'Toca lo que hicieron. Si no aparece, agrégalo abajo.' : undefined}
      >
        <div className="-mx-1 flex flex-wrap gap-2 px-1">
          {suggested.slice(0, 8).map((code) => {
            const Icon = taskIcon(code)
            const on = selectedCodes.has(code)
            const due = vehicle?.reminders.find((r) => r.taskCode === code)
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTask(code)}
                className={cx(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[0.84rem] font-semibold transition-colors',
                  on ? 'bg-inverse text-on-inverse' : 'bg-surface ring-1 ring-line',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {taskLabel(byCode.get(code), code, k)}
                {!on && (due?.status === 'overdue' || due?.status === 'soon') ? (
                  <span
                    className={cx('size-1.5 rounded-full', due.status === 'overdue' ? 'bg-overdue' : 'bg-soon')}
                    aria-label="Pendiente"
                  />
                ) : null}
              </button>
            )
          })}
        </div>
        {suggested.length > 8 ? (
          <details className="mt-1">
            <summary className="cursor-pointer px-1 py-2 text-[0.85rem] font-semibold text-radiant">
              Ver todas las tareas
            </summary>
            <div className="flex flex-wrap gap-2 pt-1">
              {suggested.slice(8).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={selectedCodes.has(code)}
                  onClick={() => toggleTask(code)}
                  className={cx(
                    'inline-flex min-h-10 items-center rounded-full px-3 text-[0.84rem] font-semibold',
                    selectedCodes.has(code) ? 'bg-inverse text-on-inverse' : 'bg-surface ring-1 ring-line',
                  )}
                >
                  {taskLabel(byCode.get(code), code, k)}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </Field>

      {items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[0.82rem] font-semibold text-muted">
              {items.length} {items.length === 1 ? 'trabajo o pieza' : 'trabajos o piezas'}
            </span>
            <button
              type="button"
              onClick={() => setPerItemCost((v) => !v)}
              className="min-h-9 px-1 text-[0.82rem] font-semibold text-radiant"
            >
              {perItemCost ? 'Solo costo total' : 'Costo por pieza'}
            </button>
          </div>
          {items.map((item) => {
            const Icon = taskIcon(item.taskCode)
            const task = item.taskCode ? byCode.get(item.taskCode) : undefined
            return (
              <div key={item.key} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-3">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {item.taskCode ? (
                    <span className="min-w-0 flex-1 text-[0.92rem] font-semibold">
                      {taskLabel(task, item.taskCode, k)}
                    </span>
                  ) : (
                    <input
                      aria-label="Nombre del trabajo o pieza"
                      value={item.name}
                      onChange={(e) => patchItem(item.key, { name: e.target.value })}
                      placeholder="Ej. Alternador, bombillo, empaque"
                      className="h-10 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[0.92rem] focus:outline-none focus:ring-2 focus:ring-radiant"
                    />
                  )}
                  {k.explain && task ? (
                    <IconButton
                      icon={CircleHelp}
                      label={`¿Qué es ${task.plainName}?`}
                      onClick={() => setHelpFor(helpFor === item.key ? null : item.key)}
                      className="size-9"
                    />
                  ) : null}
                  <IconButton
                    icon={Trash2}
                    label="Quitar"
                    onClick={() => setItems((l) => l.filter((i) => i.key !== item.key))}
                    className="size-9 text-muted"
                  />
                </div>
                {helpFor === item.key && task ? (
                  <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[0.82rem] text-muted">
                    {task.description}
                  </p>
                ) : null}
                {perItemCost || k.detailed ? (
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {perItemCost ? (
                      <input
                        aria-label="Costo en dólares"
                        inputMode="decimal"
                        value={item.cost}
                        onChange={(e) => patchItem(item.key, { cost: e.target.value })}
                        placeholder="Costo $"
                        className="h-10 rounded-xl bg-surface-2 px-3 text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-radiant"
                      />
                    ) : null}
                    {k.detailed ? (
                      <input
                        aria-label="Marca de la pieza"
                        value={item.partBrand}
                        onChange={(e) => patchItem(item.key, { partBrand: e.target.value })}
                        placeholder="Marca de la pieza"
                        className="h-10 rounded-xl bg-surface-2 px-3 text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-radiant"
                      />
                    ) : null}
                    {k.detailed ? (
                      <input
                        aria-label="Número de parte"
                        value={item.partNumber}
                        onChange={(e) => patchItem(item.key, { partNumber: e.target.value })}
                        placeholder="Número de parte"
                        className="col-span-2 h-10 rounded-xl bg-surface-2 px-3 text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-radiant"
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      <Button variant="secondary" icon={Plus} onClick={addCustom}>
        Agregar otro trabajo o pieza
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Fecha"
          type="date"
          max={todayIso()}
          value={performedOn}
          onChange={(e) => setPerformedOn(e.target.value)}
          error={fieldError('performedOn')}
        />
        <TextField
          label="Kilometraje"
          inputMode="numeric"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
          suffix={measure}
          error={fieldError('reading')}
        />
      </div>
      <p className="-mt-3 px-1 text-[0.8rem] text-subtle">
        {vehicle?.odometer != null
          ? `El que marcaba el odómetro ese día. Hoy: ${formatNumber(vehicle.odometer)} ${measure}.`
          : 'El número que marcaba el odómetro ese día.'}
      </p>

      {!perItemCost ? (
        <TextField
          label="Costo total"
          optional
          inputMode="decimal"
          value={totalCost}
          onChange={(e) => setTotalCost(e.target.value)}
          suffix="USD"
          error={fieldError('totalCost')}
        />
      ) : itemsTotal > 0 ? (
        <p className="px-1 text-[0.9rem]">
          Total: <strong className="tabular">${itemsTotal.toFixed(2)}</strong>
        </p>
      ) : null}

      <TextField
        label="Taller"
        optional
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        placeholder="Nombre del taller o agencia"
      />
      <TextAreaField
        label="Notas"
        optional
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Lo que te dijo el mecánico, garantía, etc."
      />

      <Field label="Factura o recibo" optional>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
        />
        {invoice ? (
          <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
            <Paperclip className="size-4 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[0.9rem]">{invoice.name}</span>
            <IconButton icon={X} label="Quitar factura" onClick={() => setInvoice(null)} className="size-9" />
          </div>
        ) : (
          <Button variant="secondary" icon={Camera} onClick={() => fileRef.current?.click()}>
            {editing?.invoicePath ? 'Reemplazar factura' : 'Adjuntar foto o PDF'}
          </Button>
        )}
      </Field>

      {error?.field === 'form' ? (
        <p role="alert" className="rounded-2xl bg-overdue-soft px-4 py-3 text-[0.88rem] font-medium text-overdue">
          {error.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={save.isPending}>
        {editing ? 'Guardar cambios' : 'Guardar Servicio'}
      </Button>
    </form>
  )
}
