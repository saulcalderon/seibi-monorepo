import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

/**
 * The app's one query cache. It holds the person's data in memory only
 * (nothing is persisted: no offline data), and sign-out clears it
 * (`src/auth/session.ts`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The PWA's defaults: fresh for a minute, one retry.
      staleTime: 60_000,
      retry: 1,
      // On a phone "focus" is the app coming back to the foreground (below).
      refetchOnWindowFocus: true,
    },
  },
});

// TanStack Query listens for browser focus by default, which React Native
// never fires. Coming back to the foreground counts as focus, so stale
// queries refetch then. Online state stays TanStack's default (always
// online): reading the network needs a native module the app doesn't ship.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => subscription.remove();
});
