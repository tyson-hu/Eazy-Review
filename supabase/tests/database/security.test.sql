-- Packet 6: deny-by-default privileges — no table access, no policies,
-- trigger helpers not executable by client roles.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

-- 1 policy check + (3 roles × 7 tables × 4 privs) + (3 roles × 6 functions)
select plan(103);

-- No positive policies on the seven Task 11 tables.
select is(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = any (
        array[
          'profiles',
          'products',
          'product_images',
          'eazy_assessments',
          'user_ratings',
          'rating_aggregates',
          'product_offers'
        ]
      )
  ),
  0,
  'no RLS policies on Task 11 tables'
);

-- Effective table privileges: PUBLIC / anon / authenticated have none.
create temporary table core_tables (
  table_name text primary key
);

insert into core_tables (table_name) values
  ('profiles'),
  ('products'),
  ('product_images'),
  ('eazy_assessments'),
  ('user_ratings'),
  ('rating_aggregates'),
  ('product_offers');

create temporary table client_roles (
  role_name text primary key
);

insert into client_roles (role_name) values
  ('public'),
  ('anon'),
  ('authenticated');

create temporary table table_privs (
  priv text primary key
);

insert into table_privs (priv) values
  ('SELECT'),
  ('INSERT'),
  ('UPDATE'),
  ('DELETE');

select ok(
  not has_table_privilege(
    r.role_name,
    format('public.%I', t.table_name),
    p.priv
  ),
  format(
    '%s has no %s on public.%s',
    r.role_name,
    p.priv,
    t.table_name
  )
)
from client_roles r
cross join core_tables t
cross join table_privs p
order by r.role_name, t.table_name, p.priv;

-- Trigger / aggregate helpers: EXECUTE denied for client roles.
select ok(
  not has_function_privilege(
    r.role_name,
    f.fn_sig,
    'EXECUTE'
  ),
  format('%s cannot EXECUTE %s', r.role_name, f.fn_sig)
)
from client_roles r
cross join (
  values
    ('public.set_updated_at()'),
    ('public.reject_user_rating_identity_change()'),
    ('public.handle_new_user()'),
    ('public.create_zero_rating_aggregate()'),
    ('public.handle_user_rating_change()'),
    ('public.refresh_rating_aggregates(uuid)')
) as f(fn_sig)
order by r.role_name, f.fn_sig;

select * from finish();
rollback;
