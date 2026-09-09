-- Create: supabase test new mileage_readings_rls.test
-- Run:    supabase test db
begin;
select plan(11);

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
);

set local role anon;
select throws_ok(
  $$select * from mileage_readings$$,
  '42501',
  null,
  'anon cannot read Mileage readings'
);
select throws_ok(
  $$insert into mileage_readings (vehicle_id, reading, recorded_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      80000,
      '2026-08-30'
    )$$,
  '42501',
  null,
  'anon cannot create a Mileage reading'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into mileage_readings (vehicle_id, reading, recorded_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      80000,
      '2026-08-30'
    )
    returning reading$$,
  array[80000],
  'the owner records Mileage on their Vehicle'
);
select results_eq(
  $$select reading from mileage_readings
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array[80000],
  'the owner reads their Mileage readings'
);
select results_eq(
  $$update mileage_readings
    set reading = 8000
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    returning reading$$,
  array[8000],
  'the owner corrects a Mileage reading'
);
select throws_ok(
  $$delete from mileage_readings
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'the owner cannot hard-delete a Mileage reading'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$insert into mileage_readings (vehicle_id, reading, recorded_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      90000,
      '2026-08-30'
    )$$,
  '42501',
  null,
  'another user cannot record Mileage on the owner Vehicle'
);
select is_empty(
  $$select * from mileage_readings$$,
  'another user reads no Mileage readings'
);
select is_empty(
  $$update mileage_readings set reading = 1 returning reading$$,
  'another user updates no Mileage readings'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select reading from mileage_readings
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array[8000],
  'the denied update left the owner reading intact'
);

select ok(
  (select count(*)::int from vehicles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 1
  and not exists (
    select 1
    from mileage_readings
    where vehicle_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and reading = 90000
  ),
  'a Vehicle may exist with only the owner readings'
);

select * from finish();
rollback;
