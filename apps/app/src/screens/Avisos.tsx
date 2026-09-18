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
import { WearRing } from '../components/wearUi'
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

function formatLastService(at: number) {
  return new Date(at).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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

export function ReminderPartIcon({ id }: { id: string }) {
  if (id === 'brakes') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="12" r="7.35" stroke="currentColor" strokeWidth="1.65" />
        <circle cx="11" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.65" />
        <circle cx="11" cy="7.6" r="0.8" fill="currentColor" />
        <circle cx="14.8" cy="9.6" r="0.8" fill="currentColor" />
        <circle cx="14.8" cy="14.4" r="0.8" fill="currentColor" />
        <circle cx="11" cy="16.4" r="0.8" fill="currentColor" />
        <circle cx="7.2" cy="14.4" r="0.8" fill="currentColor" />
        <circle cx="7.2" cy="9.6" r="0.8" fill="currentColor" />
        <path
          d="M17.55 7.15c2.4 1.5 3.9 4.05 3.9 7.05s-1.5 5.55-3.9 7.05"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (id === 'tires') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.3" />
        <circle cx="12" cy="12" r="4.35" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 7.65v1.85M16.13 10.12l-1.58.75M15.28 15.53l-1.46-.97M8.72 15.53l1.46-.97M7.87 10.12l1.58.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
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
        <rect x="4.8" y="6" width="14.4" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8.2 8.3v7.4M10.7 8.3v7.4M13.3 8.3v7.4M15.8 8.3v7.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
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
        d="M6.35 3.35h5.4v2.2H6.35z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M4.55 5.55h9.05l.7 13.35c.06.95-.7 1.75-1.68 1.75H5.53c-.98 0-1.74-.8-1.68-1.75L4.55 5.55z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M11.75 4.45c2.2.25 4.35 1.7 5.7 3.85"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M18.55 9.4s1.75 1.9 1.75 3.05a1.75 1.75 0 11-3.5 0c0-1.15 1.75-3.05 1.75-3.05z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
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
  onClose,
}: {
  item: ReminderItem
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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
}: {
  item: ReminderItem
  focused: boolean
  hidden?: boolean
  ringDelayMs?: number
  animateRing?: boolean
  onOpen?: () => void
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
          </div>
        </div>
      </button>
      <WearRing pct={item.remainingPct} delayMs={ringDelayMs} animate={animateRing} />
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

  type AvisosFilter = ReminderTone

  const groups: {
    id: AvisosFilter
    toneClass: string
    label: string
    items: ReminderItem[]
  }[] = [
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

  const startFilter =
    groups.find((group) => group.items.length > 0)?.id ?? 'ok'

  const [activeFilter, setActiveFilter] = useState<AvisosFilter>(startFilter)
  const [displayedFilter, setDisplayedFilter] = useState<AvisosFilter>(startFilter)
  const [swapPhase, setSwapPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const [shownCount, setShownCount] = useState(AVISO_PAGE)
  const [revealOpen, setRevealOpen] = useState(false)
  const [openItem, setOpenItem] = useState<ReminderItem | null>(null)
  const collapseTimer = useRef<number>(0)
  const swapTimer = useRef<number>(0)
  const pendingFilter = useRef<AvisosFilter>(startFilter)
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
          focused={focusReminderId === item.id}
          ringDelayMs={instant ? 0 : 1080 + index * 50}
          animateRing={!instant}
          onOpen={() => setOpenItem(item)}
        />
      </div>
    )
  }

  return (
    <div className="avisos-screen">
      <header className="avisos-header seibi-screen-header avisos-head">
        <div className="avisos-head-row">
          <span className="avisos-head-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4.4" y="6.2" width="15.2" height="13.6" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M8 4.4v3.4M16 4.4v3.4M4.4 10.2h15.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle cx="12" cy="15.1" r="1.55" fill="currentColor" />
            </svg>
          </span>
          <div className="avisos-head-copy">
            <h1 className="avisos-eyebrow avisos-main-title">
              {m.home_upcoming_eyebrow()}
            </h1>
            {label ? <p className="avisos-head-vehicle">{context}</p> : null}
          </div>
        </div>
        {vehicle && reminders.length > 0 ? (
          <ul className="avisos-head-pulse" aria-label={m.home_avisos_groups()}>
            {groups.map((group) => (
              <li key={group.id} className={`avisos-head-pulse-item ${group.toneClass}`}>
                <strong>{group.items.length}</strong>
                <span>{group.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="avisos-filters" role="tablist" aria-label={m.home_avisos_groups()}>
        {groups.map((group) => {
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
              {group.items.length > 0
                ? m.home_avisos_chip({
                    label: group.label,
                    count: String(group.items.length),
                  })
                : group.label}
            </button>
          )
        })}
      </div>

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
              onClose={() => setOpenItem(null)}
            />,
            document.getElementById('root') ?? document.body,
          )
        : null}
    </div>
  )
}
