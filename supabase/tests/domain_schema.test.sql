-- Public contract for SEI-6. Run: supabase test db
begin;
select plan(12);

select has_table('public', 'vehicles', 'vehicles exists');
select has_table('public', 'mileage_readings', 'mileage_readings exists');
select has_table('public', 'services', 'services exists');
select hasnt_table('public', 'mileage', 'first-cut mileage table is gone');

select has_column('public', 'vehicles', 'odometer_measure', 'Vehicle has odometer measure');
select has_column('public', 'vehicles', 'deleted_at', 'Vehicle can be withdrawn');
select has_column('public', 'services', 'mileage_reading_id', 'Service points at a Mileage reading');
select has_column('public', 'services', 'performed_on', 'Service date is a calendar day');
select has_column('public', 'mileage_readings', 'recorded_on', 'Mileage date is a calendar day');
select hasnt_column('public', 'mileage_readings', 'deleted_at', 'Mileage is corrected, not withdrawn');

select ok(
  not has_table_privilege('authenticated', 'public.vehicles', 'delete')
  and not has_table_privilege('authenticated', 'public.mileage_readings', 'delete')
  and not has_table_privilege('authenticated', 'public.services', 'delete'),
  'authenticated has no DELETE grant'
);

select ok(
  not has_table_privilege('anon', 'public.vehicles', 'select')
  and not has_table_privilege('anon', 'public.mileage_readings', 'select')
  and not has_table_privilege('anon', 'public.services', 'select'),
  'anon has no SELECT grant'
);

select * from finish();
rollback;
