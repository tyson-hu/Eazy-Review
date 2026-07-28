-- Packet 6: user_ratings constraints, identity immutability, timestamps.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(9);

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

select pg_temp.make_auth_user(
  '22222222-2222-2222-2222-222222222221'::uuid,
  'packet6-rater-a@example.com'
);
select pg_temp.make_auth_user(
  '22222222-2222-2222-2222-222222222222'::uuid,
  'packet6-rater-b@example.com'
);

insert into public.products (id, brand, name)
values (
  '33333333-3333-3333-3333-333333333331'::uuid,
  'TestBrand',
  'Rating Fixture'
);

-- Valid insert.
select lives_ok(
  $$insert into public.user_ratings (
      product_id, user_id, look, comfort, quality, outfit, value, overall,
      private_note
    ) values (
      '33333333-3333-3333-3333-333333333331'::uuid,
      '22222222-2222-2222-2222-222222222221'::uuid,
      8, 7, 6, 5, 4, 9, 'ok note'
    )$$,
  'valid rating insert succeeds'
);

-- Out-of-range score fails.
select throws_ok(
  $$insert into public.user_ratings (
      product_id, user_id, look, comfort, quality, outfit, value, overall
    ) values (
      '33333333-3333-3333-3333-333333333331'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      0, 7, 6, 5, 4, 9
    )$$,
  '23514',
  null,
  'look out of range is rejected'
);

-- Duplicate user/product fails.
select throws_ok(
  $$insert into public.user_ratings (
      product_id, user_id, look, comfort, quality, outfit, value, overall
    ) values (
      '33333333-3333-3333-3333-333333333331'::uuid,
      '22222222-2222-2222-2222-222222222221'::uuid,
      1, 1, 1, 1, 1, 1
    )$$,
  '23505',
  null,
  'duplicate user/product rating is rejected'
);

-- private_note over 500 characters fails.
select throws_ok(
  format(
    $$insert into public.user_ratings (
        product_id, user_id, look, comfort, quality, outfit, value, overall,
        private_note
      ) values (
        '33333333-3333-3333-3333-333333333331'::uuid,
        '22222222-2222-2222-2222-222222222222'::uuid,
        5, 5, 5, 5, 5, 5, %L
      )$$,
    repeat('x', 501)
  ),
  '23514',
  null,
  'private_note longer than 500 characters is rejected'
);

-- Identity immutable.
select throws_ok(
  $$update public.user_ratings
      set user_id = '22222222-2222-2222-2222-222222222222'::uuid
    where product_id = '33333333-3333-3333-3333-333333333331'::uuid
      and user_id = '22222222-2222-2222-2222-222222222221'::uuid$$,
  'P0001',
  'user_ratings.product_id and user_ratings.user_id are immutable',
  'user_id change is rejected'
);

select throws_ok(
  $$update public.user_ratings
      set product_id = '33333333-3333-3333-3333-333333333399'::uuid
    where product_id = '33333333-3333-3333-3333-333333333331'::uuid
      and user_id = '22222222-2222-2222-2222-222222222221'::uuid$$,
  'P0001',
  'user_ratings.product_id and user_ratings.user_id are immutable',
  'product_id change is rejected'
);

-- Timestamps: defaults present; updated_at is server-maintained on UPDATE.
select ok(
  (
    select created_at is not null and updated_at is not null
    from public.user_ratings
    where product_id = '33333333-3333-3333-3333-333333333331'::uuid
      and user_id = '22222222-2222-2222-2222-222222222221'::uuid
  ),
  'rating insert stamps created_at and updated_at'
);

update public.user_ratings
set
  look = 3,
  updated_at = '2000-01-01T00:00:00Z'::timestamptz
where product_id = '33333333-3333-3333-3333-333333333331'::uuid
  and user_id = '22222222-2222-2222-2222-222222222221'::uuid;

select ok(
  (
    select updated_at > '2020-01-01T00:00:00Z'::timestamptz
    from public.user_ratings
    where product_id = '33333333-3333-3333-3333-333333333331'::uuid
      and user_id = '22222222-2222-2222-2222-222222222221'::uuid
  ),
  'updated_at trigger overwrites client-supplied stale timestamp'
);

select is(
  (
    select look
    from public.user_ratings
    where product_id = '33333333-3333-3333-3333-333333333331'::uuid
      and user_id = '22222222-2222-2222-2222-222222222221'::uuid
  ),
  3,
  'score update still applies when updated_at is server-maintained'
);

select * from finish();
rollback;
