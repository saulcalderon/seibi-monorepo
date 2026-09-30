-- SEI-34: run the reminders-daily Edge Function every day at 14:00 UTC
-- (08:00 in El Salvador). The job reads two Vault secrets, so no URL or key
-- lives in the migration:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'cron_secret');
-- Until both exist the job does nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_reminders_daily()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  cron_secret text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets where name = 'cron_secret';
  if project_url is null or cron_secret is null then
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/reminders-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function public.invoke_reminders_daily() from public, anon, authenticated;

select cron.schedule(
  'reminders-daily',
  '0 14 * * *',
  $$select public.invoke_reminders_daily()$$
);
