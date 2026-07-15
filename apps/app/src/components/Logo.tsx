interface LogoProps {
  className?: string
}

// Wordmark: "Sei" in ink, "bi" in milano red. Brand asset, not translatable.
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={`font-bold tracking-tight leading-none ${className ?? ''}`}
    >
      <span className="text-ink">Sei</span>
      <span className="text-milano">bi</span>
    </span>
  )
}
