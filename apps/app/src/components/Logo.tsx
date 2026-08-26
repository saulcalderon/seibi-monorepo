interface LogoProps {
  className?: string
}

// Wordmark: "Sei" in coal, "bi" in radiant. Brand asset, not translatable.
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={`font-display font-semibold tracking-tight leading-none ${className ?? ''}`}
    >
      <span className="text-coal">Sei</span>
      <span className="text-radiant">bi</span>
    </span>
  )
}
