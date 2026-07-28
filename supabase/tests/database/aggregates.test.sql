-- Packet 6: zero-row aggregates, refresh path, fixtures, product-delete safety.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(18);

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
      and comfort_avg is null
      and quality_avg is null
      and outfit_avg is null
      and value_avg is null
      and overall_avg is null
      and score is null
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
  product_id, user_id, look, comfort, quality, outfit, value, overall
) values (
  '44444444-4444-4444-4444-444444444441'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  8, 8, 8, 8, 8, 8
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
    select overall_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  8.00::numeric,
  'rating insert refreshes overall_avg'
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
set overall = 4
where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  and user_id = '55555555-5555-5555-5555-555555555551'::uuid;

select is(
  (
    select overall_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  4.00::numeric,
  'rating update refreshes overall_avg'
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
    select overall_avg is null and score is null
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444441'::uuid
  ),
  'last rating delete restores null overall_avg and score'
);

-- Rounding-boundary fixture: overalls 1,1,1,2 → overall_avg 1.25, score 13.
insert into public.products (id, brand, name)
values (
  '44444444-4444-4444-4444-444444444442'::uuid,
  'AggBrand',
  'Rounding Fixture'
);

insert into public.user_ratings (
  product_id, user_id, look, comfort, quality, outfit, value, overall
) values
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555551'::uuid,
    1, 1, 1, 1, 1, 1
  ),
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555552'::uuid,
    1, 1, 1, 1, 1, 1
  ),
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555553'::uuid,
    1, 1, 1, 1, 1, 1
  ),
  (
    '44444444-4444-4444-4444-444444444442'::uuid,
    '55555555-5555-5555-5555-555555555554'::uuid,
    1, 1, 1, 1, 1, 2
  );

select is(
  (
    select overall_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444442'::uuid
  ),
  1.25::numeric,
  'four-rating fixture overall_avg is 1.25'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444442'::uuid
  ),
  13,
  'four-rating fixture score is 13 from unrounded mean'
);

delete from public.user_ratings
where product_id = '44444444-4444-4444-4444-444444444442'::uuid;

select ok(
  (
    select rating_count = 0
      and overall_avg is null
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
  product_id, user_id, look, comfort, quality, outfit, value, overall
) values
  (
    '44444444-4444-4444-4444-444444444443'::uuid,
    '55555555-5555-5555-5555-555555555551'::uuid,
    10, 8, 6, 4, 2, 1
  ),
  (
    '44444444-4444-4444-4444-444444444443'::uuid,
    '55555555-5555-5555-5555-555555555552'::uuid,
    2, 4, 6, 8, 10, 10
  );

select ok(
  (
    select look_avg = 6.00
      and comfort_avg = 6.00
      and quality_avg = 6.00
      and outfit_avg = 6.00
      and value_avg = 6.00
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444443'::uuid
  ),
  'two-rating fixture category averages are 6.00'
);
select is(
  (
    select overall_avg
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444443'::uuid
  ),
  5.50::numeric,
  'two-rating fixture overall_avg is 5.50'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = '44444444-4444-4444-4444-444444444443'::uuid
  ),
  55,
  'two-rating fixture score is 55'
);

-- Product delete succeeds without aggregate recreate / FK failure.
insert into public.products (id, brand, name)
values (
  '44444444-4444-4444-4444-444444444444'::uuid,
  'AggBrand',
  'Delete Cascade Product'
);

insert into public.user_ratings (
  product_id, user_id, look, comfort, quality, outfit, value, overall
) values (
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  5, 5, 5, 5, 5, 5
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
  ) ilike '%pg_advisory_xact_lock%',
  'refresh_rating_aggregates retains the selected advisory-lock mechanism'
);

select * from finish();
rollback;
