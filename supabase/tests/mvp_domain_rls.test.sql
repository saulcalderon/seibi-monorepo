-- SEI-34 MVP domain: RLS, grants, and account deletion. Run: supabase test db
begin;
select plan(45);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com', '{"full_name": "Ana López"}'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com', '{}');

-- Fixtures (as postgres).
insert into vehicles (id, user_id, brand, model, year)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Toyota', 'Corolla', 2018);
insert into mileage_readings (id, vehicle_id, reading, recorded_on)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        40000, '2026-01-10');
insert into services (id, vehicle_id, mileage_reading_id, type, performed_on)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001', 'maintenance', '2026-01-10');
insert into maintenance_schedules (id, brand_key, model_key, year, status)
values ('dddddddd-0000-0000-0000-000000000001', 'toyota', 'corolla', 2018, 'ready');
insert into estimates (id, cache_key, brand, model, year, task_code, query, country, result)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 'k1', 'Toyota', 'Corolla', 2018, 'engine_oil',
   'Cambio de aceite', 'SV', '{}'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'k2', 'Toyota', 'Corolla', 2018, 'brake_fluid',
   'Líquido de frenos', 'SV', '{}');
insert into estimate_requests (user_id, estimate_id)
values ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-0000-0000-0000-000000000001');
insert into chat_messages (user_id, role, content)
values ('11111111-1111-1111-1111-111111111111', 'user', '¿Cada cuánto cambio el aceite?');

-- Profiles --------------------------------------------------------------------
select results_eq(
  $$select display_name from profiles where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array['Ana'],
  'signup creates a profile with the first name'
);

set local role anon;
select throws_ok($$select * from profiles$$, '42501', null, 'anon cannot read profiles');
select throws_ok($$select * from maintenance_tasks$$, '42501', null, 'anon cannot read Maintenance tasks');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$update profiles set country = 'SV', city = 'San Salvador', knowledge_level = 'basic'
    returning city$$,
  array['San Salvador'],
  'the owner updates their profile'
);
select throws_ok(
  $$update profiles set user_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'the owner cannot reassign a profile'
);
select throws_ok(
  $$insert into profiles (user_id) values ('11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'profiles are not inserted by users'
);

-- Reference data --------------------------------------------------------------
select ok((select count(*) from maintenance_tasks) >= 20, 'Maintenance tasks are readable');
select ok(
  exists (select 1 from maintenance_schedules where id = 'dddddddd-0000-0000-0000-000000000001'),
  'Maintenance schedules are readable'
);
select throws_ok(
  $$insert into maintenance_schedules (brand_key, model_key, year) values ('x', 'y', 2020)$$,
  '42501', null, 'users cannot write Maintenance schedules'
);
select throws_ok(
  $$update maintenance_tasks set general_months = 1$$,
  '42501', null, 'users cannot edit Maintenance tasks'
);
select throws_ok(
  $$insert into model_renders (render_key, brand, model, year, color) values ('k', 'a', 'b', 2020, 'red')$$,
  '42501', null, 'users cannot write Model renders'
);

-- Vehicles: link columns are Edge Function only --------------------------------
select results_eq(
  $$update vehicles set engine = '1.8L', color = 'Rojo', trim_level = 'LE' returning engine$$,
  array['1.8L'],
  'the owner sets engine, color, and trim'
);
select throws_ok(
  $$update vehicles set schedule_id = 'dddddddd-0000-0000-0000-000000000001'$$,
  '42501', null, 'the owner cannot link a schedule directly'
);
select throws_ok(
  $$update vehicles set body_type = 'suv'$$,
  '42501', null, 'the owner cannot set the inferred body type'
);

-- Service items ---------------------------------------------------------------
select results_eq(
  $$insert into service_items (service_id, task_code, name, cost)
    values ('cccccccc-0000-0000-0000-000000000001', 'engine_oil', 'Aceite 5W-30', 35.50)
    returning name$$,
  array['Aceite 5W-30'],
  'the owner adds a Service item'
);
select results_eq(
  $$update service_items set cost = 40 returning cost::text$$,
  array['40.00'],
  'the owner edits a Service item'
);
select throws_ok(
  $$insert into service_items (service_id, task_code, name) values
    ('cccccccc-0000-0000-0000-000000000001', 'not_a_task', 'X')$$,
  '23503', null, 'a Service item only carries a catalog Maintenance task'
);
select throws_ok(
  $$insert into service_items (service_id, name, cost) values
    ('cccccccc-0000-0000-0000-000000000001', 'X', -1)$$,
  '23514', null, 'a Service item cost is not negative'
);

-- Appointments, Routines, Reminders, Reminder states --------------------------
select results_eq(
  $$insert into appointments (vehicle_id, scheduled_on, shop, task_codes)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-12-01', 'Taller Central', '{engine_oil}')
    returning shop$$,
  array['Taller Central'],
  'the owner plans an Appointment'
);
select results_eq(
  $$insert into routines (vehicle_id, name, round_trip_distance, days_per_week)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Trabajo', 24, 5)
    returning name$$,
  array['Trabajo'],
  'the owner adds a Routine'
);
select throws_ok(
  $$insert into routines (vehicle_id, name, round_trip_distance, days_per_week)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Mal', 24, 8)$$,
  '23514', null, 'a Routine runs at most 7 days a week'
);
select results_eq(
  $$insert into reminders (vehicle_id, title, due_on)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Pagar marchamo', '2026-11-01')
    returning title$$,
  array['Pagar marchamo'],
  'the owner writes a Reminder by hand'
);
select results_eq(
  $$insert into reminder_states (vehicle_id, task_code, last_unknown)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'coolant', true)
    returning task_code$$,
  array['coolant'],
  'the owner marks a last Service as unknown'
);

-- Estimates, chat, AI usage, push --------------------------------------------
select results_eq(
  $$select query from estimates$$,
  array['Cambio de aceite'],
  'the owner reads only Estimates they requested'
);
select throws_ok(
  $$insert into estimates (cache_key, brand, model, year, query, country, result)
    values ('k3', 'a', 'b', 2020, 'q', 'SV', '{}')$$,
  '42501', null, 'users cannot write Estimates'
);
select results_eq(
  $$select content from chat_messages$$,
  array['¿Cada cuánto cambio el aceite?'],
  'the owner reads their chat'
);
select throws_ok(
  $$insert into chat_messages (user_id, role, content)
    values ('11111111-1111-1111-1111-111111111111', 'assistant', 'fake')$$,
  '42501', null, 'users cannot write assistant messages'
);
select throws_ok(
  $$select spend_ai_lookup('11111111-1111-1111-1111-111111111111', 20)$$,
  '42501', null, 'users cannot spend AI lookups directly'
);
select results_eq(
  $$insert into push_subscriptions (user_id, endpoint, p256dh, auth)
    values ('11111111-1111-1111-1111-111111111111', 'https://push.example/1', 'k', 'a')
    returning endpoint$$,
  array['https://push.example/1'],
  'the owner registers a push subscription'
);

-- Another user sees none of it -----------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from service_items$$, 'another user reads no Service items');
select is_empty($$select * from appointments$$, 'another user reads no Appointments');
select is_empty($$select * from routines$$, 'another user reads no Routines');
select is_empty($$select * from reminders$$, 'another user reads no Reminders');
select is_empty($$select * from reminder_states$$, 'another user reads no Reminder states');
select is_empty($$select * from estimates$$, 'another user reads no Estimates they did not request');
select is_empty($$select * from chat_messages$$, 'another user reads no chat');
select is_empty($$select * from push_subscriptions$$, 'another user reads no push subscriptions');
select is_empty(
  $$select * from profiles where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'another user reads no other profile'
);
select throws_ok(
  $$insert into service_items (service_id, name)
    values ('cccccccc-0000-0000-0000-000000000001', 'Intruso')$$,
  '42501', null, 'another user cannot add a Service item'
);
select throws_ok(
  $$insert into routines (vehicle_id, name, round_trip_distance, days_per_week)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Intruso', 10, 1)$$,
  '42501', null, 'another user cannot add a Routine'
);
select is_empty(
  $$delete from routines returning id$$,
  'another user deletes no Routines'
);

-- AI budget and account deletion (service role / postgres) --------------------
reset role;
select ok(spend_ai_lookup('11111111-1111-1111-1111-111111111111', 2), 'first AI lookup is allowed');
select ok(spend_ai_lookup('11111111-1111-1111-1111-111111111111', 2), 'second AI lookup is allowed');
select ok(not spend_ai_lookup('11111111-1111-1111-1111-111111111111', 2), 'the daily AI limit stops the third');

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select ok(
  not exists (select 1 from vehicles where user_id = '11111111-1111-1111-1111-111111111111')
  and not exists (select 1 from mileage_readings where vehicle_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from services where vehicle_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'deleting an account removes its Vehicles, readings, Services, and profile'
);

select * from finish();
rollback;
