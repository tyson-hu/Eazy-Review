-- Packet 6: auth.users insert → one profile; helpers not client-callable.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(6);

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

select lives_ok(
  $$select pg_temp.make_auth_user(
      '11111111-1111-1111-1111-111111111111'::uuid,
      'packet6-profile@example.com'
    )$$,
  'auth.users insert succeeds'
);

select is(
  (
    select count(*)::int
    from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'::uuid
  ),
  1,
  'auth.users insert creates exactly one matching profile'
);

select is(
  (
    select count(*)::int
    from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'::uuid
      and display_name is null
      and username is null
      and avatar_url is null
  ),
  1,
  'handle_new_user inserts profiles(id) only'
);

-- Client roles cannot EXECUTE trigger-only / helper entrypoints.
select ok(
  not has_function_privilege(
    'anon',
    'public.handle_new_user()',
    'EXECUTE'
  ),
  'anon cannot EXECUTE handle_new_user'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.handle_new_user()',
    'EXECUTE'
  ),
  'authenticated cannot EXECUTE handle_new_user'
);
select ok(
  not has_function_privilege(
    'public',
    'public.handle_new_user()',
    'EXECUTE'
  ),
  'PUBLIC cannot EXECUTE handle_new_user'
);

select * from finish();
rollback;
