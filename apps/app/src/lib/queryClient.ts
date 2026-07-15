import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data around long enough to power offline reads (ADR-0001).
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
  },
})

// Persist the query cache into IndexedDB so vehicles / history / reminders
// remain viewable without a connection.
export const persister = createAsyncStoragePersister({
  key: 'seibi-query-cache',
  storage: {
    getItem: (key: string) => get<string>(key).then((value) => value ?? null),
    setItem: (key: string, value: string) => set(key, value),
    removeItem: (key: string) => del(key),
  },
})
