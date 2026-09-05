-- Task 12: exact policy, table/column privilege, and helper-execution inventory.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

-- 21 policy assertions + 252 table-privilege assertions +
-- 48 authenticated column-write assertions + 30 helper assertions +
-- 1 service-role attribute assertion.
select plan(352);

create temporary table expected_policies (
  table_name text not null,
  policy_name text not null,
  command text not null,
  role_name name not null,
  primary key (table_name, policy_name)
);

insert into expected_policies (
  table_name,
  policy_name,
  command,
  role_name
) values
  (
    'products',
    'anon_select_published_products',
    'SELECT',
    'anon'
  ),
  (
    'products',
    'authenticated_select_published_products',
    'SELECT',
    'authenticated'
  ),
  (
    'product_images',
    'anon_select_published_product_images',
    'SELECT',
    'anon'
  ),
  (
    'product_images',
    'authenticated_select_published_product_images',
    'SELECT',
    'authenticated'
  ),
  (
    'eazy_assessments',
    'anon_select_current_published_eazy_assessments',
    'SELECT',
    'anon'
  ),
  (
    'eazy_assessments',
    'authenticated_select_current_published_eazy_assessments',
    'SELECT',
    'authenticated'
  ),
  (
    'rating_aggregates',
    'anon_select_published_rating_aggregates',
    'SELECT',
    'anon'
  ),
  (
    'rating_aggregates',
    'authenticated_select_published_rating_aggregates',
    'SELECT',
    'authenticated'
  ),
  (
    'product_offers',
    'anon_select_published_product_offers',
    'SELECT',
    'anon'
  ),
  (
    'product_offers',
    'authenticated_select_published_product_offers',
    'SELECT',
    'authenticated'
  ),
  (
    'product_collections',
    'anon_select_published_product_collections',
    'SELECT',
    'anon'
  ),
  (
    'product_collections',
    'authenticated_select_published_product_collections',
    'SELECT',
    'authenticated'
  ),
  (
    'product_collection_items',
    'anon_select_published_product_collection_items',
    'SELECT',
    'anon'
  ),
  (
    'product_collection_items',
    'authenticated_select_published_product_collection_items',
    'SELECT',
    'authenticated'
  ),
  (
    'profiles',
    'authenticated_select_own_profile',
    'SELECT',
    'authenticated'
  ),
  (
    'profiles',
    'authenticated_update_own_profile',
    'UPDATE',
    'authenticated'
  ),
  (
    'user_ratings',
    'authenticated_select_own_user_ratings',
    'SELECT',
    'authenticated'
  ),
  (
    'user_ratings',
    'authenticated_insert_own_published_user_rating',
    'INSERT',
    'authenticated'
  ),
  (
    'user_ratings',
    'authenticated_update_own_published_user_rating',
    'UPDATE',
    'authenticated'
  ),
  (
    'user_ratings',
    'authenticated_delete_own_user_rating',
    'DELETE',
    'authenticated'
  );

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
          'product_offers',
          'product_collections',
          'product_collection_items'
        ]
      )
  ),
  20,
  'exactly the 20 Task 12 plus Task 21 collection policies exist'
);

select ok(
  exists (
    select 1
    from pg_policies as p
    where p.schemaname = 'public'
      and p.tablename = e.table_name
      and p.policyname = e.policy_name
      and p.cmd = e.command
      and p.permissive = 'PERMISSIVE'
      and p.roles = array[e.role_name]::name[]
  ),
  format(
    '%s is a permissive %s policy for %s on public.%s',
    e.policy_name,
    e.command,
    e.role_name,
    e.table_name
  )
)
from expected_policies as e
order by e.table_name, e.policy_name;

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
  ('product_offers'),
  ('product_collections'),
  ('product_collection_items');

create temporary table checked_roles (
  role_name text primary key
);

insert into checked_roles (role_name) values
  ('public'),
  ('anon'),
  ('authenticated'),
  ('service_role');

create temporary table table_privileges (
  privilege_name text primary key
);

insert into table_privileges (privilege_name) values
  ('SELECT'),
  ('INSERT'),
  ('UPDATE'),
  ('DELETE'),
  ('TRUNCATE'),
  ('REFERENCES'),
  ('TRIGGER');

select is(
  has_table_privilege(
    r.role_name,
    format('public.%I', t.table_name),
    p.privilege_name
  ),
  case
    when r.role_name = 'anon' then
      p.privilege_name = 'SELECT'
      and t.table_name in (
        'products',
        'product_images',
        'eazy_assessments',
        'rating_aggregates',
        'product_offers',
        'product_collections',
        'product_collection_items'
      )
    when r.role_name = 'authenticated' then
      (
        p.privilege_name = 'SELECT'
        and t.table_name in (
          'profiles',
          'products',
          'product_images',
          'eazy_assessments',
          'user_ratings',
          'rating_aggregates',
          'product_offers',
          'product_collections',
          'product_collection_items'
        )
      )
      or (
        p.privilege_name = 'DELETE'
        and t.table_name = 'user_ratings'
      )
    when r.role_name = 'service_role' then
      p.privilege_name in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    else false
  end,
  format(
    '%s %s on public.%s matches the Task 12 table allowlist',
    r.role_name,
    p.privilege_name,
    t.table_name
  )
)
from checked_roles as r
cross join core_tables as t
cross join table_privileges as p
order by r.role_name, t.table_name, p.privilege_name;

create temporary table checked_profile_columns (
  column_name text primary key
);

insert into checked_profile_columns (column_name) values
  ('id'),
  ('display_name'),
  ('username'),
  ('avatar_url'),
  ('created_at'),
  ('updated_at');

select is(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    c.column_name,
    p.privilege_name
  ),
  p.privilege_name = 'UPDATE'
    and c.column_name in ('display_name', 'username', 'avatar_url'),
  format(
    'authenticated %s on public.profiles.%s matches the column allowlist',
    p.privilege_name,
    c.column_name
  )
)
from checked_profile_columns as c
cross join (
  values ('INSERT'), ('UPDATE')
) as p(privilege_name)
order by c.column_name, p.privilege_name;

create temporary table checked_rating_columns (
  column_name text primary key
);

insert into checked_rating_columns (column_name) values
  ('id'),
  ('product_id'),
  ('user_id'),
  ('look'),
  ('outfit'),
  ('material'),
  ('craftsmanship'),
  ('maintenance'),
  ('comfort'),
  ('collection'),
  ('value'),
  ('resale_potential'),
  ('acquisition_ease'),
  ('score'),
  ('methodology_version'),
  ('private_note'),
  ('created_at'),
  ('updated_at');

select is(
  has_column_privilege(
    'authenticated',
    'public.user_ratings',
    c.column_name,
    p.privilege_name
  ),
  case
    when p.privilege_name = 'INSERT' then
      c.column_name in (
        'product_id',
        'user_id',
        'look',
        'outfit',
        'material',
        'craftsmanship',
        'maintenance',
        'comfort',
        'collection',
        'value',
        'resale_potential',
        'acquisition_ease',
        'private_note'
      )
    when p.privilege_name = 'UPDATE' then
      c.column_name in (
        'look',
        'outfit',
        'material',
        'craftsmanship',
        'maintenance',
        'comfort',
        'collection',
        'value',
        'resale_potential',
        'acquisition_ease',
        'private_note'
      )
    else false
  end,
  format(
    'authenticated %s on public.user_ratings.%s matches the column allowlist',
    p.privilege_name,
    c.column_name
  )
)
from checked_rating_columns as c
cross join (
  values ('INSERT'), ('UPDATE')
) as p(privilege_name)
order by c.column_name, p.privilege_name;

select ok(
  not has_function_privilege(
    r.role_name,
    f.function_signature,
    'EXECUTE'
  ),
  format(
    '%s cannot EXECUTE %s',
    r.role_name,
    f.function_signature
  )
)
from (
  values ('public'), ('anon'), ('authenticated')
) as r(role_name)
cross join (
  values
    ('public.set_updated_at()'),
    ('public.reject_user_rating_identity_change()'),
    ('public.handle_new_user()'),
    ('public.create_zero_rating_aggregate()'),
    ('public.handle_user_rating_change()'),
    ('public.refresh_rating_aggregates(uuid)'),
    ('public.derive_user_rating_composite()'),
    ('public.derive_eazy_assessment_composite()'),
    ('public.is_half_step_score_0_10(numeric)'),
    ('public.compute_sneaker10_score(numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric)')
) as f(function_signature)
order by r.role_name, f.function_signature;

select ok(
  (
    select rolbypassrls
    from pg_roles
    where rolname = 'service_role'
  ),
  'service_role retains its trusted server-only BYPASSRLS attribute'
);

select * from finish();
rollback;
