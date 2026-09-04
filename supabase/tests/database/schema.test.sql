-- Packet 6: core schema shape — tables, key indexes/triggers, RLS enabled.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(48);

-- Seven Task 11 tables exist.
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'products', 'products exists');
select has_table('public', 'product_images', 'product_images exists');
select has_table('public', 'eazy_assessments', 'eazy_assessments exists');
select has_table('public', 'user_ratings', 'user_ratings exists');
select has_table('public', 'rating_aggregates', 'rating_aggregates exists');
select has_table('public', 'product_offers', 'product_offers exists');
select has_table(
  'public',
  'product_collections',
  'product_collections exists'
);
select has_table(
  'public',
  'product_collection_items',
  'product_collection_items exists'
);

-- Auth-user foreign keys are exact cascading relationships.
select is(
  (
    select count(*)::int
    from pg_constraint c
    join pg_class child_table on child_table.oid = c.conrelid
    join pg_namespace child_namespace on child_namespace.oid = child_table.relnamespace
    join pg_class parent_table on parent_table.oid = c.confrelid
    join pg_namespace parent_namespace on parent_namespace.oid = parent_table.relnamespace
    join unnest(c.conkey) with ordinality as child_key(attnum, ordinality) on true
    join pg_attribute child_attribute
      on child_attribute.attrelid = c.conrelid
      and child_attribute.attnum = child_key.attnum
    join unnest(c.confkey) with ordinality as parent_key(attnum, ordinality)
      on parent_key.ordinality = child_key.ordinality
    join pg_attribute parent_attribute
      on parent_attribute.attrelid = c.confrelid
      and parent_attribute.attnum = parent_key.attnum
    where c.contype = 'f'
      and child_namespace.nspname = 'public'
      and child_table.relname = 'profiles'
      and child_attribute.attname = 'id'
      and parent_namespace.nspname = 'auth'
      and parent_table.relname = 'users'
      and parent_attribute.attname = 'id'
      and c.confdeltype = 'c'
  ),
  1,
  'profiles.id cascades to auth.users.id'
);
select is(
  (
    select count(*)::int
    from pg_constraint c
    join pg_class child_table on child_table.oid = c.conrelid
    join pg_namespace child_namespace on child_namespace.oid = child_table.relnamespace
    join pg_class parent_table on parent_table.oid = c.confrelid
    join pg_namespace parent_namespace on parent_namespace.oid = parent_table.relnamespace
    join unnest(c.conkey) with ordinality as child_key(attnum, ordinality) on true
    join pg_attribute child_attribute
      on child_attribute.attrelid = c.conrelid
      and child_attribute.attnum = child_key.attnum
    join unnest(c.confkey) with ordinality as parent_key(attnum, ordinality)
      on parent_key.ordinality = child_key.ordinality
    join pg_attribute parent_attribute
      on parent_attribute.attrelid = c.confrelid
      and parent_attribute.attnum = parent_key.attnum
    where c.contype = 'f'
      and child_namespace.nspname = 'public'
      and child_table.relname = 'user_ratings'
      and child_attribute.attname = 'user_id'
      and parent_namespace.nspname = 'auth'
      and parent_table.relname = 'users'
      and parent_attribute.attname = 'id'
      and c.confdeltype = 'c'
  ),
  1,
  'user_ratings.user_id cascades to auth.users.id'
);

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
select has_index(
  'public',
  'product_collections',
  'product_collections_one_published_feed_position',
  'one published Feed position unique index exists'
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
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'product_collections'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%slug%'
  ),
  'product_collections unique slug'
);
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'product_collection_items'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%collection_id%product_id%'
  ),
  'product_collection_items unique (collection_id, product_id)'
);
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'product_collection_items'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%collection_id%position%'
  ),
  'product_collection_items unique (collection_id, position)'
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
select has_trigger(
  'public',
  'product_collections',
  'product_collections_set_updated_at',
  'product_collections updated_at trigger exists'
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
select ok(
  pg_get_functiondef(
    'public.handle_user_rating_change()'::regprocedure
  ) ilike '%hashtextextended%'
    and pg_get_functiondef(
      'public.handle_user_rating_change()'::regprocedure
    ) ~* 'order by[[:space:]]+(affected.lock_key|pg_catalog.hashtextextended)',
  'aggregate refresh orders the actual advisory-lock keys'
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
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_collections'
  ),
  'RLS enabled on product_collections'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_collection_items'
  ),
  'RLS enabled on product_collection_items'
);

select * from finish();
rollback;
