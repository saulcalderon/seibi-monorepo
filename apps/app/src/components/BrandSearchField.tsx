import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { VEHICLE_BRANDS, type VehicleBrandOption } from '../lib/vehicleProfile'
import * as m from '../paraglide/messages.js'

type BrandValue = {
  brand: VehicleBrandOption | ''
  brandOther: string
}

function displayQuery(value: BrandValue) {
  if (value.brand === 'other') return value.brandOther
  return value.brand
}

function matchKnownBrand(text: string): (typeof VEHICLE_BRANDS)[number] | undefined {
  const needle = text.trim().toLocaleLowerCase('es')
  if (!needle) return undefined
  return VEHICLE_BRANDS.find((brand) => brand.toLocaleLowerCase('es') === needle)
}

function valueFromText(text: string): BrandValue {
  const trimmed = text.trim()
  if (!trimmed) return { brand: '', brandOther: '' }
  const known = matchKnownBrand(trimmed)
  if (known) return { brand: known, brandOther: '' }
  return { brand: 'other', brandOther: text }
}

export function BrandSearchField({
  brand,
  brandOther,
  onChange,
  autoFocus = false,
}: BrandValue & {
  onChange: (next: BrandValue) => void
  autoFocus?: boolean
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(() => displayQuery({ brand, brandOther }))

  useEffect(() => {
    setQuery(displayQuery({ brand, brandOther }))
  }, [brand, brandOther])

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [])

  const suggestions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es')
    if (!needle) return [...VEHICLE_BRANDS]
    return VEHICLE_BRANDS.filter((item) => item.toLocaleLowerCase('es').includes(needle))
  }, [query])

  const exactKnown = matchKnownBrand(query)
  const customLabel = query.trim()
  const showCustom =
    customLabel.length > 1 && !exactKnown && !suggestions.some((item) => item === customLabel)

  function commitText(text: string) {
    setQuery(text)
    onChange(valueFromText(text))
  }

  function selectBrand(option: (typeof VEHICLE_BRANDS)[number]) {
    setQuery(option)
    onChange({ brand: option, brandOther: '' })
    setOpen(false)
  }

  function selectCustom() {
    const next = valueFromText(customLabel)
    setQuery(next.brandOther || customLabel)
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="brand-search" ref={rootRef}>
      <label className="vehicle-setup-field brand-search-field">
        <input
          value={query}
          onChange={(event) => {
            commitText(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={m.setup_1_search_placeholder()}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </label>

      {open ? (
        <ul id={listId} className="brand-search-list" role="listbox">
          {suggestions.map((option) => {
            const active =
              brand === option || option.toLocaleLowerCase('es') === query.trim().toLocaleLowerCase('es')
            return (
              <li key={option} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`brand-search-option${active ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBrand(option)}
                >
                  {option}
                </button>
              </li>
            )
          })}

          {showCustom ? (
            <li role="option" aria-selected={brand === 'other'}>
              <button
                type="button"
                className={`brand-search-option brand-search-option--custom${
                  brand === 'other' ? ' is-active' : ''
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={selectCustom}
              >
                {m.setup_1_use_custom({ brand: customLabel })}
              </button>
            </li>
          ) : null}

          {suggestions.length === 0 && !showCustom ? (
            <li className="brand-search-empty">{m.setup_1_no_matches()}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
