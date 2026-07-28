-- Packet 6: core schema shape — tables, key indexes/triggers, RLS enabled.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(36);

-- Seven Task 11 tables exist.
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'products', 'products exists');
select has_table('public', 'product_images', 'product_images exists');
select has_table('public', 'eazy_assessments', 'eazy_assessments exists');
select has_table('public', 'user_ratings', 'user_ratings exists');
select has_table('public', 'rating_aggregates', 'rating_aggregates exists');
select has_table('public', 'product_offers', 'product_offers exists');

-- Key indexes.
select has_index(
  'public',
  'products',
  'products_brand_idx',
  'products_brand_idx exists'
);
select has_index(
  'public',
  'products',
  'products_published_idx',
  'products_published_idx exists'
);
select has_index(
  'public',
  'user_ratings',
  'user_ratings_product_id_idx',
  'user_ratings_product_id_idx exists'
);
select has_index(
  'public',
  'eazy_assessments',
  'eazy_assessments_one_current_per_product',
  'one-current eazy assessment unique index exists'
);

-- Key uniqueness / PK constraints via catalog.
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'user_ratings'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%product_id%user_id%'
  ),
  'user_ratings unique (product_id, user_id)'
);
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'product_images'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%product_id%sort_order%'
  ),
  'product_images unique (product_id, sort_order)'
);
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'rating_aggregates'
      and c.contype = 'p'
  ),
  'rating_aggregates PK on product_id'
);

-- Required triggers.
select hasnt_trigger(
  'public',
  'user_ratings',
  'user_ratings_refresh_aggregates_trigger',
  'row-level aggregate refresh trigger was replaced'
);
select has_trigger(
  'public',
  'user_ratings',
  'user_ratings_refresh_aggregates_insert_trigger',
  'statement-level aggregate insert trigger exists'
);
select has_trigger(
  'public',
  'user_ratings',
  'user_ratings_refresh_aggregates_update_trigger',
  'statement-level aggregate update trigger exists'
);
select has_trigger(
  'public',
  'user_ratings',
  'user_ratings_refresh_aggregates_delete_trigger',
  'statement-level aggregate delete trigger exists'
);
select is(
  (
    select count(*)::int
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_ratings'
      and t.tgname in (
        'user_ratings_refresh_aggregates_insert_trigger',
        'user_ratings_refresh_aggregates_update_trigger',
        'user_ratings_refresh_aggregates_delete_trigger'
      )
      and (t.tgtype & 1) = 0
      and (t.tgoldtable is not null or t.tgnewtable is not null)
  ),
  3,
  'aggregate refresh triggers are statement-level with transition tables'
);
select has_trigger(
  'public',
  'user_ratings',
  'user_ratings_immutable_identity_trigger',
  'immutable identity trigger exists'
);
select has_trigger(
  'public',
  'products',
  'products_create_rating_aggregate_trigger',
  'zero aggregate create trigger exists'
);
select has_trigger(
  'auth',
  'users',
  'on_auth_user_created',
  'auth.users → profiles trigger exists'
);
select has_trigger(
  'public',
  'user_ratings',
  'user_ratings_set_updated_at',
  'user_ratings updated_at trigger exists'
);

-- Required functions exist with expected security attributes.
select has_function(
  'public',
  'handle_new_user',
  'handle_new_user exists'
);
select has_function(
  'public',
  'handle_user_rating_change',
  'handle_user_rating_change exists'
);
select has_function(
  'public',
  'refresh_rating_aggregates',
  array['uuid'],
  'refresh_rating_aggregates(uuid) exists'
);
select ok(
  (
    select prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ),
  'handle_new_user is SECURITY DEFINER'
);
select ok(
  (
    select prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_user_rating_change'
  ),
  'handle_user_rating_change is SECURITY DEFINER'
);
select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.refresh_rating_aggregates(uuid)'::regprocedure
  ),
  'refresh_rating_aggregates remains SECURITY INVOKER'
);

-- RLS enabled on all seven exposed tables (not FORCE; Task 11 boundary).
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
  ),
  'RLS enabled on profiles'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'products'
  ),
  'RLS enabled on products'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_images'
  ),
  'RLS enabled on product_images'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'eazy_assessments'
  ),
  'RLS enabled on eazy_assessments'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_ratings'
  ),
  'RLS enabled on user_ratings'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'rating_aggregates'
  ),
  'RLS enabled on rating_aggregates'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_offers'
  ),
  'RLS enabled on product_offers'
);

select * from finish();
rollback;
