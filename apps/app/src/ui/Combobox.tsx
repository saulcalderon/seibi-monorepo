import { useId, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Field } from './fields'
import { cx } from './cx'

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Text input with a filtered suggestion list. Free text is always allowed:
 * the list helps, it does not restrict.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  loading,
  maxShown = 8,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  hint?: string
  error?: string | null
  loading?: boolean
  maxShown?: number
}) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const matches = useMemo(() => {
    const needle = fold(value.trim())
    const list = needle
      ? options.filter((o) => fold(o).includes(needle)).sort((a, b) => {
          const as = fold(a).startsWith(needle) ? 0 : 1
          const bs = fold(b).startsWith(needle) ? 0 : 1
          return as - bs
        })
      : options
    return list.slice(0, maxShown)
  }, [value, options, maxShown])

  const exact = matches.some((m) => fold(m) === fold(value.trim()))
  const showList = open && matches.length > 0 && !exact

  function pick(option: string) {
    onChange(option)
    setOpen(false)
  }

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!showList) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((h) => Math.min(h + 1, matches.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((h) => Math.max(h - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(matches[highlight])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className={cx(
            'h-13 w-full rounded-2xl bg-surface px-4 text-[1rem] ring-1 ring-line placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-radiant',
            error && 'ring-overdue',
          )}
        />
        {loading ? (
          <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden />
        ) : null}
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-64 overflow-auto rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-line"
          >
            {matches.map((m, i) => (
              <li
                key={m}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(m)
                }}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-[0.95rem]',
                  i === highlight ? 'bg-surface-3' : undefined,
                )}
              >
                {m}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  )
}
