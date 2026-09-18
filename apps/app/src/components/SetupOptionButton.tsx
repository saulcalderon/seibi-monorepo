import type { ReactNode } from 'react'

export function SetupOptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`setup-option setup-option--block${selected ? ' is-selected' : ''}`}
    >
      <span className="setup-option-fill" aria-hidden="true" />
      <span className="setup-option-label">{children}</span>
    </button>
  )
}
