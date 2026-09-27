import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../ui/Button'

/** "Hay una nueva versión" banner instead of reloading under the user. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version every hour while the app is open.
      if (registration) window.setInterval(() => void registration.update(), 60 * 60_000)
    },
  })

  return (
    <AnimatePresence>
      {needRefresh ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          role="status"
          className="fixed inset-x-3 bottom-[calc(var(--dock-height)+var(--safe-bottom)+1.25rem)] z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-inverse p-3 pl-4 text-on-inverse shadow-float"
        >
          <p className="flex-1 text-[0.88rem] font-semibold">Hay una nueva versión de Seibi</p>
          <Button size="sm" variant="primary" icon={RefreshCw} onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </Button>
          <button type="button" onClick={() => setNeedRefresh(false)} className="min-h-9 px-1 text-[0.8rem] opacity-70">
            Luego
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
