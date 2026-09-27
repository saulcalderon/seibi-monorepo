import { useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import {
  BellRing,
  Calculator,
  CalendarX,
  ChevronRight,
  FileQuestion,
  Gauge,
  ReceiptText,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { Silhouette } from '../components/VehicleVisual'
import { Button } from '../ui/Button'
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

function Visual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <motion.div
          className="absolute size-64 rounded-full bg-radiant/15 blur-3xl"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 5 }}
        />
        <div className="relative flex flex-col items-center gap-6">
          <Logo className="text-[4.2rem]" />
          <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', damping: 18 }}>
            <Silhouette bodyType="suv" color="red" className="h-28 w-64" />
          </motion.div>
        </div>
      </div>
    )
  }
  if (index === 1) {
    const items = [
      { icon: CalendarX, x: -86, y: -70, r: -8 },
      { icon: ReceiptText, x: 84, y: -52, r: 10 },
      { icon: FileQuestion, x: -70, y: 64, r: 6 },
      { icon: Wrench, x: 90, y: 70, r: -12 },
    ]
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <span className="absolute font-display text-[5rem] font-semibold text-ink/10">?</span>
        {items.map(({ icon: Icon, x, y, r }, i) => (
          <motion.span
            key={i}
            className="absolute inline-flex size-16 items-center justify-center rounded-[1.25rem] bg-surface shadow-card"
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{ x, y, opacity: 1, rotate: r }}
            transition={{ delay: 0.08 * i, type: 'spring', damping: 14 }}
          >
            <Icon className="size-7 text-muted" aria-hidden />
          </motion.span>
        ))}
      </div>
    )
  }
  const cards = [
    { icon: ShieldCheck, title: 'Plan del fabricante', body: 'Toyota Corolla 2018', tone: 'bg-ok-soft text-ok' },
    { icon: BellRing, title: 'Cambio de aceite', body: 'En 800 km · aprox. 12 días', tone: 'bg-soon-soft text-soon' },
    { icon: Calculator, title: 'Estimado en San Salvador', body: '$35 – $60 en taller', tone: 'bg-radiant-soft text-radiant' },
    { icon: Gauge, title: 'Uso estimado', body: '210 km por semana', tone: 'bg-surface-3 text-ink' },
  ]
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 px-6">
      {cards.map(({ icon: Icon, title, body, tone }, i) => (
        <motion.div
          key={title}
          className="flex w-full max-w-72 items-center gap-3 rounded-2xl bg-surface p-3 shadow-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.09 }}
        >
          <span className={cx('inline-flex size-10 items-center justify-center rounded-xl', tone)}>
            <Icon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-[0.88rem] font-bold">{title}</span>
            <span className="block text-[0.78rem] text-muted">{body}</span>
          </span>
        </motion.div>
      ))}
    </div>
  )
}

export function Intro({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const last = index === SLIDES.length - 1

  const go = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return
    setDirection(next > index ? 1 : -1)
    setIndex(next)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1)
    else if (info.offset.x > 60) go(index - 1)
  }

  const slide = SLIDES[index]

  return (
    <div className="flex h-full flex-col bg-bg pt-safe pb-safe">
      <div className="flex items-center justify-between px-5 pt-2">
        <Logo className="text-[1.6rem]" />
        {!last ? (
          <button type="button" onClick={onFinish} className="min-h-11 px-2 text-[0.9rem] font-semibold text-muted">
            Saltar
          </button>
        ) : null}
      </div>

      <motion.div className="relative min-h-0 flex-1 touch-pan-y" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            className="flex h-full flex-col"
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${SLIDES.length}`}
          >
            <div className="min-h-0 flex-1">
              <Visual index={index} />
            </div>
            <div className="px-6 pb-4">
              <p className="text-[0.8rem] font-bold uppercase tracking-[0.14em] text-radiant">{slide.eyebrow}</p>
              <h1 className="mt-2 text-[2rem] leading-[1.08]">{slide.title}</h1>
              <p className="mt-3 text-[1rem] text-muted">{slide.body}</p>
            </div>
          </motion.section>
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center gap-4 px-6 pb-3 pt-2">
        <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Diapositivas">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              onClick={() => go(i)}
              className="flex h-11 items-center"
            >
              <span className={cx('block h-1.5 rounded-full transition-all', i === index ? 'w-7 bg-radiant' : 'w-1.5 bg-ink/20')} />
            </button>
          ))}
        </div>
        <Button size="lg" trailingIcon={ChevronRight} onClick={() => (last ? onFinish() : go(index + 1))}>
          {last ? 'Empezar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}
