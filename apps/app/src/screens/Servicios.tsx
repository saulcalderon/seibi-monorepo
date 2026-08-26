import { useEffect, useMemo, useState } from 'react'
import {
  upcomingMaintenanceForVehicle,
  type ReminderItem,
  type ReminderTone,
} from '../lib/reminders'
import {
  addLoggedService,
  monthlySpendForVehicle,
  recentServicesForVehicle,
  saveServiceComment,
  servicesForVehicle,
  serviceVehicleLabel,
  subscribeServicesChange,
  type ServiceIcon,
  type ServiceItem,
} from '../lib/services'
import { openServiceHistoryPdf } from '../lib/serviceHistoryPdf'
import type { VehicleProfile } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

type ServiciosView = 'preview' | 'all'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, month) => {
  const label = new Date(2024, month, 1).toLocaleString('es-MX', { month: 'long' })
  return {
    value: month,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  }
})

type PeriodPickerKind = 'month' | 'year'

function matchesServicePeriod(
  item: ServiceItem,
  month: number | 'all',
  year: number | 'all',
) {
  if (!item.performedAt) return month === 'all' && year === 'all'
  const date = new Date(item.performedAt)
  if (year !== 'all' && date.getFullYear() !== year) return false
  if (month !== 'all' && date.getMonth() !== month) return false
  return true
}

export function ServiceIconGlyph({ icon }: { icon: ServiceIcon }) {
  if (icon === 'oil') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M8 4h8l1.5 5H6.5L8 4zM7 9v9a2 2 0 002 2h6a2 2 0 002-2V9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M10 13h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'brakes') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M14.5 5.5l4 4M4 20l1.2-4.2L15.7 5.3a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L8.2 18.8 4 20z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (icon === 'tires') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 4.5V7M12 17v2.5M4.5 12H7M17 12h2.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (icon === 'filter') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6h14l-5.5 7v4.5L10.5 19v-6L5 6z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (icon === 'battery') {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M18 10h2v4h-2M8 12h4M10 10v4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Chevron() {
  return (
    <svg className="servicios-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ServiceRow({
  item,
  focused,
  interactive = false,
  onOpen,
}: {
  item: ServiceItem
  focused: boolean
  interactive?: boolean
  onOpen?: () => void
}) {
  const body = (
    <>
      <span className="dash-tx-icon" aria-hidden="true">
        <ServiceIconGlyph icon={item.icon} />
      </span>
      <div>
        <p className="dash-tx-name">{item.name}</p>
        <p className="dash-tx-meta">{item.meta}</p>
      </div>
      <strong>{item.cost}</strong>
      {interactive ? <Chevron /> : null}
    </>
  )

  if (interactive && onOpen) {
    return (
      <button
        type="button"
        id={`servicio-${item.id}`}
        data-service-id={item.id}
        className={`dash-tx dash-tx--button servicios-row${focused ? ' is-focused' : ''}`}
        onClick={onOpen}
      >
        {body}
      </button>
    )
  }

  return (
    <article
      id={`servicio-${item.id}`}
      data-service-id={item.id}
      className={`dash-tx${focused ? ' is-focused' : ''}`}
    >
      {body}
    </article>
  )
}

function RecToneIcon({ tone }: { tone: ReminderTone }) {
  if (tone === 'danger') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 8v5M12 16.5h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10.3 4.8L3.6 16.2A2 2 0 005.3 19h13.4a2 2 0 001.7-2.8L13.7 4.8a2 2 0 00-3.4 0z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 10v3l2 2M9 4h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RecommendationRow({
  item,
  onOpen,
}: {
  item: ReminderItem
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      className={`servicios-rec tone-${item.tone}`}
      onClick={onOpen}
    >
      <span className="servicios-rec-icon" aria-hidden="true">
        <RecToneIcon tone={item.tone} />
      </span>
      <span className="servicios-rec-copy">
        <strong>{item.name}</strong>
        <span>{item.due}</span>
        <em>{item.meta}</em>
      </span>
      <span className="servicios-rec-action">{m.home_services_recs_action()}</span>
    </button>
  )
}

function MiniCalendar({ at }: { at: number }) {
  const date = new Date(at)
  const year = date.getFullYear()
  const month = date.getMonth()
  const selectedDay = date.getDate()
  const monthLabel = date.toLocaleString('es-MX', { month: 'short', year: 'numeric' })
  const startPad = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <div className="servicios-cal" aria-label={monthLabel}>
      <p className="servicios-cal-month">{monthLabel}</p>
      <div className="servicios-cal-weekdays" aria-hidden="true">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="servicios-cal-grid">
        {cells.map((day, index) =>
          day == null ? (
            <span key={`pad-${index}`} className="servicios-cal-day is-empty" />
          ) : (
            <span
              key={day}
              className={`servicios-cal-day${day === selectedDay ? ' is-selected' : ''}`}
            >
              {day}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

function ServicePeriodPicker({
  kind,
  value,
  years,
  onSelect,
  onClose,
}: {
  kind: PeriodPickerKind
  value: number | 'all'
  years: number[]
  onSelect: (next: number | 'all') => void
  onClose: () => void
}) {
  const title =
    kind === 'month' ? m.home_services_filter_month() : m.home_services_filter_year()
  const options =
    kind === 'month'
      ? [
          { value: 'all' as const, label: m.home_services_filter_all() },
          ...MONTH_OPTIONS.map((month) => ({
            value: month.value as number | 'all',
            label: month.label,
          })),
        ]
      : [
          { value: 'all' as const, label: m.home_services_filter_all() },
          ...years.map((year) => ({
            value: year as number | 'all',
            label: String(year),
          })),
        ]

  return (
    <div
      className="servicios-period"
      role="dialog"
      aria-modal="true"
      aria-labelledby="servicios-period-title"
    >
      <button
        type="button"
        className="servicios-period-backdrop"
        aria-label={m.home_vehicle_sheet_close()}
        onClick={onClose}
      />
      <div className="servicios-period-panel">
        <header className="servicios-period-head">
          <div>
            <p className="servicios-period-eyebrow">{m.home_services_badge()}</p>
            <h2 id="servicios-period-title">{title}</h2>
          </div>
          <button type="button" className="servicios-period-close" onClick={onClose}>
            {m.home_vehicle_sheet_close()}
          </button>
        </header>
        <div
          className={`servicios-period-grid${kind === 'year' ? ' is-years' : ''}`}
          role="listbox"
          aria-label={title}
        >
          {options.map((option) => {
            const selected = option.value === value
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={selected}
                className={`servicios-period-option${selected ? ' is-selected' : ''}${
                  option.value === 'all' ? ' is-all' : ''
                }`}
                onClick={() => {
                  onSelect(option.value)
                  onClose()
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ServiceDetailSheet({
  item,
  vehicleId,
  onClose,
  onSaved,
}: {
  item: ServiceItem
  vehicleId: string | null
  onClose: () => void
  onSaved: (next: ServiceItem) => void
}) {
  const [comment, setComment] = useState(item.comment ?? '')

  function handleSave() {
    saveServiceComment(vehicleId, item.id, comment)
    onSaved({ ...item, comment: comment.trim() || undefined })
    onClose()
  }

  return (
    <div className="servicios-detail" role="dialog" aria-modal="true" aria-labelledby="servicios-detail-title">
      <button
        type="button"
        className="servicios-detail-backdrop"
        aria-label={m.home_services_detail_close()}
        onClick={onClose}
      />
      <div className="servicios-detail-panel">
        <div className="servicios-detail-handle" aria-hidden="true" />
        <header className="servicios-detail-head">
          <div>
            <p className="servicios-detail-eyebrow">{m.home_services_detail_title()}</p>
            <h2 id="servicios-detail-title">{item.name}</h2>
          </div>
          <button type="button" className="servicios-detail-close" onClick={onClose}>
            {m.home_services_detail_close()}
          </button>
        </header>

        <div className="servicios-detail-meta">
          <div>
            <span>{m.home_services_detail_place()}</span>
            <strong>
              {item.taller?.trim() || m.home_services_detail_place_empty()}
            </strong>
            <em>
              {m.home_services_detail_cost()}: {item.cost}
            </em>
          </div>
        </div>

        <section className="servicios-detail-block">
          <p className="servicios-detail-label">{m.home_services_detail_date()}</p>
          <MiniCalendar at={item.performedAt} />
        </section>

        <section className="servicios-detail-block servicios-detail-block--comment">
          <label className="servicios-detail-label" htmlFor={`servicio-comment-${item.id}`}>
            {m.home_services_detail_comment()}
          </label>
          <textarea
            id={`servicio-comment-${item.id}`}
            className="servicios-detail-comment"
            rows={3}
            value={comment}
            placeholder={m.home_services_detail_comment_placeholder()}
            onChange={(event) => setComment(event.target.value)}
          />
        </section>

        <footer className="servicios-detail-footer">
          <button type="button" className="servicios-detail-save" onClick={handleSave}>
            {m.home_services_detail_save()}
          </button>
        </footer>
      </div>
    </div>
  )
}

function ServiceAddSheet({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: VehicleProfile
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [taller, setTaller] = useState('')

  function handleSave() {
    if (!name.trim()) return
    addLoggedService(vehicle.id, {
      name,
      cost,
      mileage: vehicle.mileage,
      taller,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="servicios-detail" role="dialog" aria-modal="true" aria-labelledby="servicios-add-title">
      <button
        type="button"
        className="servicios-detail-backdrop"
        aria-label={m.home_services_detail_close()}
        onClick={onClose}
      />
      <div className="servicios-detail-panel">
        <header className="servicios-detail-head">
          <div>
            <p className="servicios-detail-eyebrow">{m.home_services_add()}</p>
            <h2 id="servicios-add-title">{m.home_part_title()}</h2>
          </div>
          <button type="button" className="servicios-detail-close" onClick={onClose}>
            {m.home_services_detail_close()}
          </button>
        </header>
        <p className="servicios-desc">{m.home_part_desc()}</p>

        <label className="servicios-add-field">
          <span>{m.home_part_name_label()}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={m.home_part_name_placeholder()}
            autoFocus
          />
        </label>
        <label className="servicios-add-field">
          <span>{m.home_part_cost_label()}</span>
          <input
            value={cost}
            onChange={(event) => setCost(event.target.value.replace(/[^\d]/g, ''))}
            placeholder="$0"
            inputMode="numeric"
          />
        </label>
        <label className="servicios-add-field">
          <span>{m.home_part_taller_label()}</span>
          <input
            value={taller}
            onChange={(event) => setTaller(event.target.value)}
            placeholder={m.home_part_taller_placeholder()}
          />
        </label>

        <footer className="servicios-detail-footer">
          <button
            type="button"
            className="servicios-detail-save"
            disabled={!name.trim()}
            onClick={handleSave}
          >
            {m.home_part_save()}
          </button>
        </footer>
      </div>
    </div>
  )
}

export function Servicios({
  vehicle,
  focusServiceId = null,
  onFocusHandled,
  preferAll = false,
  onOpenReminder,
}: {
  vehicle: VehicleProfile | null
  focusServiceId?: string | null
  onFocusHandled?: () => void
  preferAll?: boolean
  onOpenReminder?: (reminderId: string) => void
}) {
  const [view, setView] = useState<ServiciosView>(() =>
    focusServiceId || preferAll ? 'all' : 'preview',
  )
  const [highlightId, setHighlightId] = useState<string | null>(focusServiceId)
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all')
  const [filterYear, setFilterYear] = useState<number | 'all'>('all')
  const [periodPicker, setPeriodPicker] = useState<PeriodPickerKind | null>(null)
  const [detail, setDetail] = useState<ServiceItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [servicesTick, setServicesTick] = useState(0)
  const services = useMemo(
    () => servicesForVehicle(vehicle),
    [vehicle, servicesTick],
  )
  const recent = useMemo(
    () => recentServicesForVehicle(vehicle),
    [vehicle, servicesTick],
  )
  const monthSpend = useMemo(
    () => monthlySpendForVehicle(vehicle),
    [vehicle, servicesTick],
  )
  const recommendations = upcomingMaintenanceForVehicle(vehicle, 3)
  const label = serviceVehicleLabel(vehicle)
  const context = label
    ? m.home_vehicle_context({ vehicle: label })
    : m.home_vehicle_context_empty()
  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const item of services) {
      if (!item.performedAt) continue
      years.add(new Date(item.performedAt).getFullYear())
    }
    if (years.size === 0) years.add(new Date().getFullYear())
    return [...years].sort((a, b) => b - a)
  }, [services])
  const filteredServices = useMemo(
    () =>
      services.filter((item) => matchesServicePeriod(item, filterMonth, filterYear)),
    [services, filterMonth, filterYear],
  )

  useEffect(() => subscribeServicesChange(() => setServicesTick((value) => value + 1)), [])

  useEffect(() => {
    if (focusServiceId) {
      setHighlightId(focusServiceId)
      setView('all')
      const item = servicesForVehicle(vehicle).find((entry) => entry.id === focusServiceId)
      if (item) setDetail(item)
      return
    }
    if (preferAll) {
      setView('all')
    }
  }, [focusServiceId, preferAll, vehicle])

  useEffect(() => {
    if (!highlightId || view !== 'all') return
    const node = document.querySelector<HTMLElement>(
      `[data-service-id="${highlightId}"]`,
    )
    const start = window.setTimeout(() => {
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    const clear = window.setTimeout(() => {
      setHighlightId(null)
      onFocusHandled?.()
    }, 2200)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(clear)
    }
  }, [highlightId, onFocusHandled, view])

  function openService(id: string) {
    const item = services.find((entry) => entry.id === id) ?? null
    if (item) setDetail(item)
  }

  function openAll() {
    setHighlightId(null)
    setFilterMonth('all')
    setFilterYear('all')
    setView('all')
  }

  function backToRecent() {
    setHighlightId(null)
    setFilterMonth('all')
    setFilterYear('all')
    setDetail(null)
    setView('preview')
  }

  const addSheet =
    adding && vehicle ? (
      <ServiceAddSheet
        vehicle={vehicle}
        onClose={() => setAdding(false)}
        onSaved={() => setServicesTick((value) => value + 1)}
      />
    ) : null

  const detailSheet = detail ? (
    <ServiceDetailSheet
      key={detail.id}
      item={detail}
      vehicleId={vehicle?.id ?? null}
      onClose={() => setDetail(null)}
      onSaved={(next) => {
        setDetail(next)
        setServicesTick((value) => value + 1)
      }}
    />
  ) : null

  const periodSheet = periodPicker ? (
    <ServicePeriodPicker
      kind={periodPicker}
      value={periodPicker === 'month' ? filterMonth : filterYear}
      years={yearOptions}
      onSelect={(next) => {
        if (periodPicker === 'month') setFilterMonth(next)
        else setFilterYear(next)
      }}
      onClose={() => setPeriodPicker(null)}
    />
  ) : null

  const monthTriggerLabel =
    filterMonth === 'all'
      ? m.home_services_filter_all()
      : (MONTH_OPTIONS.find((month) => month.value === filterMonth)?.label ??
        m.home_services_filter_all())
  const yearTriggerLabel =
    filterYear === 'all' ? m.home_services_filter_all() : String(filterYear)

  if (view === 'all') {
    return (
      <div className="avisos-screen servicios-screen">
        <header className="avisos-header">
          <button type="button" className="avisos-back" onClick={backToRecent}>
            {m.setup_back()}
          </button>
          <h1 className="avisos-title">{m.home_services_badge()}</h1>
          <p className="avisos-context">{context}</p>
        </header>

        <div className="avisos-legend" aria-label="Resumen de servicios">
          <span className="avisos-chip tone-ok">
            {`${filteredServices.length} servicios`}
          </span>
          <button
            type="button"
            className="avisos-chip tone-warn servicios-chip-btn"
            onClick={() => openServiceHistoryPdf(filteredServices, label)}
          >
            {m.home_services_pdf()}
          </button>
        </div>

        <div className="servicios-filters" aria-label="Filtrar por fecha">
          <div className="servicios-filter">
            <span id="servicios-filter-month-label">{m.home_services_filter_month()}</span>
            <button
              type="button"
              className={`servicios-filter-trigger${filterMonth !== 'all' ? ' is-active' : ''}`}
              aria-labelledby="servicios-filter-month-label"
              aria-haspopup="dialog"
              aria-expanded={periodPicker === 'month'}
              onClick={() => setPeriodPicker('month')}
            >
              <span>{monthTriggerLabel}</span>
            </button>
          </div>
          <div className="servicios-filter">
            <span id="servicios-filter-year-label">{m.home_services_filter_year()}</span>
            <button
              type="button"
              className={`servicios-filter-trigger${filterYear !== 'all' ? ' is-active' : ''}`}
              aria-labelledby="servicios-filter-year-label"
              aria-haspopup="dialog"
              aria-expanded={periodPicker === 'year'}
              onClick={() => setPeriodPicker('year')}
            >
              <span>{yearTriggerLabel}</span>
            </button>
          </div>
        </div>

        <section className="dash-tx-list" aria-label={m.home_services_badge()}>
          {filteredServices.length > 0 ? (
            filteredServices.map((item) => (
              <ServiceRow
                key={item.id}
                item={item}
                focused={highlightId === item.id}
                interactive
                onOpen={() => openService(item.id)}
              />
            ))
          ) : (
            <p className="dash-tx-empty">{m.home_services_filter_empty()}</p>
          )}
        </section>
        {addSheet}
        {detailSheet}
        {periodSheet}
      </div>
    )
  }

  return (
    <div className="avisos-screen servicios-screen">
      <header className="avisos-header">
        <h1 className="avisos-title">{m.home_recent_title()}</h1>
        <p className="avisos-context">{context}</p>
        <p className="servicios-desc">{m.home_recent_desc()}</p>
      </header>

      <div className="avisos-legend" aria-label="Resumen de servicios">
        <button type="button" className="avisos-chip tone-warn servicios-chip-btn" onClick={openAll}>
          {m.home_services_badge()}
        </button>
        <span className="avisos-chip tone-ok">{`${recent.length} recientes`}</span>
        <button
          type="button"
          className="servicios-add-btn"
          aria-label={m.home_services_add()}
          disabled={!vehicle}
          onClick={() => setAdding(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="servicios-month-block">
        <div className="servicios-month-total" aria-label={m.home_services_month_total()}>
          <div>
            <p className="servicios-month-label">{m.home_services_month_total()}</p>
            <p className="servicios-month-period">{monthSpend.label}</p>
            <p className="servicios-month-count">
              {m.home_services_month_count({ count: monthSpend.count })}
            </p>
          </div>
          <div className="servicios-month-sum">
            <span>{m.home_services_month_sum()}</span>
            <strong>{monthSpend.formatted}</strong>
          </div>
        </div>

        <p className="servicios-month-list-label">{m.home_services_month_list()}</p>

        <section className="dash-tx-list" aria-label={m.home_recent_title()}>
          {recent.length > 0 ? (
            recent.map((item) => (
              <ServiceRow
                key={item.id}
                item={item}
                focused={false}
                interactive
                onOpen={() => openService(item.id)}
              />
            ))
          ) : (
            <p className="dash-tx-empty">{m.home_recent_empty()}</p>
          )}
        </section>
      </div>

      <section className="servicios-recs" aria-label={m.home_services_recs_title()}>
        <div className="servicios-recs-head">
          <h2>{m.home_services_recs_title()}</h2>
          <p>{m.home_services_recs_desc()}</p>
        </div>
        {recommendations.length > 0 ? (
          <div className="servicios-recs-list">
            {recommendations.map((item) => (
              <RecommendationRow
                key={item.id}
                item={item}
                onOpen={
                  onOpenReminder ? () => onOpenReminder(item.id) : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="dash-tx-empty">{m.home_services_recs_empty()}</p>
        )}
      </section>
      {detailSheet}
      {addSheet}
    </div>
  )
}
