-- Create: supabase test new services_rls.test
-- Run:    supabase test db
begin;
select plan(12);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

insert into vehicles (id, user_id, brand, model, year)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Toyota',
  'Corolla',
  2018
), (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'Honda',
  'Civic',
  2019
);

insert into mileage_readings (id, vehicle_id, reading, recorded_on)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  75000,
  '2026-04-01'
), (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  10000,
  '2026-04-01'
);

set local role anon;
select throws_ok(
  $$select * from services$$,
  '42501',
  null,
  'anon cannot read Services'
);
select throws_ok(
  $$insert into services (
      vehicle_id,
      mileage_reading_id,
      type,
      performed_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'maintenance',
      '2026-04-01'
    )$$,
  '42501',
  null,
  'anon cannot create a Service'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into services (
      vehicle_id,
      mileage_reading_id,
      type,
      shop,
      performed_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'maintenance',
      'Taller Norte',
      '2026-04-01'
    )
    returning type::text$$,
  array['maintenance'],
  'the owner records a Service on their Vehicle'
);
select results_eq(
  $$select shop from services
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['Taller Norte'],
  'the owner reads their Services'
);
select results_eq(
  $$update services
    set deleted_at = now()
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    returning shop$$,
  array['Taller Norte'],
  'the owner withdraws a Service without destroying its reading'
);
select results_eq(
  $$select reading from mileage_readings
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[75000],
  'withdrawing a Service leaves the Mileage reading'
);
select throws_ok(
  $$delete from services
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'the owner cannot hard-delete a Service'
);

select throws_ok(
  $$insert into services (
      vehicle_id,
      mileage_reading_id,
      type,
      performed_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'repair',
      '2026-04-01'
    )$$,
  '23503',
  null,
  'a Service cannot point at another Vehicle Mileage reading'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$insert into services (
      vehicle_id,
      mileage_reading_id,
      type,
      performed_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'repair',
      '2026-04-01'
    )$$,
  '42501',
  null,
  'another user cannot record a Service on the owner Vehicle'
);
select is_empty(
  $$select * from services$$,
  'another user reads no Services'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select shop from services
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['Taller Norte'],
  'the denied writes left the owner Service intact'
);

select results_eq(
  $$select count(*)::int from mileage_readings
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[1],
  'the Service still points at exactly one Mileage reading'
);

select * from finish();
rollback;
