import { useState } from 'react'
import { motion } from 'motion/react'
import type { BodyType, RenderInfo } from '../lib/garage'
import { paintHex } from '../lib/paint'
import { cx } from '../ui/cx'

// Side-profile silhouettes per body type (viewBox 0 0 240 96). They stand in
// for the Model render until fal finishes, or when it cannot be generated.
const BODIES: Record<BodyType, { body: string; glass: string[]; wheels: [number, number] }> = {
  sedan: {
    body: 'M12 70 L20 54 Q34 49 62 47 L88 31 Q98 25 122 25 L150 25 Q166 26 180 41 L206 47 Q226 51 230 62 L232 72 Q232 77 226 77 L16 77 Q12 77 12 70 Z',
    glass: ['M93 34 L118 29.5 L118 46 L80 46.5 Z', 'M124 29.5 L150 29.5 Q160 31 171 45 L124 46 Z'],
    wheels: [62, 186],
  },
  hatchback: {
    body: 'M14 70 L22 54 Q36 49 64 47 L90 29 Q100 23 124 23 L160 23 Q176 24 188 40 L200 50 Q206 56 206 64 L206 72 Q206 77 200 77 L18 77 Q14 77 14 70 Z',
    glass: ['M95 32 L120 27.5 L120 46 L82 46.5 Z', 'M126 27.5 L158 27.5 Q170 29 180 44 L126 46 Z'],
    wheels: [62, 170],
  },
  suv: {
    body: 'M12 68 L16 50 Q26 44 56 42 L78 22 Q86 16 106 16 L186 16 Q200 17 208 30 L218 44 Q230 48 231 60 L232 72 Q232 78 226 78 L16 78 Q12 78 12 72 Z',
    glass: ['M84 25 L114 21 L114 41 L66 42 Z', 'M120 21 L150 21 L150 41 L120 41 Z', 'M156 21 L186 21 Q196 22 202 34 L204 41 L156 41 Z'],
    wheels: [60, 190],
  },
  pickup: {
    body: 'M10 66 L14 50 Q24 44 50 42 L70 22 Q76 17 92 17 L126 17 Q134 17 136 26 L138 44 L232 44 L234 72 Q234 78 228 78 L14 78 Q10 78 10 72 Z',
    glass: ['M76 25 L100 21 L100 41 L60 42 Z', 'M106 21 L126 21 Q130 21 131 27 L132 41 L106 41 Z'],
    wheels: [56, 194],
  },
  van: {
    body: 'M12 70 L14 44 Q18 32 34 26 L58 14 Q66 11 80 11 L220 11 Q230 11 231 22 L233 72 Q233 78 227 78 L16 78 Q12 78 12 72 Z',
    glass: ['M60 19 L84 16 L84 40 L38 40 Q44 28 60 19 Z', 'M90 16 L132 16 L132 40 L90 40 Z', 'M138 16 L180 16 L180 40 L138 40 Z'],
    wheels: [58, 196],
  },
  minivan: {
    body: 'M12 70 L16 50 Q24 42 46 38 L78 18 Q88 13 108 13 L196 13 Q212 14 220 30 L228 48 Q232 54 232 64 L232 72 Q232 78 226 78 L16 78 Q12 78 12 72 Z',
    glass: ['M84 22 L112 18 L112 40 L62 40 Z', 'M118 18 L156 18 L156 40 L118 40 Z', 'M162 18 L194 18 Q206 19 212 34 L214 40 L162 40 Z'],
    wheels: [60, 190],
  },
  coupe: {
    body: 'M12 70 L20 55 Q36 50 66 48 L96 32 Q108 27 128 27 L146 27 Q162 29 180 44 L208 49 Q228 53 231 63 L232 72 Q232 77 226 77 L16 77 Q12 77 12 70 Z',
    glass: ['M101 35 L128 31 Q146 31 162 46 L88 47.5 Z'],
    wheels: [64, 188],
  },
  wagon: {
    body: 'M12 70 L20 54 Q34 49 62 47 L88 29 Q98 23 122 23 L196 23 Q208 24 214 36 L222 50 Q230 54 231 63 L232 72 Q232 77 226 77 L16 77 Q12 77 12 70 Z',
    glass: ['M93 32 L118 27.5 L118 46 L80 46.5 Z', 'M124 27.5 L160 27.5 L160 46 L124 46 Z', 'M166 27.5 L194 27.5 Q202 28.5 207 40 L208 46 L166 46 Z'],
    wheels: [62, 190],
  },
}

export function Silhouette({
  bodyType,
  color,
  className,
}: {
  bodyType: BodyType | null
  color: string | null
  className?: string
}) {
  const shape = BODIES[bodyType ?? 'sedan']
  const paint = paintHex(color)
  return (
    <svg viewBox="0 0 240 96" className={className} role="img" aria-label="Silueta del Vehículo">
      <ellipse cx="122" cy="84" rx="110" ry="6" className="fill-ink/10" />
      <path d={shape.body} fill={paint} stroke="rgb(0 0 0 / 18%)" strokeWidth="1" />
      <path d={shape.body} fill="url(#sheen)" opacity="0.5" />
      {shape.glass.map((d) => (
        <path key={d} d={d} fill="#1d2430" opacity="0.82" />
      ))}
      {shape.wheels.map((x) => (
        <g key={x}>
          <circle cx={x} cy={76} r={14} fill="#15161a" />
          <circle cx={x} cy={76} r={7.5} fill="#b9bec6" />
          <circle cx={x} cy={76} r={2.5} fill="#3a3d44" />
        </g>
      ))}
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * 2D Vehicle image: the fal poster when it exists, else the silhouette.
 * Used in lists and cards; the live 3D model is only in the hero (ADR-0008).
 */
export function VehicleVisual({
  render,
  bodyType,
  color,
  className,
  alt,
  crop = false,
}: {
  render: RenderInfo | null
  bodyType: BodyType | null
  color: string | null
  className?: string
  alt: string
  /** Fill the box and trim the poster's studio margins. */
  crop?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const poster = !failed ? render?.posterUrl : null
  return (
    <div className={cx('relative flex items-center justify-center', className)}>
      {poster ? (
        <motion.img
          key={poster}
          src={poster}
          alt={`${alt} (ilustración)`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={cx(
            'h-full w-full mix-blend-multiply dark:mix-blend-normal',
            crop ? 'scale-[1.22] object-cover' : 'object-contain',
          )}
        />
      ) : (
        <Silhouette bodyType={bodyType} color={color} className={cx('h-full w-full', crop && 'px-2')} />
      )}
    </div>
  )
}
