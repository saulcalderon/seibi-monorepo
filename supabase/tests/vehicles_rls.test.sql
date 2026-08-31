-- Create: supabase test new vehicles_rls.test
-- Run:    supabase test db
begin;
select plan(16);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

set local role anon;
select throws_ok(
  $$select * from vehicles$$,
  '42501',
  null,
  'anon cannot read Vehicles'
);
select throws_ok(
  $$insert into vehicles (user_id, brand, model, year)
    values (
      '11111111-1111-1111-1111-111111111111',
      'Toyota',
      'Corolla',
      2018
    )$$,
  '42501',
  null,
  'anon cannot create a Vehicle'
);
select throws_ok(
  $$update vehicles set brand = 'Honda'$$,
  '42501',
  null,
  'anon cannot update Vehicles'
);
select throws_ok(
  $$delete from vehicles$$,
  '42501',
  null,
  'anon cannot delete Vehicles'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into vehicles (user_id, brand, model, year, plate)
    values (
      '11111111-1111-1111-1111-111111111111',
      'Toyota',
      'Corolla',
      2018,
      'ABC-12-34'
    )
    returning brand$$,
  array['Toyota'],
  'the owner creates their own Vehicle'
);
select results_eq(
  $$select brand from vehicles
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array['Toyota'],
  'the owner reads their own Vehicle'
);
select results_eq(
  $$update vehicles
    set brand = 'Honda'
    where user_id = '11111111-1111-1111-1111-111111111111'
    returning brand$$,
  array['Honda'],
  'the owner updates their own Vehicle'
);
select results_eq(
  $$update vehicles
    set deleted_at = now()
    where user_id = '11111111-1111-1111-1111-111111111111'
    returning brand$$,
  array['Honda'],
  'the owner withdraws a Vehicle without destroying it'
);
select results_eq(
  $$select brand from vehicles
    where user_id = '11111111-1111-1111-1111-111111111111'
      and deleted_at is not null$$,
  array['Honda'],
  'a withdrawn Vehicle is still readable by the owner'
);
select results_eq(
  $$update vehicles
    set deleted_at = null
    where user_id = '11111111-1111-1111-1111-111111111111'
    returning brand$$,
  array['Honda'],
  'the owner restores a withdrawn Vehicle'
);

select throws_ok(
  $$delete from vehicles
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'the owner cannot hard-delete a Vehicle'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$insert into vehicles (user_id, brand, model, year)
    values (
      '11111111-1111-1111-1111-111111111111',
      'Ford',
      'Focus',
      2016
    )$$,
  '42501',
  null,
  'another user cannot create a Vehicle for the owner'
);
select is_empty(
  $$select * from vehicles$$,
  'another user reads no Vehicles'
);
select is_empty(
  $$update vehicles set brand = 'Stolen' returning brand$$,
  'another user updates no Vehicles'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select brand from vehicles
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array['Honda'],
  'the denied update left the owner Vehicle intact'
);

select throws_ok(
  $$update vehicles
    set user_id = '22222222-2222-2222-2222-222222222222'
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'the owner cannot reassign Vehicle ownership'
);

select * from finish();
rollback;
