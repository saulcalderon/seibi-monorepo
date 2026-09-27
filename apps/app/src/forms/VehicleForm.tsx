import { useState } from 'react'
import { Check } from 'lucide-react'
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer'
import type { VehicleView } from '../lib/garage'
import { errorMessage } from '../lib/functions'
import { knowledgeProfile } from '../lib/knowledge'
import { InputError, sanitizePlate, useCreateVehicle, useUpdateVehicle } from '../lib/mutations'
import { PAINTS } from '../lib/paint'
import { defaultMeasure, useProfile } from '../lib/profile'
import { POPULAR_BRANDS, useMakes, useModels, yearOptions } from '../lib/vpic'
import { Button } from '../ui/Button'
import { Combobox } from '../ui/Combobox'
import { cx } from '../ui/cx'
import { useToast } from '../ui/feedback'
import { Field, parseNumber, Segmented, SelectField, TextField } from '../ui/fields'
import { Sheet } from '../ui/Sheet'

export function VehicleForm({
  open,
  onClose,
  vehicle,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  vehicle?: VehicleView | null
  onCreated?: (vehicleId: string) => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title={vehicle ? 'Editar Vehículo' : 'Agregar Vehículo'}
      description={
        vehicle
          ? undefined
          : 'Con la marca, el modelo y el año buscamos el plan de mantenimiento de tu Vehículo.'
      }
    >
      {open ? (
        <VehicleFormBody vehicle={vehicle ?? null} onDone={onClose} onCreated={onCreated} />
      ) : null}
    </Sheet>
  )
}

export function VehicleFormBody({
  vehicle,
  onDone,
  onCreated,
  submitLabel,
}: {
  vehicle: VehicleView | null
  onDone: () => void
  onCreated?: (vehicleId: string) => void
  submitLabel?: string
}) {
  const profile = useProfile()
  const k = knowledgeProfile(profile.data?.knowledgeLevel)
  const toast = useToast()
  const create = useCreateVehicle()
  const update = useUpdateVehicle()

  const [brand, setBrand] = useState(vehicle?.brand ?? '')
  const [year, setYear] = useState<number | null>(vehicle?.year ?? null)
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [engine, setEngine] = useState(vehicle?.engine ?? '')
  const [trimLevel, setTrimLevel] = useState(vehicle?.trimLevel ?? '')
  const [color, setColor] = useState<string | null>(vehicle?.color ?? null)
  const [plate, setPlate] = useState(vehicle?.plate ?? '')
  const [measure, setMeasure] = useState<OdometerMeasure>(
    vehicle?.measure ?? defaultMeasure(profile.data?.country),
  )
  const [odometer, setOdometer] = useState('')
  const [error, setError] = useState<{ field: string; message: string } | null>(null)

  const makes = useMakes(brand.trim().length > 0)
  const models = useModels(brand, year)
  const hasReadings = (vehicle?.readings.length ?? 0) > 0
  const busy = create.isPending || update.isPending

  const fieldError = (f: string) => (error?.field === f ? error.message : null)

  async function submit() {
    setError(null)
    const input = {
      brand,
      model,
      year: year ?? 0,
      plate: plate || null,
      engine: engine || null,
      trimLevel: trimLevel || null,
      color,
      measure,
    }
    try {
      if (vehicle) {
        await update.mutateAsync({ vehicle, input })
        toast('Vehículo actualizado')
      } else {
        const reading = parseNumber(odometer)
        if (odometer.trim() && reading == null) {
          throw new InputError('odometer', 'Escribe solo números.')
        }
        const id = await create.mutateAsync({ ...input, odometer: reading })
        toast('Vehículo agregado')
        onCreated?.(id)
      }
      onDone()
    } catch (e) {
      if (e instanceof InputError) setError({ field: e.field, message: e.message })
      else setError({ field: 'form', message: errorMessage(e) })
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
      <Combobox
        label="Marca"
        value={brand}
        onChange={(v) => {
          setBrand(v)
          setError(null)
        }}
        options={brand.trim() ? (makes.data ?? POPULAR_BRANDS) : POPULAR_BRANDS}
        loading={makes.isFetching}
        placeholder="Toyota, Nissan, Hyundai…"
        error={fieldError('brand')}
      />

      <SelectField
        label="Año"
        value={year ?? ''}
        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
        error={fieldError('year')}
      >
        <option value="">Elige el año</option>
        {yearOptions().map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </SelectField>

      <Combobox
        label="Modelo"
        value={model}
        onChange={setModel}
        options={models.data ?? []}
        loading={models.isFetching}
        placeholder={year ? 'Corolla, Sentra, Tucson…' : 'Primero elige marca y año'}
        hint="¿No aparece? Escríbelo como está en tu tarjeta de circulación."
        error={fieldError('model')}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Motor"
          optional
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          placeholder="1.8L, 2.0 turbo"
          maxLength={60}
        />
        <TextField
          label="Versión"
          optional
          value={trimLevel}
          onChange={(e) => setTrimLevel(e.target.value)}
          placeholder="LE, EX, GLS"
          maxLength={60}
        />
      </div>
      {k.explain ? (
        <p className="-mt-3 px-1 text-[0.8rem] text-subtle">
          Si no sabes el motor o la versión, déjalos vacíos. Ayudan a que el plan sea más exacto;
          suelen venir en la tarjeta de circulación o en la parte trasera del Vehículo.
        </p>
      ) : null}

      <Field label="Color" optional>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
          {PAINTS.map((p) => (
            <button
              key={p.code}
              type="button"
              role="radio"
              aria-checked={color === p.code}
              aria-label={p.label}
              title={p.label}
              onClick={() => setColor(color === p.code ? null : p.code)}
              className={cx(
                'relative size-10 rounded-full ring-1 ring-black/10 transition-transform active:scale-90',
                color === p.code && 'ring-2 ring-radiant ring-offset-2 ring-offset-bg',
              )}
              style={{ background: p.hex }}
            >
              {color === p.code ? (
                <Check
                  className={cx(
                    'absolute inset-0 m-auto size-4',
                    ['white', 'silver', 'beige', 'yellow'].includes(p.code) ? 'text-black' : 'text-white',
                  )}
                  aria-hidden
                />
              ) : null}
            </button>
          ))}
        </div>
      </Field>

      <TextField
        label="Placa"
        optional
        value={plate}
        onChange={(e) => setPlate(sanitizePlate(e.target.value))}
        placeholder="P123-456"
        autoCapitalize="characters"
      />

      <Field
        label="El tablero marca"
        hint={
          hasReadings
            ? 'No se puede cambiar: ya hay lecturas registradas en esta medida.'
            : 'Usa la misma medida que ves en el odómetro.'
        }
      >
        {hasReadings ? (
          <div className="rounded-2xl bg-surface-3 px-4 py-3 text-[0.95rem] font-semibold">
            {measure === 'km' ? 'Kilómetros' : 'Millas'}
          </div>
        ) : (
          <Segmented
            label="Medida del odómetro"
            value={measure}
            onChange={setMeasure}
            options={[
              { value: 'km', label: 'Kilómetros' },
              { value: 'mi', label: 'Millas' },
            ]}
          />
        )}
      </Field>

      {!vehicle ? (
        <TextField
          label="Kilometraje actual"
          inputMode="numeric"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          placeholder="Ej. 45,000"
          suffix={measure}
          hint="Es el número del odómetro hoy. Con él calculamos tus próximos mantenimientos."
          error={fieldError('odometer')}
        />
      ) : null}

      {error?.field === 'form' ? (
        <p role="alert" className="rounded-2xl bg-overdue-soft px-4 py-3 text-[0.88rem] font-medium text-overdue">
          {error.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={busy}>
        {submitLabel ?? (vehicle ? 'Guardar cambios' : 'Agregar Vehículo')}
      </Button>
    </form>
  )
}
