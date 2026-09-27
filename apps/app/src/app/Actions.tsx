import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BellPlus, CalendarPlus, CarFront, Gauge, Wrench, type LucideIcon } from 'lucide-react'
import { ServiceForm, type ServiceFormInit } from '../forms/ServiceForm'
import {
  AppointmentForm,
  LastDoneForm,
  ManualReminderForm,
  MileageForm,
  RoutineForm,
} from '../forms/SmallForms'
import { VehicleForm } from '../forms/VehicleForm'
import { ReminderDetail } from '../components/ReminderDetail'
import { useActiveVehicle } from '../lib/activeVehicle'
import type { RoutineRecord, VehicleView } from '../lib/garage'
import { useGarage } from '../lib/garage'
import { Sheet } from '../ui/Sheet'

type Open =
  | { kind: 'none' }
  | { kind: 'quick' }
  | { kind: 'vehicle'; vehicle: VehicleView | null }
  | { kind: 'service'; init: ServiceFormInit }
  | { kind: 'mileage'; vehicleId: string }
  | { kind: 'appointment'; vehicleId: string; taskCodes?: string[] }
  | { kind: 'reminder'; vehicleId: string }
  | { kind: 'routine'; vehicleId: string; routine?: RoutineRecord | null }
  | { kind: 'lastDone'; vehicleId: string; taskCode: string }
  | { kind: 'reminder-detail'; vehicleId: string; taskCode: string }

type Actions = {
  openQuick: () => void
  addVehicle: () => void
  editVehicle: (v: VehicleView) => void
  logService: (init?: Partial<ServiceFormInit>) => void
  updateMileage: (vehicleId?: string) => void
  planAppointment: (vehicleId?: string, taskCodes?: string[]) => void
  addReminder: (vehicleId?: string) => void
  editRoutine: (vehicleId: string, routine?: RoutineRecord | null) => void
  askLastDone: (vehicleId: string, taskCode: string) => void
  openReminder: (vehicleId: string, taskCode: string) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useActions() {
  const value = useContext(ActionsContext)
  if (!value) throw new Error('useActions must be used within ActionsProvider')
  return value
}

export function ActionsProvider({ children }: { children: ReactNode }) {
  const { vehicles } = useGarage()
  const { active } = useActiveVehicle(vehicles)
  const [open, setOpen] = useState<Open>({ kind: 'none' })
  const close = useCallback(() => setOpen({ kind: 'none' }), [])
  const navigate = useNavigate()

  const fallbackId = active?.id ?? vehicles[0]?.id ?? null

  const actions = useMemo<Actions>(() => {
    const needVehicle = (fn: (id: string) => void) => (id?: string) => {
      const target = id ?? fallbackId
      if (!target) setOpen({ kind: 'vehicle', vehicle: null })
      else fn(target)
    }
    return {
      openQuick: () => setOpen({ kind: 'quick' }),
      addVehicle: () => setOpen({ kind: 'vehicle', vehicle: null }),
      editVehicle: (vehicle) => setOpen({ kind: 'vehicle', vehicle }),
      logService: (init) => {
        const vehicleId = init?.vehicleId ?? fallbackId
        if (!vehicleId) return setOpen({ kind: 'vehicle', vehicle: null })
        setOpen({ kind: 'service', init: { ...init, vehicleId } })
      },
      updateMileage: needVehicle((vehicleId) => setOpen({ kind: 'mileage', vehicleId })),
      planAppointment: (vehicleId, taskCodes) =>
        needVehicle((id) => setOpen({ kind: 'appointment', vehicleId: id, taskCodes }))(vehicleId),
      addReminder: needVehicle((vehicleId) => setOpen({ kind: 'reminder', vehicleId })),
      editRoutine: (vehicleId, routine) => setOpen({ kind: 'routine', vehicleId, routine }),
      askLastDone: (vehicleId, taskCode) => setOpen({ kind: 'lastDone', vehicleId, taskCode }),
      openReminder: (vehicleId, taskCode) => setOpen({ kind: 'reminder-detail', vehicleId, taskCode }),
    }
  }, [fallbackId])

  const vehicleFor = (id: string) => vehicles.find((v) => v.id === id) ?? null

  return (
    <ActionsContext.Provider value={actions}>
      {children}

      <QuickActions
        open={open.kind === 'quick'}
        onClose={close}
        hasVehicles={vehicles.length > 0}
        onPick={(kind) => {
          if (kind === 'vehicle') actions.addVehicle()
          else if (kind === 'service') actions.logService()
          else if (kind === 'mileage') actions.updateMileage()
          else if (kind === 'appointment') actions.planAppointment()
          else actions.addReminder()
        }}
      />
      <VehicleForm
        open={open.kind === 'vehicle'}
        onClose={close}
        vehicle={open.kind === 'vehicle' ? open.vehicle : null}
        onCreated={(id) => void navigate({ to: '/flota/$vehicleId', params: { vehicleId: id } })}
      />
      <ServiceForm
        open={open.kind === 'service'}
        onClose={close}
        vehicles={vehicles}
        init={open.kind === 'service' ? open.init : null}
      />
      <MileageForm
        open={open.kind === 'mileage'}
        onClose={close}
        vehicles={vehicles}
        vehicleId={open.kind === 'mileage' ? open.vehicleId : null}
      />
      <AppointmentForm
        open={open.kind === 'appointment'}
        onClose={close}
        vehicles={vehicles}
        init={open.kind === 'appointment' ? { vehicleId: open.vehicleId, taskCodes: open.taskCodes } : null}
      />
      <ManualReminderForm
        open={open.kind === 'reminder'}
        onClose={close}
        vehicles={vehicles}
        vehicleId={open.kind === 'reminder' ? open.vehicleId : null}
      />
      <RoutineForm
        open={open.kind === 'routine'}
        onClose={close}
        vehicle={open.kind === 'routine' ? vehicleFor(open.vehicleId) : null}
        routine={open.kind === 'routine' ? open.routine : null}
      />
      <ReminderDetail
        open={open.kind === 'reminder-detail'}
        onClose={close}
        vehicle={open.kind === 'reminder-detail' ? vehicleFor(open.vehicleId) : null}
        taskCode={open.kind === 'reminder-detail' ? open.taskCode : null}
        onDone={() => {
          if (open.kind === 'reminder-detail') {
            setOpen({ kind: 'service', init: { vehicleId: open.vehicleId, taskCodes: [open.taskCode] } })
          }
        }}
        onPlan={() => {
          if (open.kind === 'reminder-detail') {
            setOpen({ kind: 'appointment', vehicleId: open.vehicleId, taskCodes: [open.taskCode] })
          }
        }}
        onAskLast={() => {
          if (open.kind === 'reminder-detail') {
            setOpen({ kind: 'lastDone', vehicleId: open.vehicleId, taskCode: open.taskCode })
          }
        }}
      />
      <LastDoneForm
        open={open.kind === 'lastDone'}
        onClose={close}
        vehicle={open.kind === 'lastDone' ? vehicleFor(open.vehicleId) : null}
        taskCode={open.kind === 'lastDone' ? open.taskCode : null}
        onRecordService={() => {
          if (open.kind === 'lastDone') {
            setOpen({ kind: 'service', init: { vehicleId: open.vehicleId, taskCodes: [open.taskCode] } })
          }
        }}
      />
    </ActionsContext.Provider>
  )
}

type QuickKind = 'service' | 'mileage' | 'appointment' | 'reminder' | 'vehicle'

const QUICK: Array<{ kind: QuickKind; icon: LucideIcon; title: string; body: string }> = [
  { kind: 'service', icon: Wrench, title: 'Registrar Servicio', body: 'Mantenimiento, reparación o piezas' },
  { kind: 'mileage', icon: Gauge, title: 'Actualizar kilometraje', body: 'El número del odómetro hoy' },
  { kind: 'appointment', icon: CalendarPlus, title: 'Agendar Cita', body: 'Un mantenimiento que harás' },
  { kind: 'reminder', icon: BellPlus, title: 'Nuevo Recordatorio', body: 'Seguro, marchamo, garantía…' },
  { kind: 'vehicle', icon: CarFront, title: 'Agregar Vehículo', body: 'Suma otro a tu flota' },
]

function QuickActions({
  open,
  onClose,
  onPick,
  hasVehicles,
}: {
  open: boolean
  onClose: () => void
  onPick: (kind: QuickKind) => void
  hasVehicles: boolean
}) {
  const items = hasVehicles ? QUICK : QUICK.filter((q) => q.kind === 'vehicle')
  return (
    <Sheet open={open} onClose={onClose} title="¿Qué quieres hacer?">
      <div className="grid grid-cols-2 gap-2.5 pb-2">
        {items.map(({ kind, icon: Icon, title, body }, i) => (
          <button
            key={kind}
            type="button"
            onClick={() => onPick(kind)}
            className={`flex gap-2 rounded-[1.25rem] p-4 text-left shadow-card transition-transform active:scale-[0.98] ${
              i === 0
                ? 'col-span-2 flex-row items-center bg-inverse text-on-inverse'
                : 'min-h-28 flex-col items-start bg-surface'
            }`}
          >
            <span
              className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${
                i === 0 ? 'bg-radiant text-white' : 'bg-radiant-soft text-radiant'
              }`}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[0.95rem] font-bold">{title}</span>
              <span className={`block text-[0.8rem] ${i === 0 ? 'opacity-70' : 'text-muted'}`}>{body}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
