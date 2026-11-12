import { forwardRef } from 'react'
import { cx } from '../ui/cx'
import { Logo } from './Logo'

/** Isotipo + "seibı" wordmark (Archivo 700 expanded) with the Redline square dot. Size it with font-size. */
export const Lockup = forwardRef<HTMLSpanElement, { className?: string }>(function Lockup({ className }, ref) {
  return (
    <span
      ref={ref}
      className={cx('inline-flex items-center gap-[0.28em] text-[1.375rem] leading-none', className)}
      style={{ transformOrigin: 'center center' }}
    >
      <Logo className="text-[0.95em]" />
      <span data-lockup-word className="inline-flex items-baseline font-bold tracking-[-0.035em] [font-stretch:125%]" aria-hidden>
        seib
        <span className="relative inline-block after:absolute after:left-1/2 after:top-[-0.02em] after:size-[0.15em] after:-translate-x-1/2 after:-skew-x-14 after:rounded-[0.02em] after:bg-[#e0464f] after:content-['']">
          ı
        </span>
      </span>
    </span>
  )
})
