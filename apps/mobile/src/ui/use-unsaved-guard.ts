import { usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { confirm } from '@/ui/toast';

interface UnsavedCopy {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

/**
 * The sheet forms' shared «¿Descartar los cambios?»: unsaved input is never
 * lost to a swipe, Back or «Cerrar» without asking, and the question never
 * stacks on a second close attempt. `leave()` closes without asking once the
 * form is done (saved, or withdrawn).
 */
export function useUnsavedGuard(dirty: boolean, copy: UnsavedCopy): { leave: () => void } {
  const router = useRouter();
  /** Set once the form is done: the sheet closes without asking. */
  const [leaving, setLeaving] = useState(false);
  /** Set when the person chose «Descartar»: the close they asked for goes through. */
  const [discarded, setDiscarded] = useState(false);
  /** The discard question is on screen: a second close attempt doesn't stack another. */
  const asking = useRef(false);

  usePreventRemove(dirty && !leaving && !discarded, ({ repeat }) => {
    if (asking.current) return;
    asking.current = true;
    void confirm({ ...copy, destructive: true }).then((discard) => {
      asking.current = false;
      if (!discard) return;
      setDiscarded(true);
      // Lifts the prevention, then closes the way the person asked (swipe, Back or Cerrar).
      repeat();
    });
  });
  useEffect(() => {
    if (leaving) router.back();
  }, [leaving, router]);

  return { leave: () => setLeaving(true) };
}
