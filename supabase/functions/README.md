# Edge Functions

Server work for Seibi (ADR-0006). Deployed by `migrate-production.yml` on
merge to `main`, after migrations.

| Function | Called by | Auth |
| --- | --- | --- |
| `vehicle-lookup` | app, after a Vehicle is created or its model changes | user JWT |
| `vehicle-render` | app, after a Vehicle is created or its paint changes | user JWT |
| `vehicle-render-webhook` | fal | HMAC token in the URL |
| `estimates` | app (Estimados) | user JWT |
| `chat` | app (Estimados → chat) | user JWT |
| `reminders-daily` | pg_cron, 14:00 UTC | `x-cron-secret` |
| `delete-account` | app (Perfil) | user JWT |

`reminders-daily` imports `packages/maintenance-engine` by relative path, so
the app and the push job compute the same Reminders (ADR-0010).

## Secrets (once per project)

```sh
npx supabase secrets set \
  OPENAI_API_KEY=... OPENAI_MODEL=gpt-6-astra \
  FAL_KEY=... \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
  CRON_SECRET=... RENDER_WEBHOOK_SECRET=...
```

Optional: `FAL_IMAGE_MODEL` (default `fal-ai/flux-pro/v1.1-ultra`),
`FAL_3D_MODEL` (default `fal-ai/trellis`), `AI_DAILY_LIMIT` (default 20),
`ALLOWED_ORIGINS`, `OPENAI_BASE_URL`, `PUBLIC_FUNCTIONS_URL`.

Generate VAPID keys with `npx web-push generate-vapid-keys`. The public key
also goes in the app as `VITE_VAPID_PUBLIC_KEY`.

Without `OPENAI_API_KEY`, Vehicles use the general schedule. Without
`FAL_KEY`, they keep the body-type silhouette. Nothing is written in either
case, so adding the key later just works.

## Daily push job

The cron job reads two Vault secrets. Run once in the SQL editor:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');
```

## Local

```sh
npx supabase start
npx supabase functions serve --env-file supabase/functions/.env.local
for f in supabase/functions/*/index.ts; do deno check "$f"; done
```

fal cannot reach a local webhook; set `PUBLIC_FUNCTIONS_URL` to a tunnel
(for example `cloudflared`) to test renders end to end.
