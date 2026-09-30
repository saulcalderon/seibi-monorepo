import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-radiant text-white shadow-[0_8px_20px_rgb(232_83_34/28%)] hover:bg-radiant-strong active:bg-radiant-strong',
  secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-3/70',
  danger: 'bg-overdue-soft text-overdue hover:brightness-95',
  inverse: 'bg-inverse text-on-inverse hover:opacity-90',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.82rem] gap-1.5 rounded-xl',
  md: 'h-11 px-4.5 text-[0.92rem] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-[1rem] gap-2.5 rounded-[1.1rem]',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  trailingIcon?: LucideIcon
  loading?: boolean
  block?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    trailingIcon: Trailing,
    loading,
    block,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition-[background,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="size-[1.1em] animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="size-[1.15em] shrink-0" aria-hidden strokeWidth={2.2} />
      ) : null}
      {children}
      {Trailing && !loading ? (
        <Trailing className="size-[1.1em] shrink-0" aria-hidden strokeWidth={2.2} />
      ) : null}
    </button>
  )
})

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  variant?: 'ghost' | 'secondary' | 'inverse'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl transition-[background,transform] duration-150 active:scale-95 disabled:opacity-40',
        variant === 'ghost' && 'text-ink hover:bg-surface-3/70',
        variant === 'secondary' && 'bg-surface text-ink ring-1 ring-line shadow-card',
        variant === 'inverse' && 'bg-inverse text-on-inverse',
        className,
      )}
      {...rest}
    >
      <Icon className="size-5" aria-hidden strokeWidth={2.1} />
    </button>
  )
}
