import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './cx'

const CONTROL =
  'w-full rounded-2xl bg-surface px-4 text-[1rem] text-ink ring-1 ring-line placeholder:text-subtle transition-shadow focus:outline-none focus:ring-2 focus:ring-radiant disabled:opacity-60'

type FieldShell = {
  label: string
  hint?: ReactNode
  error?: string | null
  optional?: boolean
  className?: string
}

export function Field({
  label,
  hint,
  error,
  optional,
  className,
  htmlFor,
  children,
}: FieldShell & { htmlFor?: string; children: ReactNode }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="px-1 text-[0.82rem] font-semibold text-muted">
        {label}
        {optional ? <span className="font-normal text-subtle"> · opcional</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="px-1 text-[0.8rem] font-medium text-overdue">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-[0.8rem] text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  suffix,
  ...input
}: FieldShell & InputHTMLAttributes<HTMLInputElement> & { suffix?: ReactNode }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          className={cx(CONTROL, 'h-13', suffix ? 'pr-14' : undefined, error && 'ring-overdue')}
          {...input}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[0.9rem] font-semibold text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  )
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...select
}: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          className={cx(CONTROL, 'h-13 appearance-none pr-10', error && 'ring-overdue')}
          {...select}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </Field>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  ...area
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} htmlFor={id}>
      <textarea id={id} rows={3} className={cx(CONTROL, 'resize-none py-3')} {...area} />
    </Field>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-[0.82rem] text-muted">{description}</span> : null}
      </span>
      <span
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-radiant' : 'bg-surface-3',
        )}
        aria-hidden
      >
        <span
          className={cx(
            'absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl bg-surface-3 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 flex-1 rounded-xl px-3 text-[0.88rem] font-semibold transition-all',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  selected,
  onClick,
  children,
  icon: Icon,
  count,
}: {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  count?: number
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.85rem] font-semibold transition-colors',
        selected ? 'bg-inverse text-on-inverse' : 'bg-surface text-ink ring-1 ring-line',
      )}
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
      {count != null ? (
        <span
          className={cx(
            'ml-0.5 rounded-full px-1.5 text-[0.72rem] tabular',
            selected ? 'bg-on-inverse/15' : 'bg-surface-3',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

/** Parses "12,345" or "12345.6" typed on a phone keypad. */
export function parseNumber(value: string): number | null {
  const clean = value.replace(/[,\s]/g, '').trim()
  if (!clean) return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}
