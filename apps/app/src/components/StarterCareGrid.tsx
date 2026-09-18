import * as m from '../paraglide/messages.js'

const STARTER_CARE = [
  {
    id: 'oil',
    title: () => m.know_lesson_oil_title(),
    hint: () => m.know_none_oil_hint(),
    glyph: (
      <path
        d="M12 3.2S6.8 10 6.8 14a5.2 5.2 0 0010.4 0C17.2 10 12 3.2 12 3.2z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: 'brakes',
    title: () => m.know_lesson_brakes_title(),
    hint: () => m.know_none_brakes_hint(),
    glyph: (
      <>
        <circle cx="12" cy="12" r="7.2" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3" strokeWidth="1.7" />
      </>
    ),
  },
  {
    id: 'tires',
    title: () => m.know_lesson_tires_title(),
    hint: () => m.know_none_tires_hint(),
    glyph: (
      <>
        <circle cx="12" cy="12" r="7.4" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.3" strokeWidth="1.7" />
        <path
          d="M12 4.6v2.3M12 17.1v2.3M4.6 12h2.3M17.1 12h2.3"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: 'filter',
    title: () => m.know_lesson_filter_title(),
    hint: () => m.know_none_filter_hint(),
    glyph: (
      <>
        <rect x="4.8" y="6" width="14.4" height="12" rx="2" strokeWidth="1.7" />
        <path
          d="M8.2 8.3v7.4M10.7 8.3v7.4M13.3 8.3v7.4M15.8 8.3v7.4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
] as const

export function StarterCareGrid() {
  return (
    <ul className="know-suggest-grid">
      {STARTER_CARE.map((item) => (
        <li key={item.id} className="know-suggest-card">
          <span className="know-q-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {item.glyph}
            </svg>
          </span>
          <p className="know-suggest-title">{item.title()}</p>
          <p className="know-suggest-hint">{item.hint()}</p>
        </li>
      ))}
    </ul>
  )
}
