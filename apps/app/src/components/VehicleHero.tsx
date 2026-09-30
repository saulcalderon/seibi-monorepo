import { lazy, Suspense, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Rotate3d, Sparkles } from 'lucide-react'
import type { VehicleView } from '../lib/garage'
import { cx } from '../ui/cx'
import { VehicleVisual } from './VehicleVisual'

const VehicleModel3D = lazy(() => import('./VehicleModel3D'))

/**
 * The main Vehicle stage: live 3D when the GLB is ready, otherwise the
 * poster or silhouette. One live canvas per screen at most (ADR-0008).
 */
export function VehicleHero({ vehicle, className }: { vehicle: VehicleView; className?: string }) {
  const glb = vehicle.render?.glbUrl ?? null
  const [ready3d, setReady3d] = useState(false)
  const [failed3d, setFailed3d] = useState(false)
  const show3d = Boolean(glb) && !failed3d
  const generating = vehicle.render?.generating ?? false

  return (
    <div className={cx('relative isolate', className)}>
      <div
        className="absolute inset-x-6 bottom-2 top-8 -z-10 rounded-full bg-radiant/10 blur-3xl"
        aria-hidden
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center px-2"
        animate={{ opacity: show3d && ready3d ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <VehicleVisual
          render={vehicle.render}
          bodyType={vehicle.bodyType}
          color={vehicle.color}
          alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
          className="h-full w-full"
        />
      </motion.div>
      {show3d ? (
        <Suspense fallback={null}>
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: ready3d ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            aria-label={`Modelo 3D de ${vehicle.brand} ${vehicle.model}. Desliza para girarlo.`}
            role="img"
          >
            <VehicleModel3D
              url={glb!}
              onReady={() => setReady3d(true)}
              onError={() => setFailed3d(true)}
            />
          </motion.div>
        </Suspense>
      ) : null}
      <AnimatePresence>
        {show3d && ready3d ? (
          <motion.span
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-1 right-2 inline-flex items-center gap-1 rounded-full bg-surface/80 px-2 py-1 text-[0.7rem] font-semibold text-muted backdrop-blur"
          >
            <Rotate3d className="size-3.5" aria-hidden /> 3D
          </motion.span>
        ) : generating ? (
          <motion.span
            key="gen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-1 right-2 inline-flex items-center gap-1 rounded-full bg-surface/80 px-2 py-1 text-[0.7rem] font-semibold text-muted backdrop-blur"
          >
            <Sparkles className="size-3.5 animate-pulse text-radiant" aria-hidden />
            Generando modelo 3D
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
