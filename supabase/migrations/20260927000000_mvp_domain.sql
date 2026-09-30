-- SEI-34: MVP domain.
-- Profiles, Service items, Maintenance tasks and schedules, Appointments,
-- Routines, hand-written Reminders, Estimates, chat, Model renders, push,
-- and AI usage. Glossary: CONTEXT.md. Decisions: ADR-0006 to ADR-0010.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger mileage_readings_set_updated_at
  before update on public.mileage_readings
  for each row execute function public.set_updated_at();
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- A Vehicle owns its readings and Services. Account deletion removes the
-- user, which cascades to Vehicles; readings and Services must follow.
-- Users still cannot delete any of these rows (no DELETE grant).
alter table public.mileage_readings
  drop constraint mileage_readings_vehicle_id_fkey,
  add constraint mileage_readings_vehicle_id_fkey
    foreign key (vehicle_id) references public.vehicles (id) on delete cascade;
alter table public.services
  drop constraint services_vehicle_id_fkey,
  add constraint services_vehicle_id_fkey
    foreign key (vehicle_id) references public.vehicles (id) on delete cascade;
alter table public.services
  drop constraint services_reading_same_vehicle_fk,
  add constraint services_reading_same_vehicle_fk
    foreign key (mileage_reading_id, vehicle_id)
    references public.mileage_readings (id, vehicle_id)
    on delete cascade;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.knowledge_level as enum ('none', 'basic', 'intermediate', 'advanced');
create type public.country_code as enum ('SV', 'US');
create type public.body_type as enum (
  'sedan', 'hatchback', 'suv', 'pickup', 'van', 'minivan', 'coupe', 'wagon'
);
create type public.schedule_status as enum ('pending', 'ready', 'general', 'failed');
create type public.render_status as enum ('pending', 'poster_ready', 'ready', 'failed');
create type public.chat_role as enum ('user', 'assistant');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  country public.country_code,
  city text,
  knowledge_level public.knowledge_level,
  onboarded_at timestamptz,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 60),
  constraint profiles_city_length check (char_length(city) <= 80)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Maintenance tasks and schedules
-- ---------------------------------------------------------------------------

create table public.maintenance_tasks (
  code text primary key,
  name text not null,
  plain_name text not null,
  description text not null,
  sort_order smallint not null,
  -- General schedule. Null means the task has no general interval and only
  -- a model-specific Maintenance schedule can set one.
  general_distance_km integer,
  general_months smallint,
  constraint maintenance_tasks_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint maintenance_tasks_general_positive check (
    (general_distance_km is null or general_distance_km > 0)
    and (general_months is null or general_months > 0)
  )
);

-- General intervals are conservative, commonly published starting points.
-- The UI labels them "Recomendación general, no específica de tu modelo"
-- (ADR-0007). Model-specific schedules replace them.
insert into public.maintenance_tasks
  (code, name, plain_name, description, sort_order, general_distance_km, general_months)
values
  ('engine_oil', 'Cambio de aceite de motor', 'Cambio de aceite',
   'El aceite lubrica y enfría el motor. Con el uso pierde sus propiedades.', 10, 5000, 6),
  ('oil_filter', 'Filtro de aceite', 'Filtro de aceite',
   'Retiene impurezas del aceite. Se cambia junto con el aceite.', 20, 5000, 6),
  ('air_filter', 'Filtro de aire del motor', 'Filtro de aire',
   'Evita que polvo y suciedad entren al motor.', 30, 20000, 12),
  ('cabin_filter', 'Filtro de aire de cabina', 'Filtro del aire acondicionado',
   'Limpia el aire que entra a la cabina por la ventilación.', 40, 20000, 12),
  ('fuel_filter', 'Filtro de combustible', 'Filtro de gasolina',
   'Retiene impurezas del combustible antes de llegar al motor.', 50, null, null),
  ('spark_plugs', 'Bujías', 'Bujías',
   'Generan la chispa que enciende el combustible en el motor de gasolina.', 60, 40000, 48),
  ('brake_inspection', 'Revisión de frenos', 'Revisión de frenos',
   'Revisión de pastillas, discos y líneas de freno.', 70, 10000, 12),
  ('brake_pads_front', 'Pastillas de freno delanteras', 'Frenos delanteros',
   'Piezas que presionan el disco para frenar. Se desgastan con el uso.', 80, null, null),
  ('brake_pads_rear', 'Pastillas o zapatas de freno traseras', 'Frenos traseros',
   'Frenos de las ruedas traseras. Se desgastan más lento que los delanteros.', 90, null, null),
  ('brake_fluid', 'Líquido de frenos', 'Líquido de frenos',
   'Transmite la fuerza del pedal a los frenos. Absorbe humedad con el tiempo.', 100, 40000, 24),
  ('coolant', 'Líquido refrigerante', 'Refrigerante (anticongelante)',
   'Mantiene el motor a la temperatura correcta.', 110, 60000, 48),
  ('transmission_fluid', 'Aceite de transmisión', 'Aceite de la caja',
   'Lubrica la caja de cambios, automática o manual.', 120, 60000, 48),
  ('differential_fluid', 'Aceite de diferencial', 'Aceite del diferencial',
   'Lubrica los engranes que reparten la fuerza a las ruedas.', 130, null, null),
  ('power_steering_fluid', 'Líquido de dirección hidráulica', 'Líquido de la dirección',
   'Ayuda a girar el volante con poco esfuerzo, en direcciones hidráulicas.', 140, null, null),
  ('timing_belt', 'Banda de distribución', 'Banda de tiempo',
   'Sincroniza las piezas internas del motor. No todos los motores la tienen.', 150, null, null),
  ('drive_belt', 'Banda de accesorios', 'Banda del alternador',
   'Mueve el alternador, el aire acondicionado y otros accesorios.', 160, null, null),
  ('tire_rotation', 'Rotación de llantas', 'Rotación de llantas',
   'Cambiar las llantas de posición para que se desgasten parejo.', 170, 10000, 6),
  ('wheel_alignment', 'Alineación y balanceo', 'Alineación y balanceo',
   'Ajusta los ángulos de las ruedas y equilibra las llantas.', 180, 20000, 12),
  ('tires', 'Llantas', 'Llantas',
   'Cambio de llantas por desgaste o edad.', 190, null, null),
  ('battery', 'Batería', 'Batería',
   'Arranca el vehículo y alimenta la parte eléctrica.', 200, null, 36),
  ('wiper_blades', 'Plumillas limpiaparabrisas', 'Plumillas',
   'Limpian el parabrisas. El sol y el uso las endurecen.', 210, null, 12),
  ('ac_service', 'Servicio de aire acondicionado', 'Aire acondicionado',
   'Revisión de gas, fugas y funcionamiento del aire acondicionado.', 220, null, null),
  ('suspension_inspection', 'Revisión de suspensión y dirección', 'Revisión de suspensión',
   'Revisión de amortiguadores, rótulas y terminales.', 230, 20000, 12),
  ('general_inspection', 'Revisión general', 'Revisión general',
   'Revisión de niveles, luces, fugas y estado general.', 240, 10000, 12);

create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  -- Lookup key: normalized brand, model, year, engine (empty when unknown), and market.
  brand_key text not null,
  model_key text not null,
  year smallint not null,
  engine_key text not null default '',
  -- Market whose manual applies: 'US' or 'LATAM' (El Salvador).
  market text not null default 'US',
  status public.schedule_status not null default 'pending',
  body_type public.body_type,
  has_severe boolean not null default false,
  sources jsonb not null default '[]'::jsonb,
  summary text,
  error text,
  looked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_schedules_key unique (brand_key, model_key, year, engine_key, market),
  constraint maintenance_schedules_market check (market in ('US', 'LATAM')),
  constraint maintenance_schedules_sources_array check (jsonb_typeof(sources) = 'array')
);

create trigger maintenance_schedules_set_updated_at
  before update on public.maintenance_schedules
  for each row execute function public.set_updated_at();

create table public.maintenance_schedule_items (
  schedule_id uuid not null references public.maintenance_schedules (id) on delete cascade,
  task_code text not null references public.maintenance_tasks (code),
  distance_km integer,
  months smallint,
  severe_distance_km integer,
  severe_months smallint,
  note text,
  source_url text,
  primary key (schedule_id, task_code),
  constraint maintenance_schedule_items_has_interval check (
    distance_km is not null or months is not null
  ),
  constraint maintenance_schedule_items_positive check (
    (distance_km is null or distance_km > 0)
    and (months is null or months > 0)
    and (severe_distance_km is null or severe_distance_km > 0)
    and (severe_months is null or severe_months > 0)
  )
);

-- ---------------------------------------------------------------------------
-- Model renders
-- ---------------------------------------------------------------------------

create table public.model_renders (
  id uuid primary key default gen_random_uuid(),
  render_key text not null unique,
  brand text not null,
  model text not null,
  year smallint not null,
  color text not null,
  body_type public.body_type,
  status public.render_status not null default 'pending',
  poster_path text,
  glb_path text,
  fal_request_id text,
  error text,
  attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger model_renders_set_updated_at
  before update on public.model_renders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Vehicles and Services: new columns
-- ---------------------------------------------------------------------------

alter table public.vehicles
  add column engine text,
  add column trim_level text,
  add column color text,
  add column body_type public.body_type,
  add column schedule_id uuid references public.maintenance_schedules (id) on delete set null,
  add column render_id uuid references public.model_renders (id) on delete set null,
  add constraint vehicles_engine_length check (char_length(engine) <= 60),
  add constraint vehicles_trim_level_length check (char_length(trim_level) <= 60),
  add constraint vehicles_color_length check (char_length(color) <= 30);

-- Schedule and render links are written by Edge Functions only.
revoke update on table public.vehicles from authenticated;
grant update (brand, model, year, plate, odometer_measure, deleted_at, engine, trim_level, color)
  on table public.vehicles to authenticated;

alter table public.services
  add column total_cost numeric(10, 2),
  add column invoice_path text,
  add constraint services_total_cost_non_negative check (total_cost is null or total_cost >= 0);

-- ---------------------------------------------------------------------------
-- Service items
-- ---------------------------------------------------------------------------

create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  task_code text references public.maintenance_tasks (code),
  name text not null,
  cost numeric(10, 2),
  part_brand text,
  part_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_items_name_not_empty check (char_length(trim(both from name)) > 0),
  constraint service_items_cost_non_negative check (cost is null or cost >= 0)
);

create index service_items_service_id_idx on public.service_items (service_id);
create index service_items_task_code_idx on public.service_items (task_code);

create trigger service_items_set_updated_at
  before update on public.service_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Appointments, Routines, Reminders, Reminder states
-- ---------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  scheduled_on date not null,
  shop text,
  notes text,
  task_codes text[] not null default '{}',
  service_id uuid references public.services (id) on delete set null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_vehicle_id_idx on public.appointments (vehicle_id, scheduled_on);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  name text not null,
  -- Round trip, in the Vehicle's Odometer measure.
  round_trip_distance numeric(8, 1) not null,
  days_per_week smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_name_not_empty check (char_length(trim(both from name)) > 0),
  constraint routines_distance_positive check (round_trip_distance > 0 and round_trip_distance <= 2000),
  constraint routines_days_range check (days_per_week between 1 and 7)
);

create index routines_vehicle_id_idx on public.routines (vehicle_id);

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

-- Hand-written Reminders only. Derived Reminders are computed (ADR-0010).
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  title text not null,
  notes text,
  due_on date not null,
  done_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_title_not_empty check (char_length(trim(both from title)) > 0)
);

create index reminders_vehicle_id_idx on public.reminders (vehicle_id, due_on);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- Per derived Reminder state: the user does not know the last Service, or
-- remembers roughly when it was (a date and, if known, the odometer) without
-- a Service for it, or snoozed it until a date.
create table public.reminder_states (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  task_code text not null references public.maintenance_tasks (code),
  last_unknown boolean not null default false,
  remembered_on date,
  remembered_reading integer,
  snoozed_until date,
  updated_at timestamptz not null default now(),
  primary key (vehicle_id, task_code),
  constraint reminder_states_remembered_reading_non_negative check (
    remembered_reading is null or remembered_reading >= 0
  )
);

create trigger reminder_states_set_updated_at
  before update on public.reminder_states
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Estimates and chat
-- ---------------------------------------------------------------------------

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  brand text not null,
  model text not null,
  year smallint not null,
  task_code text references public.maintenance_tasks (code),
  query text not null,
  country public.country_code not null,
  city text not null default '',
  result jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index estimate_requests_user_idx on public.estimate_requests (user_id, created_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_user_idx on public.chat_messages (user_id, created_at);

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

-- Atomically spend one AI lookup. Returns false when the daily limit is hit.
create or replace function public.spend_ai_lookup(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  spent integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set count = public.ai_usage.count + 1
  where public.ai_usage.count < p_limit
  returning count into spent;
  return spent is not null;
end;
$$;

revoke execute on function public.spend_ai_lookup(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Push subscriptions
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.maintenance_schedule_items enable row level security;
alter table public.model_renders enable row level security;
alter table public.service_items enable row level security;
alter table public.appointments enable row level security;
alter table public.routines enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_states enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_requests enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on table
  public.profiles,
  public.maintenance_tasks,
  public.maintenance_schedules,
  public.maintenance_schedule_items,
  public.model_renders,
  public.service_items,
  public.appointments,
  public.routines,
  public.reminders,
  public.reminder_states,
  public.estimates,
  public.estimate_requests,
  public.chat_messages,
  public.ai_usage,
  public.push_subscriptions
from anon, authenticated;

grant usage on type
  public.knowledge_level,
  public.country_code,
  public.body_type,
  public.schedule_status,
  public.render_status,
  public.chat_role
to authenticated;

-- Profiles: the owner reads and edits their own row. Rows are created by
-- the signup trigger and removed with the account.
grant select on table public.profiles to authenticated;
grant update (display_name, country, city, knowledge_level, onboarded_at, notifications_enabled)
  on table public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Shared reference data: readable by every signed-in user, written by
-- migrations and Edge Functions (service role) only.
grant select on table
  public.maintenance_tasks,
  public.maintenance_schedules,
  public.maintenance_schedule_items,
  public.model_renders
to authenticated;

create policy maintenance_tasks_select on public.maintenance_tasks
  for select to authenticated using (true);
create policy maintenance_schedules_select on public.maintenance_schedules
  for select to authenticated using (true);
create policy maintenance_schedule_items_select on public.maintenance_schedule_items
  for select to authenticated using (true);
create policy model_renders_select on public.model_renders
  for select to authenticated using (true);

-- Per-Vehicle rows: the Vehicle's owner has access.
create or replace function public.owns_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_vehicle(uuid) from public, anon;
grant execute on function public.owns_vehicle(uuid) to authenticated;

grant select, insert, update, delete on table public.service_items to authenticated;

create policy service_items_select_own on public.service_items
  for select to authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_items.service_id and public.owns_vehicle(s.vehicle_id)
  ));
create policy service_items_insert_own on public.service_items
  for insert to authenticated
  with check (exists (
    select 1 from public.services s
    where s.id = service_items.service_id and public.owns_vehicle(s.vehicle_id)
  ));
create policy service_items_update_own on public.service_items
  for update to authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_items.service_id and public.owns_vehicle(s.vehicle_id)
  ))
  with check (exists (
    select 1 from public.services s
    where s.id = service_items.service_id and public.owns_vehicle(s.vehicle_id)
  ));
create policy service_items_delete_own on public.service_items
  for delete to authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_items.service_id and public.owns_vehicle(s.vehicle_id)
  ));

grant select, insert, update on table public.appointments to authenticated;
create policy appointments_select_own on public.appointments
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy appointments_insert_own on public.appointments
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy appointments_update_own on public.appointments
  for update to authenticated
  using (public.owns_vehicle(vehicle_id))
  with check (public.owns_vehicle(vehicle_id));

grant select, insert, update, delete on table public.routines to authenticated;
create policy routines_select_own on public.routines
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy routines_insert_own on public.routines
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy routines_update_own on public.routines
  for update to authenticated
  using (public.owns_vehicle(vehicle_id))
  with check (public.owns_vehicle(vehicle_id));
create policy routines_delete_own on public.routines
  for delete to authenticated using (public.owns_vehicle(vehicle_id));

grant select, insert, update on table public.reminders to authenticated;
create policy reminders_select_own on public.reminders
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy reminders_insert_own on public.reminders
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy reminders_update_own on public.reminders
  for update to authenticated
  using (public.owns_vehicle(vehicle_id))
  with check (public.owns_vehicle(vehicle_id));

grant select, insert, update, delete on table public.reminder_states to authenticated;
create policy reminder_states_select_own on public.reminder_states
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy reminder_states_insert_own on public.reminder_states
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy reminder_states_update_own on public.reminder_states
  for update to authenticated
  using (public.owns_vehicle(vehicle_id))
  with check (public.owns_vehicle(vehicle_id));
create policy reminder_states_delete_own on public.reminder_states
  for delete to authenticated using (public.owns_vehicle(vehicle_id));

-- Estimates: a user reads the cached Estimates they requested. Writes come
-- from the estimates Edge Function.
grant select on table public.estimates, public.estimate_requests to authenticated;
create policy estimate_requests_select_own on public.estimate_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy estimates_select_requested on public.estimates
  for select to authenticated
  using (exists (
    select 1 from public.estimate_requests r
    where r.estimate_id = estimates.id and r.user_id = (select auth.uid())
  ));

grant select on table public.chat_messages to authenticated;
create policy chat_messages_select_own on public.chat_messages
  for select to authenticated using (user_id = (select auth.uid()));

grant select on table public.ai_usage to authenticated;
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on table public.push_subscriptions to authenticated;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-renders', 'vehicle-renders', true, 52428800,
   array['image/png', 'image/jpeg', 'image/webp', 'model/gltf-binary', 'application/octet-stream']),
  ('service-invoices', 'service-invoices', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

-- Invoices live under "<user_id>/<service_id>/<file>".
create policy service_invoices_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'service-invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy service_invoices_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy service_invoices_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'service-invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
