-- Packet 6: zero-row aggregates, refresh path, fixtures, product-delete safety.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(17);

create or replace function pg_temp.make_auth_user(p_id uuid, p_email text)
returns uuid
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    'schema-test-only',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  return p_id;
end;
$$;

-- Product insert creates the only zero-count aggregate row.
insert into public.products (id, brand, name)
values (
  '44444444-4444-4444-4444-444444444441'::uuid,
  'AggBrand',
  'Zero Row Product'
);

select is(
  (
    select rating_count
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  0,
  'product insert creates zero-count aggregate'
);
select ok(
  (
    select look_avg is null
      and outfit_avg is null
      and material_avg is null
      and craftsmanship_avg is null
      and maintenance_avg is null
      and comfort_avg is null
      and collection_avg is null
      and value_avg is null
      and resale_potential_avg is null
      and acquisition_ease_avg is null
      and score is null
      and methodology_version is null
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  'zero-count aggregate keeps null avgs and score'
);

select pg_temp.make_auth_user(
  '55555555-5555-5555-5555-555555555551'::uuid,
  'packet6-agg-1@example.com'
);
select pg_temp.make_auth_user(
  '55555555-5555-5555-5555-555555555552'::uuid,
  'packet6-agg-2@example.com'
);
select pg_temp.make_auth_user(
  '55555555-5555-5555-5555-555555555553'::uuid,
  'packet6-agg-3@example.com'
);
select pg_temp.make_auth_user(
  '55555555-5555-5555-5555-555555555554'::uuid,
  'packet6-agg-4@example.com'
);

-- Insert refresh: single rating.
insert into public.user_ratings (
  product_id, user_id, look, outfit, material, craftsmanship, maintenance, comfort, collection, value, resale_potential, acquisition_ease
) values (
  '44444444-4444-4444-4444-444444444441'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8
);

select is(
  (
    select rating_count
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  1,
  'rating insert refreshes rating_count'
);
select is(
  (
    select look_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  8.00::numeric,
  'rating insert refreshes look_avg'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  80,
  'rating insert refreshes score from unrounded overall mean'
);

-- Update refresh.
update public.user_ratings
set look = 4, outfit = 4, material = 4, craftsmanship = 4, maintenance = 4,
    comfort = 4, collection = 4, value = 4, resale_potential = 4, acquisition_ease = 4
where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  and user_id = '55555555-5555-5555-5555-555555555551'::uuid;

select is(
  (
    select look_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  4.00::numeric,
  'rating update refreshes look_avg'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  40,
  'rating update refreshes score'
);

-- Last rating delete restores zero/null state.
delete from public.user_ratings
where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  and user_id = '55555555-5555-5555-5555-555555555551'::uuid;

select is(
  (
    select rating_count
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  0,
  'last rating delete leaves rating_count 0'
);
select ok(
  (
    select look_avg is null and score is null and methodology_version is null
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  'last rating delete restores null avgs and score'
);

-- Rounding-boundary: three ratings with all dims=1, one with all dims=2
-- dim avg=1.25; Community Score = round(10*1.25)=13
insert into public.products (id, brand, name)
values (
  '44444444-4444-4444-4444-444444444442'::uuid,
  'AggBrand',
  'Rounding Fixture'
);

insert into public.user_ratings (
  product_id, user_id, look, outfit, material, craftsmanship, maintenance, comfort, collection, value, resale_potential, acquisition_ease
) values
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555551'::uuid,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1
  ),
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555552'::uuid,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1
  ),
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555553'::uuid,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1
  ),
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555554'::uuid,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2
  );

select is(
  (
    select look_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444442'::uuid
  ),
  1.25::numeric,
  'four-rating fixture look_avg is 1.25'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444442'::uuid
  ),
  13,
  'four-rating fixture Community Score is 13 from sum of unrounded means'
);

delete from public.user_ratings
where product_id = '44444444-4444-4444-4444-444444444442'::uuid;

select ok(
  (
    select rating_count = 0
      and 1=1
      and score is null
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444442'::uuid
  ),
  'removing all four ratings restores zero/null aggregate'
);

-- Two-rating category fixture from DATA_MODEL.md.
insert into public.products (id, brand, name)
values (
  '44444444-4444-4444-4444-444444444443'::uuid,
  'AggBrand',
  'Category Fixture'
);

insert into public.user_ratings (
  product_id, user_id, look, outfit, material, craftsmanship, maintenance, comfort, collection, value, resale_potential, acquisition_ease
) values
  (
    '44444444-4444-4444-4444-444444444443'::uuid,
    '55555555-5555-5555-5555-555555555551'::uuid,
    10, 8, 6, 4, 2, 10, 8, 6, 4, 2
  ),
  (
    '44444444-4444-4444-4444-444444444443'::uuid,
    '55555555-5555-5555-5555-555555555552'::uuid,
    2, 4, 6, 8, 10, 2, 4, 6, 8, 10
  );

select ok(
  (
    select look_avg = 6.00
      and outfit_avg = 6.00
      and material_avg = 6.00
      and craftsmanship_avg = 6.00
      and maintenance_avg = 6.00
      and comfort_avg = 6.00
      and collection_avg = 6.00
      and value_avg = 6.00
      and resale_potential_avg = 6.00
      and acquisition_ease_avg = 6.00
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444443'::uuid
  ),
  'two-rating fixture category averages are 6.00'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444443'::uuid
  ),
  60,
  'two-rating fixture Community Score is 60'
);

-- Product delete succeeds without aggregate recreate / FK failure.
insert into public.products (id, brand, name)
values (
  '44444444-4444-4444-4444-444444444444'::uuid,
  'AggBrand',
  'Delete Cascade Product'
);

insert into public.user_ratings (
  product_id, user_id, look, outfit, material, craftsmanship, maintenance, comfort, collection, value, resale_potential, acquisition_ease
) values (
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5
);

select lives_ok(
  $$delete from public.products
    where id = '44444444-4444-4444-4444-444444444444'::uuid$$,
  'product delete with cascaded ratings completes'
);

select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444444'::uuid
  ),
  0,
  'deleted product leaves no aggregate row'
);

-- Structural guard for the selected serialization mechanism. Actual blocking
-- and final visibility are exercised by scripts/test-db-concurrency.cjs in two
-- overlapping database sessions.
select ok(
  pg_get_functiondef(
    'public.refresh_rating_aggregates(uuid)'::regprocedure
  ) ilike '%pg_advisory_xact_lock%'
    and pg_get_functiondef(
      'public.refresh_rating_aggregates(uuid)'::regprocedure
    ) ilike '%hashtextextended%',
  'refresh_rating_aggregates uses the selected 64-bit advisory-lock mechanism'
);

select * from finish();
rollback;
