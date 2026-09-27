import { invokeFunction } from './functions'
import { queryClient } from './queryClient'
import { signOut } from './supabase'

/** Deletes the account and everything in it, then signs out locally. */
export async function deleteAccount() {
  await invokeFunction<{ deleted: boolean }>('delete-account', {})
  await signOut().catch(() => undefined)
  queryClient.clear()
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('seibi-')) localStorage.removeItem(key)
    }
  } catch {
    // Nothing to clean in private mode.
  }
}
