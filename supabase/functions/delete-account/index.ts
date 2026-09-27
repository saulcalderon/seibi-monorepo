// Deletes the caller's account and everything they own. Vehicles and their
// rows cascade from auth.users; invoice files are removed first.

import { handler, json } from '../_shared/http.ts'
import { adminClient, requireUser } from '../_shared/supabase.ts'

const INVOICES = 'service-invoices'

Deno.serve(handler(async (req) => {
  const user = await requireUser(req)
  const db = adminClient()

  // Invoices live under "<user_id>/<service_id>/<file>".
  const { data: folders } = await db.storage.from(INVOICES).list(user.id, { limit: 1000 })
  const paths: string[] = []
  for (const folder of folders ?? []) {
    const { data: files } = await db.storage.from(INVOICES).list(`${user.id}/${folder.name}`, { limit: 1000 })
    for (const f of files ?? []) paths.push(`${user.id}/${folder.name}/${f.name}`)
  }
  if (paths.length > 0) {
    const { error } = await db.storage.from(INVOICES).remove(paths)
    if (error) throw error
  }

  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) throw error
  return json(req, { deleted: true })
}))
