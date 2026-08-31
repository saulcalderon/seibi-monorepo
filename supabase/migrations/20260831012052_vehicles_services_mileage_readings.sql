-- SEI-6: Vehicle, Service, and Mileage history.
-- One migration: create the final schema. Do not replay a first-cut and alter it.

create type public.odometer_measure as enum ('km', 'mi');
create type public.service_type as enum ('maintenance', 'repair');

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand text not null,
  model text not null,
  year smallint not null,
  plate text,
  odometer_measure public.odometer_measure not null default 'km',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_brand_not_empty check (char_length(trim(both from brand)) > 0),
  constraint vehicles_model_not_empty check (char_length(trim(both from model)) > 0),
  constraint vehicles_year_range check (year >= 1900 and year <= 2100)
);

create index vehicles_user_id_idx on public.vehicles (user_id);

create table public.mileage_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  reading integer not null,
  recorded_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mileage_readings_reading_non_negative check (reading >= 0),
  constraint mileage_readings_id_vehicle_key unique (id, vehicle_id)
);

create index mileage_readings_vehicle_recorded_on_idx
  on public.mileage_readings (vehicle_id, recorded_on desc);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  mileage_reading_id uuid not null,
  type public.service_type not null,
  shop text,
  notes text,
  performed_on date not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_mileage_reading_id_key unique (mileage_reading_id),
  constraint services_reading_same_vehicle_fk
    foreign key (mileage_reading_id, vehicle_id)
    references public.mileage_readings (id, vehicle_id)
    on delete restrict
);

create index services_vehicle_id_idx on public.services (vehicle_id);
create index services_reading_vehicle_idx
  on public.services (mileage_reading_id, vehicle_id);

alter table public.vehicles enable row level security;
alter table public.mileage_readings enable row level security;
alter table public.services enable row level security;

revoke all on table public.vehicles from anon, authenticated;
revoke all on table public.mileage_readings from anon, authenticated;
revoke all on table public.services from anon, authenticated;

grant select, insert, update on table public.vehicles to authenticated;
grant select, insert, update on table public.mileage_readings to authenticated;
grant select, insert, update on table public.services to authenticated;

grant usage on type public.odometer_measure to authenticated;
grant usage on type public.service_type to authenticated;

create policy vehicles_select_own
  on public.vehicles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy vehicles_insert_own
  on public.vehicles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy vehicles_update_own
  on public.vehicles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy mileage_readings_select_own
  on public.mileage_readings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = mileage_readings.vehicle_id
        and v.user_id = (select auth.uid())
    )
  );

create policy mileage_readings_insert_own
  on public.mileage_readings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = mileage_readings.vehicle_id
        and v.user_id = (select auth.uid())
    )
  );

create policy mileage_readings_update_own
  on public.mileage_readings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = mileage_readings.vehicle_id
        and v.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = mileage_readings.vehicle_id
        and v.user_id = (select auth.uid())
    )
  );

create policy services_select_own
  on public.services
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = services.vehicle_id
        and v.user_id = (select auth.uid())
    )
  );

create policy services_insert_own
  on public.services
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = services.vehicle_id
        and v.user_id = (select auth.uid())
    )
  );

create policy services_update_own
  on public.services
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = services.vehicle_id
        and v.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = services.vehicle_id
        and v.user_id = (select auth.uid())
    )
  );
