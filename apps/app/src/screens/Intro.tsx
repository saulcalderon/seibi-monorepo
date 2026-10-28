import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type PanInfo, type Variants } from 'motion/react'
import {
  ArrowRight,
  BatteryMedium,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Droplet,
  Plus,
  ReceiptText,
  RotateCw,
  Signal,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { cx } from '../ui/cx'

const SLIDES = [
  {
    eyebrow: 'Qué es Seibi',
    title: 'Tu Vehículo, siempre en orden',
    body: 'Seibi guarda todo lo que le haces a tu Vehículo y te dice qué le toca y cuándo. Uno o toda tu flota.',
  },
  {
    eyebrow: 'El problema',
    title: 'Se acabó el “¿cuándo fue el último cambio?”',
    body: 'Los mantenimientos se olvidan, las facturas se pierden y los precios cambian de un taller a otro.',
  },
  {
    eyebrow: 'Cómo te ayuda',
    title: 'Avisos según tu modelo y tu uso',
    body: 'Planes del fabricante con fuentes, avisos con tu kilometraje real y precios estimados en tu ciudad.',
  },
]

const EASE = [0.2, 0.7, 0.2, 1] as const
const EASE_IN = [0.5, 0, 0.75, 0] as const
const display = 'font-sans font-light tracking-[-0.025em]'
const label = 'text-[0.8125rem] font-medium text-muted'
/** A card drawn on the phone screen. */
const screenCard = 'rounded-[1rem] border border-white/80 bg-surface shadow-card'

const CHARS = { at: 0.08, step: 0.028, duration: 0.56 }
const WORDS = { at: 0.38, step: 0.055, duration: 0.64 }

function Lockup() {
  return (
    <span className="inline-flex items-center gap-[0.28em] text-[1.375rem] leading-none">
      <Logo className="text-[0.95em]" />
      <span className="inline-flex items-baseline font-bold tracking-[-0.035em] [font-stretch:125%]" aria-hidden>
        seib
        <span className="relative inline-block after:absolute after:left-1/2 after:top-[-0.02em] after:size-[0.15em] after:-translate-x-1/2 after:-skew-x-14 after:rounded-[0.02em] after:bg-[#e0464f] after:content-['']">
          ı
        </span>
      </span>
    </span>
  )
}

/** Each place slides to its new character, units first. Places are keyed from the right so digits stay aligned. */
function Ticker({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion()
  const chars = Array.from(text)
  return (
    <span className={cx('relative inline-flex', className)}>
      <span className="sr-only">{text}</span>
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((char, i) => {
          const place = chars.length - 1 - i
          return (
            <motion.span
              key={place}
              layout={reduce ? false : 'position'}
              className="relative inline-block [clip-path:inset(0_-0.25em)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              aria-hidden
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={char}
                  className="inline-block"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.7em' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: '-0.7em' }}
                  transition={{ duration: 0.55, delay: reduce ? 0 : place * 0.055, ease: EASE }}
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )
        })}
      </AnimatePresence>
    </span>
  )
}

function Overdue({ children, pulse, className }: { children: ReactNode; pulse?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-overdue', className)}>
      <span className="relative inline-flex size-1.5 shrink-0" aria-hidden>
        {pulse != null && !reduce ? (
          <motion.span
            className="absolute inset-0 rounded-full bg-overdue"
            initial={{ opacity: 0 }}
            animate={{ scale: [1, 2.8], opacity: [0.5, 0] }}
            transition={{ duration: 1.3, delay: pulse, repeat: Infinity, repeatDelay: 1.1, ease: 'easeOut' }}
          />
        ) : null}
        <span className="relative size-1.5 rounded-full bg-overdue" />
      </span>
      {children}
    </span>
  )
}

type Car = { brand: string; model: string; meta: string; paint: string; accent: string; src: string; km: number }

const FLEET: Car[] = [
  { brand: 'Nissan', model: '370Z', meta: '2019 · Blanco perla', paint: '#e9e9e7', accent: '#3e3e32', src: '/assets/intro-370z.png', km: 48210 },
  { brand: 'Toyota', model: 'Tercel', meta: '1997 · Morado noche', paint: '#341b2c', accent: '#460036', src: '/assets/intro-tercel.png', km: 212940 },
  { brand: 'Toyota', model: 'Yaris', meta: '2017 · Plata clásico', paint: '#b3b1af', accent: '#443b32', src: '/assets/intro-yaris.png', km: 31870 },
]
/** The phone lands first; everything on its screen starts after. */
const PHONE_IN = 0.15
const ARRIVE = { delay: 1.05, duration: 1.25 }

const FLOOR_SHADOW =
  'absolute bottom-[2%] left-1/2 h-[10%] w-[70%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(10_11_13/28%),rgb(10_11_13/0))] blur-[3px]'
const CAR_BOX = 'absolute inset-x-[8%] bottom-[4%] flex h-[78%] items-end justify-center'

type Drive = { d: number; reduce: boolean | null }

const drive: Variants = {
  enter: ({ d, reduce }: Drive) => (reduce ? { opacity: 0 } : { x: d > 0 ? '-115%' : '115%' }),
  park: { x: 0, opacity: 1 },
  leave: ({ d, reduce }: Drive) =>
    reduce
      ? { opacity: 0, transition: { duration: 0.2 } }
      : { x: d > 0 ? '115%' : '-115%', transition: { duration: 0.7, ease: EASE_IN } },
}

function Sheen({ src, delay }: { src: string; delay: number }) {
  const mask = `url(${src})`
  return (
    <span
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center bottom',
        maskPosition: 'center bottom',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      }}
      aria-hidden
    >
      <motion.span
        className="absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(105deg,transparent_28%,rgb(255_255_255/92%)_50%,transparent_72%)]"
        initial={{ x: '-100%' }}
        animate={{ x: '250%' }}
        transition={{ duration: 1.5, delay, ease: [0.45, 0, 0.2, 1] }}
      />
    </span>
  )
}

function CarArt({ car, sheen }: { car: Car; sheen?: number }) {
  return (
    <>
      <span className={FLOOR_SHADOW} aria-hidden />
      <div
        className={cx(CAR_BOX, 'origin-bottom -scale-y-100 opacity-10 [mask-image:linear-gradient(to_top,#000,transparent_50%)]')}
        aria-hidden
      >
        <img src={car.src} alt="" draggable={false} className="block max-h-full max-w-full" />
      </div>
      <div className={CAR_BOX}>
        <img
          src={car.src}
          alt={`${car.brand} ${car.model}`}
          draggable={false}
          className="block max-h-full max-w-full select-none"
        />
        {sheen != null ? <Sheen src={car.src} delay={sheen} /> : null}
      </div>
    </>
  )
}

function PagerButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-full border border-white/80 bg-surface text-ink/70 shadow-card transition-transform duration-200 active:scale-[0.94]"
    >
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
    </button>
  )
}

const MILE_LINE = 'M2 30 C14 30 16 22 26 22 C36 22 38 14 48 16 C58 18 60 26 70 20 C78 15 82 8 90 6'

/** The sparkline draws itself and the dot travels the same path. `overdue` turns it red and pulses once drawn. */
function MileageChart({ delay = ARRIVE.delay, tone }: { delay?: number; tone?: 'overdue' }) {
  const reduce = useReducedMotion()
  const pathRef = useRef<SVGPathElement>(null)
  const progress = useMotionValue(reduce ? 1 : 0)
  const dotX = useMotionValue(90)
  const dotY = useMotionValue(6)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const length = path.getTotalLength()
    const place = (t: number) => {
      const point = path.getPointAtLength(length * t)
      dotX.set(point.x)
      dotY.set(point.y)
    }
    if (reduce) {
      progress.set(1)
      place(1)
      return
    }
    progress.set(0)
    place(0)
    const run = animate(progress, 1, {
      duration: 1.9,
      delay,
      ease: EASE,
      onUpdate: place,
    })
    return () => run.stop()
  }, [reduce, delay, progress, dotX, dotY])

  const pulse = tone === 'overdue' && !reduce
  const beat = {
    duration: 1.3,
    delay: delay + 0.35,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  }
  return (
    <svg
      viewBox="0 0 92 40"
      className={cx('h-7 w-[3.75rem] shrink-0', tone === 'overdue' ? 'text-overdue' : 'text-ink')}
      aria-hidden
    >
      <motion.path
        d={`${MILE_LINE} V40 H2 Z`}
        fill="currentColor"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 0.14 }}
        transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : delay + 1.2, ease: EASE }}
      />
      <motion.g
        animate={pulse ? { opacity: [1, 0.28, 1] } : undefined}
        transition={pulse ? beat : undefined}
      >
        <motion.path
          ref={pathRef}
          d={MILE_LINE}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />
        <motion.circle r={2.6} fill="currentColor" style={{ cx: dotX, cy: dotY }} />
      </motion.g>
    </svg>
  )
}

/** An iPhone entrance. `rise` tilts up out of the floor; `slide` comes in from the left. */
function Phone({ children, entrance = 'slide' }: { children: ReactNode; entrance?: 'rise' | 'slide' }) {
  const reduce = useReducedMotion()
  const fromBelow = entrance === 'rise'
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_93%,transparent)]">
      <div className="relative h-full origin-top [perspective:1100px] [@media(max-height:680px)]:scale-90">
        <motion.div
          className={cx(
            'absolute inset-x-0 top-1 mx-auto h-[calc(100%+4rem)] w-[17.5rem] rounded-[2.75rem] bg-[#0e0f11] p-[0.5rem] shadow-[0_22px_34px_-18px_rgb(14_15_17/40%),inset_0_0_0_1.5px_rgb(255_255_255/10%)]',
            fromBelow ? 'origin-bottom' : 'origin-center',
          )}
          initial={
            reduce
              ? { opacity: 0 }
              : fromBelow
                ? { opacity: 0, y: 140, rotateX: 42, rotateY: -16, rotateZ: 5, scale: 0.86 }
                : { opacity: 0, x: '-115%', rotateY: -26, scale: 0.94 }
          }
          animate={
            fromBelow
              ? { opacity: 1, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 }
              : { opacity: 1, x: 0, rotateY: 0, scale: 1 }
          }
          transition={
            reduce
              ? { duration: 0.3 }
              : {
                  default: { type: 'spring', stiffness: 80, damping: 15, mass: 1, delay: PHONE_IN },
                  opacity: { duration: 0.45, delay: PHONE_IN },
                }
          }
        >
          <span className="absolute -left-[3px] top-24 h-7 w-[3px] rounded-l-sm bg-[#1c1d20]" aria-hidden />
          <span className="absolute -left-[3px] top-36 h-11 w-[3px] rounded-l-sm bg-[#1c1d20]" aria-hidden />
          <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r-sm bg-[#1c1d20]" aria-hidden />
          <div className="relative h-full overflow-hidden rounded-[2.3rem] bg-bg">
            <div className="relative z-[4] flex h-9 items-center justify-between bg-bg px-6 pt-1 text-[0.75rem] font-semibold text-ink">
              <span className="tabular-nums">9:41</span>
              <span className="flex items-center gap-1" aria-hidden>
                <Signal className="size-3" strokeWidth={2.4} />
                <Wifi className="size-3" strokeWidth={2.4} />
                <span className="relative ml-0.5 h-[0.6rem] w-[1.15rem] rounded-[3px] border border-ink/45 p-[1px]">
                  <span className="block h-full w-[78%] rounded-[1.5px] bg-ink" />
                </span>
              </span>
            </div>
            <span
              className="absolute left-1/2 top-2 z-[7] h-[1.45rem] w-[5.25rem] -translate-x-1/2 rounded-full bg-[#0e0f11]"
              aria-hidden
            />
            {children}
            {!reduce ? (
              <motion.span
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/55%)_50%,transparent_65%)]"
                initial={{ x: '-110%' }}
                animate={{ x: '110%' }}
                transition={{ duration: 1.1, delay: PHONE_IN + 0.55, ease: [0.45, 0, 0.2, 1] }}
                aria-hidden
              />
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/** The Garage hero: the 370Z drives in, then the fleet takes turns. */
function GarageStage() {
  const reduce = useReducedMotion()
  const [bay, setBay] = useState(0)
  const [dir, setDir] = useState(1)
  const [moved, setMoved] = useState(false)
  const [tick, setTick] = useState(reduce ? 4 : 0)
  const car = FLEET[bay]
  const km = moved ? car.km : car.km - (4 - tick) * 10

  const go = (d: number) => {
    setMoved(true)
    setDir(d)
    setBay((b) => (b + d + FLEET.length) % FLEET.length)
  }

  useEffect(() => {
    for (const c of FLEET.slice(1)) new Image().src = c.src
  }, [])

  useEffect(() => {
    if (reduce) return
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setTick(n), (ARRIVE.delay + n * 0.26) * 1000))
    return () => timers.forEach(clearTimeout)
  }, [reduce])

  useEffect(() => {
    if (reduce) return
    const hold = moved ? 3.3 : ARRIVE.delay + ARRIVE.duration + 2.6
    const t = setTimeout(() => {
      setMoved(true)
      setDir(1)
      setBay((b) => (b + 1) % FLEET.length)
    }, hold * 1000)
    return () => clearTimeout(t)
  }, [bay, moved, reduce])

  const meta = car.meta.split(' · ')
  const landed = ARRIVE.delay + ARRIVE.duration - 0.15
  const fade = (at: number) => ({ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : at, ease: EASE })

  return (
    <Phone entrance="rise">
      <div className="flex flex-col gap-1.5 px-3.5 pt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={bay}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.34, delay: reduce || moved ? 0 : ARRIVE.delay - 0.2, ease: EASE }}
          >
            <p className={cx(label, 'truncate text-[0.75rem]')}>{car.brand}</p>
            <p className={cx(display, 'truncate text-[1.6rem] leading-[1.05]')}>{car.model}</p>
            <p className={cx(label, 'mt-1 flex min-w-0 items-center gap-1.5 text-[0.75rem] [@media(max-height:680px)]:hidden')}>
              <Calendar className="size-3.5 shrink-0" aria-hidden />
              <span>{meta[0]}</span>
              <span className="text-subtle" aria-hidden>
                ·
              </span>
              <span className="size-2 shrink-0 rounded-full border border-[#e4e4e6] bg-[#f4f4f5]" aria-hidden />
              <span className="truncate">{meta.slice(1).join(' · ')}</span>
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="relative isolate h-24 [@media(max-height:680px)]:h-20">
          <AnimatePresence initial={!reduce} custom={{ d: dir, reduce }}>
            <motion.div
              key={bay}
              className="absolute inset-0 z-[2]"
              custom={{ d: dir, reduce }}
              variants={drive}
              initial="enter"
              animate="park"
              exit="leave"
              transition={
                reduce
                  ? { duration: 0.2 }
                  : moved
                    ? { duration: 1.05, delay: 0.16, ease: EASE }
                    : { ...ARRIVE, ease: EASE }
              }
            >
              <CarArt car={car} sheen={moved || reduce ? undefined : ARRIVE.delay + ARRIVE.duration + 0.1} />
            </motion.div>
          </AnimatePresence>
          <motion.div
            className="absolute inset-y-0 left-0 z-[5] flex items-center"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fade(landed)}
          >
            <PagerButton icon={ChevronLeft} label="Vehículo anterior" onClick={() => go(-1)} />
          </motion.div>
          <motion.div
            className="absolute inset-y-0 right-0 z-[5] flex items-center"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fade(landed)}
          >
            <PagerButton icon={ChevronRight} label="Vehículo siguiente" onClick={() => go(1)} />
          </motion.div>
        </div>

        <motion.span
          className="flex items-center justify-center gap-1.5"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fade(landed)}
          aria-hidden
        >
          {FLEET.map((_, i) => (
            <span
              key={i}
              className="block h-1.5 rounded-full transition-[width,background-color] duration-400 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
              style={{
                width: i === bay ? 16 : 6,
                backgroundColor: i === bay ? car.accent : '#c9cacd',
              }}
            />
          ))}
        </motion.span>

        <motion.div
          className={cx(screenCard, 'mt-1 flex items-center gap-2 overflow-hidden px-3 py-2')}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade(landed)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <Ticker
                text={km.toLocaleString('en-US')}
                className="text-[1.55rem] font-light leading-none tracking-[-0.03em] tabular-nums"
              />
              <motion.span layout={reduce ? false : 'position'} className="text-[0.8125rem] text-muted">
                km
              </motion.span>
            </div>
          </div>
          <MileageChart key={bay} delay={moved ? 0.25 : landed} />
        </motion.div>
      </div>
    </Phone>
  )
}

function Tile({ icon: Icon, tone }: { icon: LucideIcon; tone?: 'overdue' }) {
  return (
    <span
      className={cx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-[0.6rem]',
        tone === 'overdue' ? 'bg-overdue-soft text-overdue' : 'bg-surface-3 text-ink',
      )}
    >
      <Icon className="size-4" strokeWidth={1.9} aria-hidden />
    </span>
  )
}

const PRICES = ['$35', '$58', '$80']
const GUESSES = ['38,900', '41,200', '36,500', '40,100']

/** Cycles through `values` every `every` seconds, starting at `at`. Holds the first value under reduced motion. */
function useCycle(values: string[], at: number, every: number) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce) return
    let timer = setTimeout(function next() {
      setI((n) => (n + 1) % values.length)
      timer = setTimeout(next, every * 1000)
    }, at * 1000)
    return () => clearTimeout(timer)
  }, [values, at, every, reduce])
  return values[i]
}

/** The line is already there, invisible, and fades up into place. The reverse of fading out. */
function FadeIn({ at = 0, children, className }: { at?: number; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      className={cx('max-w-full', className)}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : at, ease: EASE }}
    >
      {children}
    </motion.span>
  )
}

/** The km question and the button show as the phone lands; the single tap comes once it settles. */
const TAP = PHONE_IN + 1.75
/** After the tap the button leaves and the first card drops in. */
const OPEN = TAP + 0.16
/** The subtitle starts fading this long after its card lands. The value follows. */
const LEAD = 0.16
const VALUE_AT = LEAD + 0.28
const FADE = 0.6
const FILL = {
  change: { sub: 'Cambio de aceite', value: 'Hace 1 año' },
  invoice: { sub: '12 mar 2024' },
  price: { sub: 'Cambia en cada taller' },
}
/** How long each card takes to fill after it lands, in screen order: change, invoice, price. */
const FILL_TIME = [VALUE_AT + FADE, VALUE_AT + 0.4, VALUE_AT + FADE]
/** When each card drops in. The next one waits until the previous text has faded in. */
const FRONT = FILL_TIME.reduce<number[]>(
  (at, _, i) => [...at, i === 0 ? OPEN + 0.2 : at[i - 1] + FILL_TIME[i - 1] + 0.22],
  [],
)
const FILLED = FRONT[2] + FILL_TIME[2]

const SECTOR: Variants = {
  hidden: { opacity: 0, y: -52, scale: 0.9 },
  front: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      y: { type: 'spring', stiffness: 300, damping: 12, mass: 0.85 },
      scale: { type: 'spring', stiffness: 300, damping: 12, mass: 0.85 },
      opacity: { duration: 0.16 },
    },
  },
}

/**
 * The Garage app on the phone. The km question keeps rolling from the start; the user taps "Agregar Servicio" once and
 * the button leaves, then each section drops in and its text fades in. Even then nothing settles: the change is
 * overdue and the price changes per Taller.
 */
function ProblemRows() {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState<'idle' | 'pressed' | 'open'>(reduce ? 'open' : 'idle')
  const [front, setFront] = useState(reduce ? FRONT.length : 0)
  const price = useCycle(PRICES, FILLED + 0.4, 2.4)
  const guess = useCycle(GUESSES, PHONE_IN + 1.3, 1.2)
  const fade = (at: number) => ({ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : at, ease: EASE })

  useEffect(() => {
    if (reduce) return
    const timers = [
      setTimeout(() => setStage('pressed'), TAP * 1000),
      setTimeout(() => setStage('open'), OPEN * 1000),
      ...FRONT.map((at, i) => setTimeout(() => setFront(i + 1), at * 1000)),
    ]
    return () => timers.forEach(clearTimeout)
  }, [reduce])

  const sector = {
    variants: SECTOR,
    initial: reduce ? false : ('hidden' as const),
    animate: 'front' as const,
  }

  const rows: { icon: LucideIcon; tone?: 'overdue'; title: string; sub: ReactNode; value: ReactNode }[] = [
    {
      icon: Droplet,
      tone: 'overdue',
      title: 'Último cambio',
      sub: <FadeIn at={LEAD}>{FILL.change.sub}</FadeIn>,
      value: (
        <Overdue pulse={FILL_TIME[0] + 0.2} className="text-[0.6875rem]">
          <FadeIn at={VALUE_AT}>{FILL.change.value}</FadeIn>
        </Overdue>
      ),
    },
    {
      icon: ReceiptText,
      title: 'Factura del taller',
      sub: <FadeIn at={LEAD}>{FILL.invoice.sub}</FadeIn>,
      value: (
        <FadeIn
          at={VALUE_AT}
          className="inline-flex size-8 items-center justify-center rounded-[0.6rem] border border-line bg-surface-2 shadow-card"
        >
          <span
            aria-label="Ver foto"
            className="flex h-6 w-[1.15rem] flex-col justify-center gap-[2px] rounded-[3px] bg-white px-[3px] shadow-sm"
          >
            <span className="h-px bg-ink/40" />
            <span className="h-px w-3/4 bg-ink/25" />
            <span className="h-px bg-ink/20" />
            <span className="h-px w-1/2 bg-ink/15" />
          </span>
        </FadeIn>
      ),
    },
    {
      icon: Calculator,
      title: 'Precio',
      sub: <FadeIn at={LEAD}>{FILL.price.sub}</FadeIn>,
      value: (
        <FadeIn at={VALUE_AT} className="text-[1.15rem] font-light leading-none tracking-[-0.03em] tabular-nums">
          <Ticker text={price} />
        </FadeIn>
      ),
    },
  ]

  return (
    <Phone>
      <div className="flex flex-col gap-2.5 px-3 pt-4">
        <motion.div
          className="px-0.5"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade(PHONE_IN + 0.6)}
        >
          <p className={cx(label, 'text-[0.75rem] leading-[1.2]')}>¿A qué kilometraje fue?</p>
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="whitespace-nowrap text-[2rem] font-light leading-none tracking-[-0.03em] tabular-nums">
              <span className="text-subtle">¿</span>
              <Ticker text={guess} />
              <span className="text-subtle">?</span>
            </span>
            <span className="text-[0.8125rem] text-muted">km</span>
          </p>
        </motion.div>
        <AnimatePresence>
          {stage !== 'open' ? (
            <motion.div
              className="relative flex items-center justify-center gap-1.5 overflow-hidden rounded-[0.9rem] border border-dashed border-ink/20 bg-surface/70 py-1.5 text-[0.75rem] font-medium leading-[1.2]"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, scale: stage === 'pressed' ? 0.95 : 1 }}
              exit={{
                opacity: 0,
                y: -8,
                scale: 0.96,
                height: 0,
                paddingTop: 0,
                paddingBottom: 0,
                transition: { duration: 0.28, ease: EASE },
              }}
              transition={{
                opacity: fade(PHONE_IN + 0.8),
                y: fade(PHONE_IN + 0.8),
                scale: { type: 'spring', stiffness: 700, damping: 28 },
              }}
              aria-hidden
            >
              {!reduce ? (
                <motion.span
                  className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/15"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 1.6] }}
                  transition={{ duration: 0.5, delay: TAP - 0.05, ease: 'easeOut' }}
                />
              ) : null}
              <span className="inline-flex size-[1.125rem] items-center justify-center rounded-full bg-inverse text-on-inverse">
                <Plus className="size-3" strokeWidth={2.6} />
              </span>
              Agregar Servicio
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="mt-1 flex flex-col gap-2">
          {rows.map(({ icon, tone, title, sub, value }, i) =>
            front > i ? (
            <motion.div
              key={title}
              className={cx(screenCard, 'flex origin-top items-center gap-2 px-2.5 py-1.5')}
              {...sector}
            >
              <Tile icon={icon} tone={tone} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium leading-[1.2]">{title}</span>
                <span className={cx(label, 'mt-0.5 block truncate text-[0.75rem] leading-[1.2]')}>{sub}</span>
              </span>
              <span className="shrink-0">{value}</span>
            </motion.div>
            ) : null,
          )}
        </div>
      </div>
    </Phone>
  )
}

type Status = 'overdue' | 'soon' | 'ok'

const ESTADO: { icon: LucideIcon; name: string; status: Status; used: number }[] = [
  { icon: Droplet, name: 'Cambio de aceite', status: 'overdue', used: 1 },
  { icon: Disc3, name: 'Pastillas de freno', status: 'soon', used: 0.82 },
  { icon: RotateCw, name: 'Rotación de llantas', status: 'ok', used: 0.45 },
  { icon: BatteryMedium, name: 'Batería', status: 'ok', used: 0.3 },
]
const STATUS_WORD: Record<Status, string> = { overdue: 'Vencido', soon: 'Pronto', ok: 'Al día' }
/** Paint accent of the 370Z's Blanco perla: graphite. */
const ACCENT = '#3e3e32'

function StatusCard({ icon: Icon, name, status, used, at }: (typeof ESTADO)[number] & { at: number }) {
  const reduce = useReducedMotion()
  const overdue = status === 'overdue'
  const fill = at + 0.34
  return (
    <motion.div
      className={cx(screenCard, 'flex flex-col px-3 py-2.5')}
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : at, ease: EASE }}
    >
      <span className="flex items-center justify-between">
        <Icon className="size-4" strokeWidth={2} aria-hidden />
        {overdue ? (
          <Overdue pulse={fill + 0.8} className="text-[0.6875rem]">
            {STATUS_WORD[status]}
          </Overdue>
        ) : (
          <span className="text-[0.6875rem] font-medium text-muted">{STATUS_WORD[status]}</span>
        )}
      </span>
      <span className="my-1.5 block flex-1 text-[0.8125rem] font-medium leading-[1.2]">{name}</span>
      <span className="block h-1 overflow-hidden rounded-[2px] bg-[#e6e6e8]">
        <motion.span
          className={cx('block h-full origin-left rounded-[2px]', overdue && 'bg-overdue')}
          style={{ width: `${Math.max(4, used * 100)}%`, backgroundColor: overdue ? undefined : ACCENT }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduce ? 0 : 0.95, delay: reduce ? 0 : fill, ease: EASE }}
        />
      </span>
    </motion.div>
  )
}

/** Drops out of the Dynamic Island over the top of the screen, the way an iPhone banner arrives. */
function Aviso({ at }: { at: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="absolute inset-x-2 top-9 z-[6] flex items-center gap-2.5 rounded-[1.25rem] bg-surface/90 px-3 py-2 leading-[1.25] shadow-float backdrop-blur-md"
      initial={reduce ? false : { y: -64, scale: 0.7, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              y: { type: 'spring', stiffness: 380, damping: 26, mass: 0.85, delay: at },
              scale: { type: 'spring', stiffness: 380, damping: 26, mass: 0.85, delay: at },
              opacity: { duration: 0.22, delay: at, ease: EASE },
            }
      }
    >
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-surface-2"
        aria-hidden
      >
        <Logo className="text-[0.9rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-[0.6875rem]">
          <span className="font-semibold">Seibi</span>
          <span className="text-subtle">ahora</span>
        </span>
        <span className="block truncate text-[0.8125rem] font-medium">Cambio de aceite vencido</span>
        <span className="block truncate text-[0.75rem] text-muted">Tu 370Z · Estimado $35 a $58</span>
      </span>
    </motion.div>
  )
}

/** The phone screen scrolls from the Vehículo down to its Estado. */
const SCROLL = { delay: ARRIVE.delay + ARRIVE.duration + 0.75, duration: 1.15, ease: [0.32, 0, 0.16, 1] as const }
const SCROLL_END = SCROLL.delay + SCROLL.duration

/**
 * The Garage app on the phone: the 370Z drives in, the screen scrolls down to its Estado, every Estado lands at once
 * while it scrolls into view, then the Aviso drops in.
 */
function EstadoGrid() {
  const reduce = useReducedMotion()
  const car = FLEET[0]
  const meta = car.meta.split(' · ')
  const estado = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const start = SCROLL.delay + 0.4
  const fade = (at: number) => ({ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : at, ease: EASE })

  useLayoutEffect(() => {
    const to = -((estado.current?.offsetTop ?? 0) - 4)
    if (reduce) {
      y.set(to)
      return
    }
    const run = animate(y, to, SCROLL)
    return () => run.stop()
  }, [reduce, y])

  return (
    <Phone>
      <Aviso at={SCROLL_END + 0.8} />
      {!reduce ? (
        <motion.span
          className="absolute right-1 top-12 z-[5] h-12 w-[3px] rounded-full bg-ink/30"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, 0, 90, 90] }}
          transition={{
            duration: SCROLL.duration + 0.7,
            delay: SCROLL.delay - 0.15,
            times: [0, 0.12, 0.75, 1],
            ease: 'easeInOut',
          }}
          aria-hidden
        />
      ) : null}
      <motion.div className="relative flex flex-col px-3 pt-1" style={{ y }}>
        <motion.div
          className="px-0.5"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade(ARRIVE.delay - 0.2)}
        >
          <p className={cx(label, 'text-[0.75rem]')}>{car.brand}</p>
          <p className={cx(display, 'text-[1.6rem] leading-[1.05]')}>{car.model}</p>
          <p className={cx(label, 'mt-1 flex items-center gap-1.5 text-[0.75rem]')}>
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            <span>{meta[0]}</span>
            <span className="text-subtle" aria-hidden>
              ·
            </span>
            <span className="size-2 shrink-0 rounded-full border border-[#e4e4e6] bg-[#f4f4f5]" aria-hidden />
            <span>{meta[1]}</span>
          </p>
        </motion.div>
        <div className="relative isolate mt-1 h-28">
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { x: '115%' }}
            animate={{ x: 0 }}
            transition={{ ...ARRIVE, ease: EASE }}
          >
            <CarArt car={car} />
          </motion.div>
        </div>
        <motion.div
          className={cx(screenCard, 'mt-2 flex items-center gap-2 overflow-hidden px-3 py-2')}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade(ARRIVE.delay + ARRIVE.duration - 0.15)}
        >
          <span className="flex min-w-0 flex-1 items-baseline gap-1">
            <span className="text-[1.55rem] font-light leading-none tracking-[-0.03em] tabular-nums">
              {car.km.toLocaleString('en-US')}
            </span>
            <span className="text-[0.8125rem] text-muted">km</span>
          </span>
          <MileageChart delay={ARRIVE.delay + ARRIVE.duration - 0.15} tone="overdue" />
        </motion.div>
        <div ref={estado} className="mt-6 flex flex-col gap-2">
          <motion.div
            className="px-0.5"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fade(start - 0.3)}
          >
            <p className={cx(label, 'text-[0.75rem]')}>Tu 370Z</p>
            <p className="flex items-baseline justify-between gap-2">
              <span className={cx(display, 'text-[1.6rem] leading-[1.05]')}>Estado</span>
              <motion.span
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={fade(start + 0.5)}
              >
                <Overdue className="text-[0.75rem]">2 por atender</Overdue>
              </motion.span>
            </p>
          </motion.div>
          <div className="grid grid-cols-2 gap-1.5">
            {ESTADO.map((item) => (
              <StatusCard key={item.name} {...item} at={start} />
            ))}
          </div>
        </div>
      </motion.div>
    </Phone>
  )
}

function RevealChars({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  if (reduce) return <>{text}</>
  let offset = 0
  return (
    <span aria-hidden>
      {words.map((word, w) => {
        const first = offset
        offset += word.length + 1
        return (
          <span key={`${word}-${w}`}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((char, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: CHARS.duration, delay: delay + (first + i) * CHARS.step, ease: EASE }}
                >
                  {char}
                </motion.span>
              ))}
            </span>
            {w < words.length - 1 ? ' ' : null}
          </span>
        )
      })}
    </span>
  )
}

function RevealWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  if (reduce) return <>{text}</>
  return (
    <span aria-hidden>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: WORDS.duration, delay: delay + i * WORDS.step, ease: EASE }}
        >
          {word}
          {i < words.length - 1 ? '\u00A0' : null}
        </motion.span>
      ))}
    </span>
  )
}

function Visual({ index }: { index: number }) {
  if (index === 0) return <GarageStage />
  if (index === 1) return <ProblemRows />
  return <EstadoGrid />
}

export function Intro({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const reduce = useReducedMotion()
  const last = index === SLIDES.length - 1

  const go = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return
    setIndex(next)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1)
    else if (info.offset.x > 60) go(index - 1)
  }

  const slide = SLIDES[index]

  return (
    <div className="intro-day intro-v3 relative isolate flex h-full flex-col bg-bg pt-safe pb-safe">
      <div className="relative flex items-center justify-between px-4 pb-2 pt-4">
        <Lockup />
        {!last ? (
          <button type="button" onClick={onFinish} className="min-h-11 text-[0.9375rem] font-medium text-muted">
            Saltar
          </button>
        ) : (
          <span className="min-h-11 w-14" />
        )}
      </div>

      <motion.div
        className="relative min-h-0 flex-1 touch-pan-y"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onDragEnd}
      >
        <AnimatePresence mode="wait">
          <motion.section
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
            transition={{ duration: reduce ? 0.01 : 0.32, ease: EASE }}
            className="flex h-full flex-col overflow-hidden px-5"
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${SLIDES.length}`}
          >
            <div className="flex min-h-0 flex-1 flex-col justify-end pb-6">
              <Visual index={index} />
            </div>
            <div className="pb-2">
              <motion.p
                className="text-left text-[0.8125rem] font-medium text-muted"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
              >
                {slide.eyebrow}
              </motion.p>
              <h1 className={cx(display, 'mt-2 text-[2rem] leading-[1.04]')} aria-label={slide.title}>
                <RevealChars text={slide.title} delay={CHARS.at} />
              </h1>
              <p className="mt-3 text-pretty text-[0.9375rem] leading-[1.5] text-muted" aria-label={slide.body}>
                <RevealWords text={slide.body} delay={WORDS.at} />
              </p>
            </div>
          </motion.section>
        </AnimatePresence>
      </motion.div>

      <div className="relative flex flex-col gap-2.5 px-5 pb-3 pt-2">
        <button
          type="button"
          onClick={() => (last ? onFinish() : go(index + 1))}
          className="inline-flex h-[3.25rem] w-full select-none items-center justify-center gap-2 overflow-hidden rounded-full bg-inverse text-[1rem] font-medium text-on-inverse transition-transform duration-200 active:scale-[0.97]"
        >
          <motion.span
            key={last ? 'empezar' : 'siguiente'}
            initial={reduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            {last ? 'Empezar' : 'Siguiente'}
          </motion.span>
          <motion.span
            key={index}
            className="inline-flex"
            initial={reduce ? false : { x: -6, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.36, delay: 0.06, ease: EASE }}
            aria-hidden
          >
            <ArrowRight className="size-[1.1em]" strokeWidth={2.2} />
          </motion.span>
        </button>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Diapositivas">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                onClick={() => go(i)}
                className="flex h-8 items-center px-0.5"
              >
                <span
                  className={cx(
                    'block h-1.5 rounded-full transition-[width,background-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
                    i === index ? 'w-4 bg-ink' : 'w-1.5 bg-[#c9cacd]',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
