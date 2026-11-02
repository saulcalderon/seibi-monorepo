import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cx } from '../ui/cx'

const EASE = [0.2, 0.7, 0.2, 1] as const

/** Each place slides to its new character, units first. Places are keyed from the right so digits stay aligned. */
export function Ticker({ text, className }: { text: string; className?: string }) {
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
