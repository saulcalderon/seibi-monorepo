import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  modelsForBrand,
  VEHICLE_BRANDS,
  type VehicleBrandOption,
} from '../lib/vehicleProfile'
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

      <button
        type="button"
        className={`brand-search-tab${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="brand-search-tab-copy">
          <span className="brand-search-tab-label">{m.setup_1_brands_tab()}</span>
          {brand && brand !== 'other' ? (
            <span className="brand-search-tab-meta">{brand}</span>
          ) : null}
        </span>
        <span className="brand-search-tab-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

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

export function ModelSearchField({
  brand,
  value,
  onChange,
  autoFocus = false,
}: {
  brand: VehicleBrandOption | string | ''
  value: string
  onChange: (model: string) => void
  autoFocus?: boolean
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const catalog = modelsForBrand(brand)

  useEffect(() => {
    setQuery(value)
  }, [value])

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
    if (!needle) return catalog
    return catalog.filter((item) => item.toLocaleLowerCase('es').includes(needle))
  }, [catalog, query])

  const exactKnown = catalog.find(
    (item) => item.toLocaleLowerCase('es') === query.trim().toLocaleLowerCase('es'),
  )
  const customLabel = query.trim()
  const showCustom =
    customLabel.length > 1 && !exactKnown && !suggestions.some((item) => item === customLabel)
  const examples = catalog.slice(0, 3).join(', ')

  function commit(text: string) {
    setQuery(text)
    onChange(text)
  }

  function selectModel(option: string) {
    setQuery(option)
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="brand-search" ref={rootRef}>
      <label className="vehicle-setup-field brand-search-field">
        <input
          value={query}
          onChange={(event) => {
            commit(event.target.value)
            if (catalog.length > 0) setOpen(true)
          }}
          placeholder={
            examples ? m.setup_2_placeholder_list({ list: examples }) : m.setup_2_placeholder()
          }
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

      {catalog.length > 0 ? (
        <>
          <button
            type="button"
            className={`brand-search-tab${open ? ' is-open' : ''}`}
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="brand-search-tab-copy">
              <span className="brand-search-tab-label">{m.setup_2_models_tab()}</span>
              {exactKnown ? <span className="brand-search-tab-meta">{exactKnown}</span> : null}
            </span>
            <span className="brand-search-tab-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 10l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>

          {open ? (
            <ul id={listId} className="brand-search-list" role="listbox">
              {suggestions.map((option) => {
                const active = option.toLocaleLowerCase('es') === query.trim().toLocaleLowerCase('es')
                return (
                  <li key={option} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={`brand-search-option${active ? ' is-active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectModel(option)}
                    >
                      {option}
                    </button>
                  </li>
                )
              })}

              {showCustom ? (
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="brand-search-option brand-search-option--custom"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectModel(customLabel)}
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
        </>
      ) : null}
    </div>
  )
}
