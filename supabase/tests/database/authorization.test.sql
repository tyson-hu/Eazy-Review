-- Task 12: anonymous, owner, cross-user, missing-claim, and service-role
-- authorization behavior. Fixtures are transaction-rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(70);

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
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
  'task12-user-a@example.com'
);
select pg_temp.make_auth_user(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid,
  'task12-user-b@example.com'
);

update public.profiles
set
  display_name = 'User A',
  username = 'task12-user-a'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid;

update public.profiles
set
  display_name = 'User B',
  username = 'task12-user-b'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid;

insert into public.products (id, brand, name, is_published)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
    'Published Brand',
    'Published Product',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
    'Draft Brand',
    'Draft Product',
    false
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid,
    'Published Brand',
    'Second Published Product',
    true
  );

insert into public.product_images (
  id,
  product_id,
  image_url,
  sort_order
) values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
    'https://example.com/published.png',
    0
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
    'https://example.com/draft.png',
    0
  );

insert into public.product_offers (
  id,
  product_id,
  website_name,
  website_link,
  price
) values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd1'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
    'Published Shop',
    'https://example.com/published-offer',
    100
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd2'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
    'Draft Shop',
    'https://example.com/draft-offer',
    90
  );

insert into public.eazy_assessments (
  id,
  product_id,
  score,
  is_current,
  methodology_version
) values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
    80,
    true,
    'current'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
    70,
    false,
    'historical'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
    60,
    true,
    'draft-current'
  );

insert into public.user_ratings (
  id,
  product_id,
  user_id,
  look,
  comfort,
  quality,
  outfit,
  value,
  overall,
  private_note
) values (
  'ffffffff-ffff-ffff-ffff-fffffffffff2'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid,
  6,
  6,
  6,
  6,
  6,
  6,
  'user-b-private-note'
);

-- A policy is insufficient without its explicit table grant.
revoke select on table public.products from anon;
set local role anon;
select throws_ok(
  $$select count(*) from public.products$$,
  '42501',
  null,
  'published-products policy is unreachable after the anon SELECT grant is removed'
);
reset role;
grant select on table public.products to anon;

-- Anonymous published-catalog behavior.
-- Counts are scoped to this file's fixtures so Task 13 catalog seed rows do
-- not dilute the authorization assertions.
set local role anon;

select is(
  (
    select count(*)::int
    from public.products
    where id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  2,
  'anon reads only the two published products'
);
select is(
  (
    select count(*)::int
    from public.products
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid
  ),
  0,
  'anon cannot read the unpublished product'
);
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  1,
  'anon reads only images for published products'
);
select is(
  (
    select count(*)::int
    from public.product_offers
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  1,
  'anon reads only offers for published products'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  1,
  'anon reads only the current assessment for a published product'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where methodology_version = 'historical'
  ),
  0,
  'anon cannot read historical assessments'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  2,
  'anon reads aggregates only for published products'
);
select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'anon cannot read profiles'
);
select throws_ok(
  $$select count(*) from public.user_ratings$$,
  '42501',
  null,
  'anon cannot read raw user ratings or private notes'
);
select throws_ok(
  $$insert into public.products (brand, name) values ('Blocked', 'Insert')$$,
  '42501',
  null,
  'anon cannot insert catalog rows'
);
select throws_ok(
  $$update public.products set name = name$$,
  '42501',
  null,
  'anon cannot update catalog rows'
);
select throws_ok(
  $$delete from public.products$$,
  '42501',
  null,
  'anon cannot delete catalog rows'
);
select throws_ok(
  $$update public.rating_aggregates set rating_count = 999$$,
  '42501',
  null,
  'anon cannot update aggregate rows'
);
select throws_ok(
  $$
    select public.refresh_rating_aggregates(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid
    )
  $$,
  '42501',
  null,
  'anon cannot execute the aggregate refresh helper'
);

reset role;

-- Authenticated User A: published catalog and owner-only profile access.
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::int
    from public.products
    where id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  2,
  'authenticated User A reads only published products'
);
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  1,
  'authenticated User A reads only published-product images'
);
select is(
  (
    select count(*)::int
    from public.product_offers
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  1,
  'authenticated User A reads only published-product offers'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  1,
  'authenticated User A reads only current published assessments'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id in (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    )
  ),
  2,
  'authenticated User A reads only published-product aggregates'
);
select is(
  (select count(*)::int from public.profiles),
  1,
  'User A reads exactly their own profile'
);
select is(
  (
    select count(*)::int
    from public.profiles
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
  ),
  0,
  'User A cannot read User B profile'
);
select results_eq(
  $$
    update public.profiles
    set display_name = 'User A Updated'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
    returning display_name
  $$,
  $$values ('User A Updated'::text)$$,
  'User A updates and receives their approved profile field'
);
select results_eq(
  $$
    update public.profiles
    set display_name = 'Cross-user change'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
    returning 1
  $$,
  $$select 1 where false$$,
  'User A cannot update User B profile'
);
select throws_ok(
  $$
    insert into public.profiles (id, display_name)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid,
      'Blocked profile'
    )
  $$,
  '42501',
  null,
  'authenticated clients cannot insert profiles'
);
select throws_ok(
  $$
    delete from public.profiles
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'authenticated clients cannot delete profiles'
);
select throws_ok(
  $$
    update public.profiles
    set created_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'profile audit columns remain non-writable despite the owner policy'
);

-- Authenticated User A: owner-only rating CRUD and private-note isolation.
select is(
  (select count(*)::int from public.user_ratings),
  0,
  'User A cannot read User B raw rating'
);
select is(
  (
    select count(*)::int
    from public.user_ratings
    where private_note = 'user-b-private-note'
  ),
  0,
  'User B private note is absent from User A returned rows'
);
select lives_ok(
  $$
    insert into public.user_ratings (
      product_id,
      user_id,
      look,
      comfort,
      quality,
      outfit,
      value,
      overall,
      private_note
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
      8,
      8,
      8,
      8,
      8,
      8,
      'user-a-private-note'
    )
  $$,
  'User A inserts their own rating for a published product'
);
select is(
  (select count(*)::int from public.user_ratings),
  1,
  'User A reads exactly their own rating'
);
select is(
  (
    select private_note
    from public.user_ratings
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  ),
  'user-a-private-note',
  'User A can read their own private note'
);
select lives_ok(
  $$
    update public.user_ratings
    set
      look = 9,
      private_note = 'user-a-updated-note'
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid
      and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  'User A updates only their own score and private note'
);
select ok(
  (
    select look = 9
      and private_note = 'user-a-updated-note'
    from public.user_ratings
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  ),
  'User A receives the updated score and private note'
);
select throws_ok(
  $$
    insert into public.user_ratings (
      product_id,
      user_id,
      look,
      comfort,
      quality,
      outfit,
      value,
      overall
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
      5,
      5,
      5,
      5,
      5,
      5
    )
  $$,
  '23505',
  null,
  'the one-rating-per-user-per-product constraint rejects a duplicate'
);
select throws_ok(
  $$
    insert into public.user_ratings (
      product_id,
      user_id,
      look,
      comfort,
      quality,
      outfit,
      value,
      overall
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid,
      5,
      5,
      5,
      5,
      5,
      5
    )
  $$,
  '42501',
  null,
  'User A cannot insert a rating claiming User B ownership'
);
select throws_ok(
  $$
    insert into public.user_ratings (
      product_id,
      user_id,
      look,
      comfort,
      quality,
      outfit,
      value,
      overall
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
      5,
      5,
      5,
      5,
      5,
      5
    )
  $$,
  '42501',
  null,
  'User A cannot rate an unpublished product'
);
select results_eq(
  $$
    update public.user_ratings
    set look = 1
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
    returning 1
  $$,
  $$select 1 where false$$,
  'User A cannot update User B rating'
);
select results_eq(
  $$
    delete from public.user_ratings
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
    returning 1
  $$,
  $$select 1 where false$$,
  'User A cannot delete User B rating'
);
select throws_ok(
  $$
    update public.user_ratings
    set user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'User A cannot rewrite rating ownership'
);
select throws_ok(
  $$
    update public.user_ratings
    set product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'User A cannot rewrite rating product identity'
);
select throws_ok(
  $$
    update public.user_ratings
    set id = 'ffffffff-ffff-ffff-ffff-fffffffffff1'::uuid
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'User A cannot rewrite rating row identity'
);
select throws_ok(
  $$
    update public.user_ratings
    set created_at = now()
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'User A cannot rewrite rating created_at'
);
select throws_ok(
  $$
    update public.user_ratings
    set updated_at = now()
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'User A cannot supply rating updated_at'
);
select throws_ok(
  $$update public.rating_aggregates set rating_count = 999$$,
  '42501',
  null,
  'authenticated clients cannot update aggregates'
);
select throws_ok(
  $$update public.products set is_published = false$$,
  '42501',
  null,
  'authenticated clients cannot update catalog publication'
);
select throws_ok(
  $$
    select public.refresh_rating_aggregates(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid
    )
  $$,
  '42501',
  null,
  'authenticated clients cannot execute the aggregate refresh helper'
);
select throws_ok(
  $$select public.handle_user_rating_change()$$,
  '42501',
  null,
  'authenticated clients cannot execute the aggregate trigger entrypoint'
);

reset role;

-- Missing or malformed JWT subjects never authorize owner access.
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.profiles),
  0,
  'authenticated role with no JWT subject reads no profiles'
);
select is(
  (select count(*)::int from public.user_ratings),
  0,
  'authenticated role with no JWT subject reads no ratings'
);
select throws_ok(
  $$
    insert into public.user_ratings (
      product_id,
      user_id,
      look,
      comfort,
      quality,
      outfit,
      value,
      overall
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
      5,
      5,
      5,
      5,
      5,
      5
    )
  $$,
  '42501',
  null,
  'authenticated role with no JWT subject cannot insert a rating'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"not-a-uuid","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select count(*) from public.profiles$$,
  '22P02',
  null,
  'a malformed JWT subject errors instead of authorizing profile access'
);
reset role;

-- Rating updates require continued publication, but owner deletion does not.
update public.products
set is_published = false
where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid;

select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$
    update public.user_ratings
    set overall = 4
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  '42501',
  null,
  'User A cannot update their rating after product unpublish'
);
select lives_ok(
  $$
    delete from public.user_ratings
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
  $$,
  'User A can delete their rating after product unpublish'
);
select is(
  (select count(*)::int from public.user_ratings),
  0,
  'User A own rating is gone after the permitted delete'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  (select count(*)::int from public.user_ratings),
  1,
  'User B still reads their own rating after product unpublish'
);
select is(
  (select private_note from public.user_ratings),
  'user-b-private-note',
  'User B still reads their own private note'
);
select throws_ok(
  $$update public.user_ratings set overall = 3$$,
  '42501',
  null,
  'User B cannot update their rating after product unpublish'
);
reset role;

-- Trusted service-role table CRUD remains server-only and drives aggregates.
set local role service_role;
select lives_ok(
  $$
    insert into public.user_ratings (
      product_id,
      user_id,
      look,
      comfort,
      quality,
      outfit,
      value,
      overall,
      private_note
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
      7,
      7,
      7,
      7,
      7,
      7,
      'server-only fixture'
    )
  $$,
  'service_role inserts a rating through its table allowlist'
);
select is(
  (
    select rating_count
    from public.rating_aggregates
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
  ),
  1,
  'service-role rating insert refreshes the aggregate'
);
select lives_ok(
  $$
    update public.user_ratings
    set overall = 2
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
  $$,
  'service_role updates a rating through its table allowlist'
);
select is(
  (
    select score
    from public.rating_aggregates
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
  ),
  20,
  'service-role rating update refreshes Community Score'
);
select lives_ok(
  $$
    delete from public.user_ratings
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
  $$,
  'service_role deletes a rating through its table allowlist'
);
select ok(
  (
    select rating_count = 0
      and overall_avg is null
      and score is null
    from public.rating_aggregates
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid
  ),
  'service-role rating delete restores the zero/null aggregate'
);
select lives_ok(
  $$
    insert into public.products (id, brand, name)
    values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid,
      'Service Brand',
      'Service Product'
    )
  $$,
  'service_role inserts a product through its table allowlist'
);
select lives_ok(
  $$
    update public.products
    set name = 'Service Product Updated'
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid
  $$,
  'service_role updates a product through its table allowlist'
);
select is(
  (
    select count(*)::int
    from public.products
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid
      and name = 'Service Product Updated'
  ),
  1,
  'service_role selects the updated product'
);
select lives_ok(
  $$
    delete from public.products
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid
  $$,
  'service_role deletes a product through its table allowlist'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid
  ),
  0,
  'service-role product delete cascades the zero aggregate'
);
reset role;

select hasnt_column(
  'public',
  'rating_aggregates',
  'private_note',
  'aggregate rows contain no private-note column'
);

select * from finish();
rollback;
