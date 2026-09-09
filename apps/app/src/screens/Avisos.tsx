import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  formatAlarmWhen,
  getReminderAlarm,
  saveReminderAlarm,
  scheduleReminderPing,
} from '../lib/reminderAlarms'
import { WearMeaningSheet, WearRing } from '../components/wearUi'
import {
  reminderVehicleLabel,
  remindersForVehicle,
  wearLevelFromPct,
  WEAR_COLOR,
  type ReminderItem,
  type ReminderTone,
} from '../lib/reminders'
import type { VehicleProfile } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function toDateValue(at: number) {
  const date = new Date(at)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function toTimeValue(at: number) {
  const date = new Date(at)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function fromDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0).getTime()
}

function formatLastService(at: number) {
  return new Date(at).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function defaultAlarmAt(item: ReminderItem) {
  const days = item.remainingDays && item.remainingDays > 0 ? item.remainingDays : 1
  const at = new Date()
  at.setDate(at.getDate() + days)
  at.setHours(9, 0, 0, 0)
  return at.getTime()
}

function reminderMeter(item: ReminderItem) {
  if (item.remainingKm != null) {
    return {
      label: m.home_reminder_pilot_km_left(),
      value: item.remainingKm.toLocaleString('es-MX'),
      unit: 'km',
      long: item.remainingKm >= 1_000,
    }
  }
  if (item.remainingDays != null) {
    return {
      label: m.home_reminder_pilot_days_left(),
      value: String(Math.max(0, item.remainingDays)),
      unit: item.remainingDays <= 0 ? 'vencido' : 'días',
      long: false,
    }
  }
  return {
    label: m.home_reminder_pilot_days_left(),
    value: '—',
    unit: '',
    long: false,
  }
}

function ReminderPartIcon({ id }: { id: string }) {
  if (id === 'brakes') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 4.8v2.2M12 17v2.2M4.8 12h2.2M17 12h2.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (id === 'tires') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="16" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="8" cy="16" r="3.1" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="16" cy="16" r="3.1" stroke="currentColor" strokeWidth="1.55" />
      </svg>
    )
  }
  if (id === 'alignment') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'air-filter') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 6h14l-5.5 7v4.5L10.5 19v-6L5 6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (id === 'coolant') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4.5S7 10.2 7 13.4a5 5 0 0010 0C17 10.2 12 4.5 12 4.5z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (id === 'spark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10.5 3h3v6l2 2.5v4.2a2.8 2.8 0 01-2.8 2.8h-1.4A2.8 2.8 0 018.5 15.7V11.5L10.5 9V3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 18.8v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'battery') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="7.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M18 10.2h2v3.6h-2M8.2 12h4.2M10.3 10.2v3.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 9V7h8v2h2.5v4.5H17V18H7v-2.5H5.5V11H8V9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 7V5h4v2M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function reminderLiveCopy(item: ReminderItem) {
  const overdue = item.due.match(/^Vencido\s*[·•\-]\s*(.+)$/i)
  if (overdue) {
    return {
      title: 'Vencido',
      subtitle: item.name,
    }
  }
  return {
    title: item.due,
    subtitle: item.name,
  }
}

function ReminderDetailSheet({
  item,
  vehicleId,
  onClose,
}: {
  item: ReminderItem
  vehicleId: string
  onClose: () => void
}) {
  const stored = getReminderAlarm(vehicleId, item.id)
  const initialAt = stored?.at ?? defaultAlarmAt(item)
  const [date, setDate] = useState(() => toDateValue(initialAt))
  const [time, setTime] = useState(() => toTimeValue(initialAt))
  const [savedAt, setSavedAt] = useState<number | null>(stored?.at ?? null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSave() {
    if (!date || !time) return
    const at = fromDateTime(date, time)
    if (!Number.isFinite(at)) return
    saveReminderAlarm({ vehicleId, reminderId: item.id, at })
    setSavedAt(at)
    scheduleReminderPing(
      at,
      item.name,
      m.home_reminder_detail_alarm_saved({ when: formatAlarmWhen(at) }),
    )
  }

  const lastLabel = item.lastServicedAt
    ? formatLastService(item.lastServicedAt)
    : m.home_reminder_detail_last_empty()
  const kmLabel =
    item.remainingKm != null
      ? `${item.remainingKm.toLocaleString('es-MX')} km`
      : m.home_reminder_detail_na()
  const daysLabel =
    item.remainingDays != null
      ? String(item.remainingDays)
      : m.home_reminder_detail_na()

  return (
    <div className="aviso-detail" role="dialog" aria-modal="true" aria-labelledby="aviso-detail-title">
      <button
        type="button"
        className="aviso-detail-backdrop"
        aria-label={m.home_reminder_detail_close()}
        onClick={onClose}
      />
      <div className="aviso-detail-panel">
        <header className="aviso-detail-head">
          <div>
            <p className="aviso-detail-eyebrow">{m.home_reminder_detail_title()}</p>
            <h2 id="aviso-detail-title">{item.name}</h2>
          </div>
          <button type="button" className="aviso-detail-close" onClick={onClose}>
            {m.home_reminder_detail_close()}
          </button>
        </header>

        <p className="aviso-detail-interval">
          {m.home_reminder_detail_interval()}: {item.meta}
        </p>

        <dl className="aviso-detail-stats">
          <div className="aviso-detail-stat aviso-detail-stat--wide">
            <dt>{m.home_reminder_detail_last()}</dt>
            <dd>{lastLabel}</dd>
          </div>
          <div className="aviso-detail-stat">
            <dt>{m.home_reminder_detail_km()}</dt>
            <dd>{kmLabel}</dd>
          </div>
          <div className="aviso-detail-stat">
            <dt>{m.home_reminder_detail_days()}</dt>
            <dd>{daysLabel}</dd>
          </div>
        </dl>

        <section className="aviso-detail-alarm">
          <p className="aviso-detail-label">{m.home_reminder_detail_alarm()}</p>
          <p className="aviso-detail-hint">{m.home_reminder_detail_alarm_hint()}</p>
          <div className="aviso-detail-when">
            <label className="aviso-detail-field">
              <span>{m.home_reminder_detail_alarm_date()}</span>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setSavedAt(null)
                }}
              />
            </label>
            <label className="aviso-detail-field">
              <span>{m.home_reminder_detail_alarm_time()}</span>
              <input
                type="time"
                value={time}
                onChange={(event) => {
                  setTime(event.target.value)
                  setSavedAt(null)
                }}
              />
            </label>
          </div>
          {savedAt ? (
            <p className="aviso-detail-saved">
              {m.home_reminder_detail_alarm_saved({ when: formatAlarmWhen(savedAt) })}
            </p>
          ) : null}
          <button type="button" className="aviso-detail-save" onClick={handleSave}>
            {m.home_reminder_detail_alarm_save()}
          </button>
        </section>
      </div>
    </div>
  )
}

function ReminderCard({
  item,
  focused,
  hidden = false,
  ringDelayMs = 0,
  animateRing = true,
  onOpen,
  onWear,
}: {
  item: ReminderItem
  focused: boolean
  hidden?: boolean
  ringDelayMs?: number
  animateRing?: boolean
  onOpen?: () => void
  onWear?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const copy = reminderLiveCopy(item)
  const meter = reminderMeter(item)
  const replacing = wearLevelFromPct(item.remainingPct) === 'replace'

  const closeMenu = useEffectEvent(() => {
    setMenuOpen(false)
  })

  useEffect(() => {
    if (hidden) setMenuOpen(false)
  }, [hidden])

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (target && cardRef.current?.contains(target)) return
      closeMenu()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const actions = [
    { id: 'schedule', label: m.home_reminder_schedule() },
    { id: 'update', label: m.home_reminder_update() },
    { id: 'snooze', label: m.home_reminder_snooze() },
  ] as const

  return (
    <article
      ref={cardRef}
      id={`aviso-${item.id}`}
      data-reminder-id={item.id}
      hidden={hidden}
      className={`aviso-live tone-${item.tone}${replacing ? ' is-replace' : ''}${
        focused ? ' is-focused' : ''
      }${menuOpen ? ' is-menu-open' : ''}`}
    >
      <button
        type="button"
        className="aviso-live-open"
        aria-label={`${copy.title}. ${copy.subtitle}`}
        onClick={onOpen}
      >
        <div className="aviso-live-pilot">
          <div className="aviso-live-pilot-meter">
            <p className="aviso-live-pilot-label">{meter.label}</p>
            <span className="aviso-live-pilot-count" aria-hidden="true">
              <strong>{meter.value}</strong>
              {meter.unit ? <em>{meter.unit}</em> : null}
            </span>
          </div>
          <div className="aviso-live-copy">
            <p className="aviso-live-name">{copy.subtitle}</p>
            <div className="aviso-live-meta-row">
              <span className="aviso-live-badge">{item.meta}</span>
              <span className="aviso-live-part-icon" aria-hidden="true">
                <ReminderPartIcon id={item.id} />
              </span>
            </div>
          </div>
        </div>
      </button>
      <WearRing
        pct={item.remainingPct}
        delayMs={ringDelayMs}
        animate={animateRing}
        onClick={() => onWear?.()}
      />
      <button
        type="button"
        className={`aviso-live-more${menuOpen ? ' is-open' : ''}`}
        aria-label={m.home_reminder_more()}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setMenuOpen((open) => !open)
        }}
      >
        <span aria-hidden="true">···</span>
      </button>
      {menuOpen ? (
        <div className="dash-upcoming-menu" role="menu" aria-label={m.home_reminder_more()}>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className="dash-upcoming-menu-item"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setMenuOpen(false)
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export { ReminderCard }

export function recentRemindersForVehicle(
  vehicle: VehicleProfile | null,
  limit = 2,
) {
  return remindersForVehicle(vehicle)
    .filter((item) => item.tone === 'danger' || item.tone === 'warn')
    .slice(0, limit)
}

const AVISO_PAGE = 6

function chunkReminders(items: ReminderItem[], size: number) {
  const pages: ReminderItem[][] = []
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size))
  }
  return pages
}

function reminderDueDate(item: ReminderItem) {
  if (item.remainingDays == null) return null
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + Math.max(0, item.remainingDays))
  return date
}

function UpcomingMaintenanceCalendar({
  items,
  onPick,
}: {
  items: ReminderItem[]
  onPick: (item: ReminderItem) => void
}) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const [shown, setShown] = useState({ year: currentYear, month: currentMonth })
  const [expanded, setExpanded] = useState(true)

  const datedItems = useMemo(
    () =>
      items
        .map((item) => ({ item, date: reminderDueDate(item) }))
        .filter(
          (entry): entry is { item: ReminderItem; date: Date } =>
            entry.date != null,
        ),
    [items],
  )

  const lastMonth = useMemo(() => {
    const latest = datedItems.reduce<Date | null>(
      (result, entry) =>
        !result || entry.date.getTime() > result.getTime() ? entry.date : result,
      null,
    )
    return latest
      ? { year: latest.getFullYear(), month: latest.getMonth() }
      : { year: currentYear, month: currentMonth }
  }, [datedItems, currentMonth, currentYear])

  const byDay = useMemo(() => {
    const map = new Map<number, ReminderItem[]>()
    for (const entry of datedItems) {
      if (
        entry.date.getFullYear() !== shown.year ||
        entry.date.getMonth() !== shown.month
      ) {
        continue
      }
      const day = entry.date.getDate()
      const bucket = map.get(day)
      if (bucket) bucket.push(entry.item)
      else map.set(day, [entry.item])
    }
    return map
  }, [datedItems, shown])

  const monthLabel = new Date(shown.year, shown.month, 1).toLocaleString(
    'es-MX',
    { month: 'long', year: 'numeric' },
  )
  const startPad = (new Date(shown.year, shown.month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(shown.year, shown.month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const atCurrent =
    shown.year === currentYear && shown.month === currentMonth
  const atLast =
    shown.year > lastMonth.year ||
    (shown.year === lastMonth.year && shown.month >= lastMonth.month)

  function shiftMonth(delta: -1 | 1) {
    const next = new Date(shown.year, shown.month + delta, 1)
    setShown({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <section
      className={`avisos-month-calendar${expanded ? ' is-expanded' : ''}`}
      aria-label={m.home_reminders_calendar()}
    >
      <header className="avisos-month-calendar-head">
        <button
          type="button"
          className="avisos-month-calendar-toggle"
          aria-expanded={expanded}
          aria-label={
            expanded
              ? m.home_reminders_calendar_collapse()
              : m.home_reminders_calendar_expand()
          }
          onClick={() => setExpanded((value) => !value)}
        >
          <span>
            <small>{m.home_reminders_calendar()}</small>
            <strong>{monthLabel}</strong>
          </span>
          <i
            className={expanded ? 'is-expanded' : ''}
            aria-hidden="true"
          >
            <svg viewBox="0 0 12 8" fill="none">
              <path
                d="m1.5 1.5 4.5 4 4.5-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </i>
        </button>
        <div className="avisos-month-calendar-nav">
          <button
            type="button"
            disabled={atCurrent}
            aria-label={m.home_reminders_calendar_prev()}
            onClick={() => shiftMonth(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            disabled={atLast}
            aria-label={m.home_reminders_calendar_next()}
            onClick={() => shiftMonth(1)}
          >
            ›
          </button>
        </div>
      </header>

      <div
        className={`avisos-month-calendar-body${expanded ? ' is-expanded' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="avisos-month-calendar-body-inner">
          <div className="avisos-month-calendar-weekdays" aria-hidden="true">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="avisos-month-calendar-grid">
            {cells.map((day, index) => {
              if (day == null) {
                return <span key={`empty-${index}`} className="is-empty" />
              }
              const dayItems = byDay.get(day) ?? []
              if (dayItems.length === 0) return <span key={day}>{day}</span>
              const first = dayItems[0]
              const color = WEAR_COLOR[wearLevelFromPct(first.remainingPct)]
              return (
                <button
                  key={day}
                  type="button"
                  className="has-maintenance"
                  style={{ '--calendar-wear': color } as CSSProperties}
                  aria-label={m.home_reminders_calendar_day({
                    day: String(day),
                    count: String(dayItems.length),
                  })}
                  onClick={() => onPick(first)}
                >
                  {day}
                  <span className="avisos-month-calendar-dots" aria-hidden="true">
                    {dayItems.slice(0, 3).map((item) => (
                      <i
                        key={item.id}
                        style={
                          {
                            '--calendar-wear': WEAR_COLOR[
                              wearLevelFromPct(item.remainingPct)
                            ],
                          } as CSSProperties
                        }
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="avisos-month-calendar-note">
            {m.home_reminders_calendar_note()}
          </p>
        </div>
      </div>
    </section>
  )
}

export function Avisos({
  vehicle,
  focusReminderId = null,
  onFocusHandled,
}: {
  vehicle: VehicleProfile | null
  focusReminderId?: string | null
  onFocusHandled?: () => void
}) {
  const reminders = useMemo(() => remindersForVehicle(vehicle), [vehicle])
  const label = reminderVehicleLabel(vehicle)
  const context = label
    ? m.home_vehicle_context({ vehicle: label })
    : m.home_vehicle_context_empty()

  type AvisosFilter = 'all' | ReminderTone

  const groups: {
    id: AvisosFilter
    toneClass: string
    label: string
    items: ReminderItem[]
  }[] = [
    {
      id: 'all',
      toneClass: 'tone-all',
      label: m.home_avisos_all(),
      items: reminders,
    },
    {
      id: 'danger',
      toneClass: 'tone-danger',
      label: m.home_avisos_urgent(),
      items: reminders.filter((item) => item.tone === 'danger'),
    },
    {
      id: 'warn',
      toneClass: 'tone-warn',
      label: m.home_avisos_soon(),
      items: reminders.filter((item) => item.tone === 'warn'),
    },
    {
      id: 'ok',
      toneClass: 'tone-ok',
      label: m.home_avisos_ok(),
      items: reminders.filter((item) => item.tone === 'ok'),
    },
  ]

  const [activeFilter, setActiveFilter] = useState<AvisosFilter>('all')
  const [displayedFilter, setDisplayedFilter] = useState<AvisosFilter>('all')
  const [swapPhase, setSwapPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const [shownCount, setShownCount] = useState(AVISO_PAGE)
  const [revealOpen, setRevealOpen] = useState(false)
  const [openItem, setOpenItem] = useState<ReminderItem | null>(null)
  const [wearFocus, setWearFocus] = useState<ReminderItem | null>(null)
  const [calendarFocusId, setCalendarFocusId] = useState<string | null>(null)
  const collapseTimer = useRef<number>(0)
  const swapTimer = useRef<number>(0)
  const calendarFocusTimer = useRef<number>(0)
  const pendingFilter = useRef<AvisosFilter>('all')
  const ringsInstant = useRef(false)
  const visible = groups.find((group) => group.id === displayedFilter) ?? groups[0]
  const headItems = visible.items.slice(0, AVISO_PAGE)
  const extraChunks = chunkReminders(visible.items.slice(AVISO_PAGE), AVISO_PAGE)
  const canShowMore = shownCount < visible.items.length
  const finishFocus = useEffectEvent(() => {
    onFocusHandled?.()
  })

  function resetPaging() {
    window.clearTimeout(collapseTimer.current)
    setShownCount(AVISO_PAGE)
    setRevealOpen(false)
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(swapTimer.current)
      window.clearTimeout(calendarFocusTimer.current)
    }
  }, [])

  function expandPaging(count: number) {
    const next = Math.min(count, visible.items.length)
    setShownCount(next)
    setRevealOpen(next > AVISO_PAGE)
  }

  useEffect(() => {
    if (!focusReminderId) return
    const focused = reminders.find((item) => item.id === focusReminderId)
    if (focused) {
      window.clearTimeout(swapTimer.current)
      setSwapPhase('idle')
      setActiveFilter(focused.tone)
      setDisplayedFilter(focused.tone)
      pendingFilter.current = focused.tone
      const index = reminders
        .filter((item) => item.tone === focused.tone)
        .findIndex((item) => item.id === focused.id)
      if (index >= 0) {
        const next = Math.max(AVISO_PAGE, Math.ceil((index + 1) / AVISO_PAGE) * AVISO_PAGE)
        setShownCount(next)
        setRevealOpen(next > AVISO_PAGE)
      }
    }
    const reminderId = focusReminderId
    const start = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-reminder-id="${reminderId}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }, 80)
    const clear = window.setTimeout(() => finishFocus(), 400)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(clear)
    }
  }, [focusReminderId, reminders])

  function selectFilter(id: AvisosFilter) {
    onFocusHandled?.()
    if (id === activeFilter && swapPhase === 'idle') return
    pendingFilter.current = id
    setActiveFilter(id)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      ringsInstant.current = true
      setDisplayedFilter(id)
      resetPaging()
      setSwapPhase('idle')
      return
    }
    ringsInstant.current = true
    window.clearTimeout(swapTimer.current)
    setSwapPhase('out')
    swapTimer.current = window.setTimeout(() => {
      resetPaging()
      setDisplayedFilter(pendingFilter.current)
      setSwapPhase('in')
      swapTimer.current = window.setTimeout(() => setSwapPhase('idle'), 460)
    }, 180)
  }

  function handleRevealEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'grid-template-rows') return
    if (revealOpen) return
    resetPaging()
  }

  function focusReminderFromCalendar(item: ReminderItem) {
    ringsInstant.current = true
    window.clearTimeout(swapTimer.current)
    window.clearTimeout(calendarFocusTimer.current)
    setSwapPhase('idle')
    setActiveFilter('all')
    setDisplayedFilter('all')
    pendingFilter.current = 'all'

    const index = reminders.findIndex((entry) => entry.id === item.id)
    const next =
      index < 0
        ? AVISO_PAGE
        : Math.max(
            AVISO_PAGE,
            Math.ceil((index + 1) / AVISO_PAGE) * AVISO_PAGE,
          )
    setShownCount(next)
    setRevealOpen(next > AVISO_PAGE)
    setCalendarFocusId(item.id)

    window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-reminder-id="${item.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    calendarFocusTimer.current = window.setTimeout(
      () => setCalendarFocusId(null),
      1500,
    )
  }

  function renderCard(item: ReminderItem, index: number) {
    const instant = ringsInstant.current
    const previous = visible.items[index - 1]
    const previousLevel = previous
      ? wearLevelFromPct(previous.remainingPct)
      : null
    const currentLevel = wearLevelFromPct(item.remainingPct)
    const changesWear = Boolean(previousLevel && previousLevel !== currentLevel)
    const dividerStyle = changesWear
      ? ({
          '--divider-from': WEAR_COLOR[previousLevel!],
          '--divider-to': WEAR_COLOR[currentLevel],
        } as CSSProperties)
      : undefined
    return (
      <div
        key={item.id}
        className={`aviso-tone-slot${changesWear ? ' has-tone-divider' : ''}`}
        style={dividerStyle}
      >
        <ReminderCard
          item={item}
          focused={
            focusReminderId === item.id || calendarFocusId === item.id
          }
          ringDelayMs={instant ? 0 : 1080 + index * 50}
          animateRing={!instant}
          onOpen={() => setOpenItem(item)}
          onWear={() => setWearFocus(item)}
        />
      </div>
    )
  }

  return (
    <div className="avisos-screen">
      <header className="avisos-header seibi-screen-header">
        <h1 className="avisos-eyebrow avisos-main-title">
          {m.home_upcoming_eyebrow()}
        </h1>
        <p className="seibi-screen-header-vehicle">{context}</p>
      </header>

      <div className="avisos-filters" role="tablist" aria-label={m.home_avisos_groups()}>
        {[...groups.slice(1), groups[0]].map((group) => {
          const selected = group.id === activeFilter
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`avisos-chip ${group.toneClass}${selected ? ' is-active' : ''}`}
              onClick={() => selectFilter(group.id)}
            >
              {m.home_avisos_chip({
                label: group.label,
                count: String(group.items.length),
              })}
            </button>
          )
        })}
      </div>

      <UpcomingMaintenanceCalendar
        items={reminders}
        onPick={focusReminderFromCalendar}
      />

      <section
        className="avisos-group"
        aria-label={m.home_avisos_chip({
          label: visible.label,
          count: String(visible.items.length),
        })}
      >
        <div
          className={`avisos-swap${
            swapPhase === 'out' ? ' is-out' : swapPhase === 'in' ? ' is-in' : ''
          }`}
        >
          {visible.items.length > 0 ? (
            <>
              <div className="aviso-live-list">
                {headItems.map((item, index) => renderCard(item, index))}
              </div>
              {visible.items.length > AVISO_PAGE ? (
                <div className={`aviso-live-more-stack${canShowMore ? ' has-peek' : ''}`}>
                  {extraChunks.map((chunk, page) => {
                    const unlockAt = AVISO_PAGE * (page + 1)
                    const open = revealOpen && shownCount > unlockAt
                    const peek =
                      canShowMore &&
                      !open &&
                      extraChunks.findIndex((_, index) => {
                        const at = AVISO_PAGE * (index + 1)
                        return !(revealOpen && shownCount > at)
                      }) === page
                    return (
                      <div
                        key={`aviso-page-${page}`}
                        className={`aviso-live-reveal${open ? ' is-open' : ''}${
                          peek ? ' is-peek' : ''
                        }`}
                        aria-hidden={peek || undefined}
                        onTransitionEnd={
                          page === extraChunks.length - 1 ? handleRevealEnd : undefined
                        }
                      >
                        <div className="aviso-live-reveal-inner">
                          <div className="aviso-live-list">
                            {chunk.map((item, itemIndex) =>
                              renderCard(item, unlockAt + itemIndex),
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    className="aviso-live-see-more"
                    onClick={() => {
                      if (canShowMore) {
                        expandPaging(shownCount + AVISO_PAGE)
                        return
                      }
                      setRevealOpen(false)
                      window.clearTimeout(collapseTimer.current)
                      const reduce = window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                      ).matches
                      collapseTimer.current = window.setTimeout(
                        () => resetPaging(),
                        reduce ? 0 : 480,
                      )
                    }}
                  >
                    {canShowMore
                      ? m.home_services_see_more()
                      : m.home_services_see_less()}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="avisos-group-empty">{m.home_avisos_group_empty()}</p>
          )}
        </div>
      </section>

      {openItem
        ? createPortal(
            <ReminderDetailSheet
              item={openItem}
              vehicleId={vehicle?.id ?? 'preview'}
              onClose={() => setOpenItem(null)}
            />,
            document.getElementById('root') ?? document.body,
          )
        : null}
      {wearFocus
        ? createPortal(
            <WearMeaningSheet item={wearFocus} onClose={() => setWearFocus(null)} />,
            document.getElementById('root') ?? document.body,
          )
        : null}
    </div>
  )
}
