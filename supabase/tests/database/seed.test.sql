-- Catalog seed acceptance — Task 13 fixtures, the 2026-09-02 extension set,
-- aggregates, anon reads, same-database reapply idempotency, no auth/ratings,
-- no direct aggregate writes.
-- Reapply uses \ir ../support/task13_seed_reapply.sql.inc because the psql test
-- runner can only see tests/. test:db:reset enforces byte identity first.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(54);

-- Seed namespace (must match supabase/seed.sql): every seeded product id lives
-- under a1000000-0000-4000-8000-. Task 13 fixtures use 0000000000NN; the
-- extension set uses 000010 00KK 00 (TT = 10 marks a product row).
create temporary table seed_products as
select id
from public.products
where id::text like 'a1000000-0000-4000-8000-%';

create temporary table extension_products as
select id
from seed_products
where id::text like 'a1000000-0000-4000-8000-000010%';

-- Deterministic fixture IDs (must match supabase/seed.sql).
select is(
  (
    select count(*)::int
    from public.products
    where id = 'a1000000-0000-4000-8000-000000000001'::uuid
      and is_published
  ),
  1,
  'seed complete product exists and is published'
);
select is(
  (
    select count(*)::int
    from public.products
    where id = 'a1000000-0000-4000-8000-000000000002'::uuid
      and is_published
  ),
  1,
  'seed sparse product exists and is published'
);
select is(
  (select count(*)::int from seed_products),
  27,
  'exactly 27 seeded products by deterministic UUID namespace'
);
select is(
  (select count(*)::int from extension_products),
  25,
  'exactly 25 extension products by deterministic UUID namespace'
);
select is(
  (select count(*)::int from public.products where is_published),
  27,
  'fresh seed contains exactly 27 published products'
);
select is(
  (
    select count(*)::int
    from public.products
    where id in (select id from seed_products)
      and is_published
  ),
  27,
  'every seeded product is published'
);
select is(
  (
    select sku
    from public.products
    where id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  'CW2288-111',
  'complete product is Air Force 1 White'
);
select is(
  (
    select sku
    from public.products
    where id = 'a1000000-0000-4000-8000-000000000002'::uuid
  ),
  'B75806',
  'sparse product is Samba White and Black'
);

-- Complete product relations
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'complete product has exactly one image'
);
select is(
  (
    select id
    from public.product_images
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  'a1000000-0000-4000-8000-000000000011'::uuid,
  'complete product image uses deterministic id'
);
select is(
  (
    select sort_order
    from public.product_images
    where id = 'a1000000-0000-4000-8000-000000000011'::uuid
  ),
  0,
  'complete product image uses sort order zero'
);
select ok(
  (
    select image_url like 'https://%'
    from public.product_images
    where id = 'a1000000-0000-4000-8000-000000000011'::uuid
  ),
  'complete product image URL is HTTPS'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'complete product has exactly one assessment'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
      and is_current
  ),
  1,
  'complete product has exactly one current assessment'
);
select ok(
  (
    select
      look between 0 and 10
      and outfit between 0 and 10
      and material between 0 and 10
      and craftsmanship between 0 and 10
      and maintenance between 0 and 10
      and comfort between 0 and 10
      and collection between 0 and 10
      and value between 0 and 10
      and resale_potential between 0 and 10
      and acquisition_ease between 0 and 10
      and score between 0 and 100
      and methodology_version = 'sneaker-10-v1'
      and is_current
    from public.eazy_assessments
    where id = 'a1000000-0000-4000-8000-000000000021'::uuid
  ),
  'complete assessment fields are populated and valid'
);
select is(
  (
    select score
    from public.eazy_assessments
    where id = 'a1000000-0000-4000-8000-000000000021'::uuid
  ),
  79,
  'complete assessment composite is trigger-derived to 79'
);
select ok(
  (
    select count(*)::int
    from public.product_offers
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ) between 2 and 3,
  'complete product has two or three offers'
);
select is(
  (
    select array_agg(id order by id)
    from public.product_offers
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  array[
    'a1000000-0000-4000-8000-000000000031'::uuid,
    'a1000000-0000-4000-8000-000000000032'::uuid
  ],
  'complete product offers use exactly the deterministic ids'
);
select ok(
  not exists (
    select 1
    from public.product_offers
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
      and (
        website_name is null
        or length(trim(website_name)) = 0
        or website_link is null
        or website_link not like 'https://%'
        or price is null
        or price <= 0
        or currency is distinct from 'USD'
        or size_region is distinct from 'US'
        or last_checked_at is null
      )
  ),
  'every complete-product offer satisfies HTTPS, price, USD, US, last_checked_at'
);

-- Sparse product absences
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id = 'a1000000-0000-4000-8000-000000000002'::uuid
  ),
  0,
  'sparse product has no images'
);
select is(
  (
    select count(*)::int
    from public.product_offers
    where product_id = 'a1000000-0000-4000-8000-000000000002'::uuid
  ),
  0,
  'sparse product has no offers'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id = 'a1000000-0000-4000-8000-000000000002'::uuid
  ),
  0,
  'sparse product has no assessments'
);

-- Extension set (25 StockX-sourced products with official Eazy assessments)
select ok(
  not exists (
    select 1
    from public.products p
    where p.id in (select id from extension_products)
      and (
        length(trim(p.brand)) = 0
        or length(trim(p.name)) = 0
        or p.sku is null
        or p.sku !~ '^[A-Z0-9]+-[0-9]{3}$'
        or p.size_type not in ('men', 'women')
        or p.release_date is null
        or p.description is null
        or length(trim(p.description)) = 0
      )
  ),
  'every extension product has brand, name, style-code sku, size type, release date, description'
);
select is(
  (
    select count(distinct sku)::int
    from public.products
    where id in (select id from seed_products)
  ),
  27,
  'seeded skus are unique across the catalog'
);
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id in (select id from extension_products)
  ),
  25,
  'extension products carry exactly 25 images in total'
);
select is(
  (
    select count(distinct product_id)::int
    from public.product_images
    where product_id in (select id from extension_products)
      and image_url like 'https://%'
      and sort_order = 0
  ),
  25,
  'every extension product has one HTTPS primary image at sort order zero'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id in (select id from extension_products)
  ),
  25,
  'extension products carry exactly 25 assessments in total'
);
select is(
  (
    select count(distinct product_id)::int
    from public.eazy_assessments
    where product_id in (select id from extension_products)
      and is_current
      and methodology_version = 'sneaker-10-v1'
      and score between 0 and 100
      and look between 0 and 10 and (look * 2) = trunc(look * 2)
      and outfit between 0 and 10 and (outfit * 2) = trunc(outfit * 2)
      and material between 0 and 10 and (material * 2) = trunc(material * 2)
      and craftsmanship between 0 and 10
        and (craftsmanship * 2) = trunc(craftsmanship * 2)
      and maintenance between 0 and 10
        and (maintenance * 2) = trunc(maintenance * 2)
      and comfort between 0 and 10 and (comfort * 2) = trunc(comfort * 2)
      and collection between 0 and 10
        and (collection * 2) = trunc(collection * 2)
      and value between 0 and 10 and (value * 2) = trunc(value * 2)
      and resale_potential between 0 and 10
        and (resale_potential * 2) = trunc(resale_potential * 2)
      and acquisition_ease between 0 and 10
        and (acquisition_ease * 2) = trunc(acquisition_ease * 2)
  ),
  25,
  'every extension product has one current sneaker-10-v1 assessment with half-step dimensions and a derived score'
);
select is(
  (
    select count(distinct product_id)::int
    from public.product_offers
    where product_id in (select id from extension_products)
  ),
  25,
  'every extension product has at least one offer'
);
select ok(
  not exists (
    select 1
    from public.product_offers
    where product_id in (select id from extension_products)
    group by product_id
    having count(*) > 3
  ),
  'no extension product has more than three offers'
);
select ok(
  not exists (
    select 1
    from public.product_offers
    where product_id in (select id from extension_products)
      and (
        website_name is null
        or length(trim(website_name)) = 0
        or website_link is null
        or website_link not like 'https://%'
        or size is null
        or size <= 0
        or price is null
        or price <= 0
        or currency is distinct from 'USD'
        or size_region is distinct from 'US'
        or last_checked_at is null
      )
  ),
  'every extension offer satisfies HTTPS, size, price, USD, US, last_checked_at'
);

-- No user ratings anywhere in the seed
select is(
  (
    select count(*)::int
    from public.user_ratings
    where product_id in (select id from seed_products)
  ),
  0,
  'no seeded product has user ratings'
);

-- Trigger-created empty aggregates
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'complete product has exactly one aggregate'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id = 'a1000000-0000-4000-8000-000000000002'::uuid
  ),
  1,
  'sparse product has exactly one aggregate'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id in (select id from seed_products)
  ),
  27,
  'every seeded product has exactly one aggregate'
);
select ok(
  (
    select
      rating_count = 0
      and look_avg is null
      and comfort_avg is null
      and material_avg is null
      and craftsmanship_avg is null
      and maintenance_avg is null
      and collection_avg is null
      and resale_potential_avg is null
      and acquisition_ease_avg is null
      and outfit_avg is null
      and value_avg is null
      and score is null
    from public.rating_aggregates
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  'complete aggregate is empty zero-count'
);
select ok(
  (
    select
      rating_count = 0
      and look_avg is null
      and comfort_avg is null
      and material_avg is null
      and craftsmanship_avg is null
      and maintenance_avg is null
      and collection_avg is null
      and resale_potential_avg is null
      and acquisition_ease_avg is null
      and outfit_avg is null
      and value_avg is null
      and score is null
    from public.rating_aggregates
    where product_id = 'a1000000-0000-4000-8000-000000000002'::uuid
  ),
  'sparse aggregate is empty zero-count'
);

-- Seed introduces no auth users or profiles (post-reset baseline)
select is(
  (select count(*)::int from auth.users),
  0,
  'seed introduces no auth users'
);
select is(
  (select count(*)::int from public.profiles),
  0,
  'seed introduces no profiles'
);

-- Seed code must not have written aggregates beyond the product-insert trigger
-- path: aggregates for seed products remain empty zero-count after seed load.
select ok(
  not exists (
    select 1
    from public.rating_aggregates ra
    where ra.product_id in (select id from seed_products)
    and (
      ra.rating_count <> 0
      or ra.look_avg is not null
      or ra.outfit_avg is not null
      or ra.material_avg is not null
      or ra.craftsmanship_avg is not null
      or ra.maintenance_avg is not null
      or ra.comfort_avg is not null
      or ra.collection_avg is not null
      or ra.value_avg is not null
      or ra.resale_potential_avg is not null
      or ra.acquisition_ease_avg is not null
      or ra.score is not null
      or ra.methodology_version is not null
    )
  ),
  'seed left aggregates empty (no direct aggregate population)'
);

-- Privileged row counts, compared against anon reads below.
create temporary table seed_counts as
select 'products'::text as tbl, count(*)::int as n
from public.products
where id in (select id from seed_products)
union all
select 'product_images', count(*)::int
from public.product_images
where product_id in (select id from seed_products)
union all
select 'eazy_assessments', count(*)::int
from public.eazy_assessments
where product_id in (select id from seed_products)
union all
select 'product_offers', count(*)::int
from public.product_offers
where product_id in (select id from seed_products)
union all
select 'rating_aggregates', count(*)::int
from public.rating_aggregates
where product_id in (select id from seed_products);

-- Anonymous reads under Task 12 policies (anon needs the temp helpers only).
grant select on seed_products, seed_counts to anon;
set local role anon;
select is(
  (
    select count(*)::int
    from public.products
    where id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'products'),
  'anon can read every seeded published product'
);
select is(
  (
    select count(*)::int
    from public.product_images
    where id = 'a1000000-0000-4000-8000-000000000011'::uuid
  ),
  1,
  'anon can read complete product image'
);
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'product_images'),
  'anon can read every seeded product image'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where id = 'a1000000-0000-4000-8000-000000000021'::uuid
  ),
  1,
  'anon can read complete product current assessment'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'eazy_assessments'),
  'anon can read every seeded current assessment'
);
select is(
  (
    select count(*)::int
    from public.product_offers
    where product_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  ),
  2,
  'anon can read both complete product offers'
);
select is(
  (
    select count(*)::int
    from public.product_offers
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'product_offers'),
  'anon can read every seeded offer'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'rating_aggregates'),
  'anon can read every seeded product aggregate'
);
reset role;

-- Capture complete seeded state before reapply (same database).
create temporary table seed_state_before as
select
  'products'::text as entity,
  p.id::text as row_id,
  to_jsonb(p) as payload
from public.products p
where p.id in (select id from seed_products)
union all
select
  'product_images',
  pi.id::text,
  to_jsonb(pi)
from public.product_images pi
where pi.product_id in (select id from seed_products)
union all
select
  'eazy_assessments',
  ea.id::text,
  to_jsonb(ea)
from public.eazy_assessments ea
where ea.product_id in (select id from seed_products)
union all
select
  'product_offers',
  po.id::text,
  to_jsonb(po)
from public.product_offers po
where po.product_id in (select id from seed_products)
union all
select
  'rating_aggregates',
  ra.product_id::text,
  to_jsonb(ra)
from public.rating_aggregates ra
where ra.product_id in (select id from seed_products);

-- Reapply committed seed against the same database (nestable DO, no COMMIT).
\ir ../support/task13_seed_reapply.sql.inc

select is(
  (
    select count(*)::int
    from public.products
    where id::text like 'a1000000-0000-4000-8000-%'
  ),
  (select n from seed_counts where tbl = 'products'),
  'idempotent reapply: product row count unchanged'
);
select is(
  (
    select count(*)::int
    from public.product_images
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'product_images'),
  'idempotent reapply: image row count unchanged'
);
select is(
  (
    select count(*)::int
    from public.eazy_assessments
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'eazy_assessments'),
  'idempotent reapply: assessment row count unchanged'
);
select is(
  (
    select count(*)::int
    from public.product_offers
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'product_offers'),
  'idempotent reapply: offer row count unchanged'
);
select is(
  (
    select count(*)::int
    from public.rating_aggregates
    where product_id in (select id from seed_products)
  ),
  (select n from seed_counts where tbl = 'rating_aggregates'),
  'idempotent reapply: aggregate row count unchanged'
);

create temporary table seed_state_after as
select
  'products'::text as entity,
  p.id::text as row_id,
  to_jsonb(p) as payload
from public.products p
where p.id in (select id from seed_products)
union all
select
  'product_images',
  pi.id::text,
  to_jsonb(pi)
from public.product_images pi
where pi.product_id in (select id from seed_products)
union all
select
  'eazy_assessments',
  ea.id::text,
  to_jsonb(ea)
from public.eazy_assessments ea
where ea.product_id in (select id from seed_products)
union all
select
  'product_offers',
  po.id::text,
  to_jsonb(po)
from public.product_offers po
where po.product_id in (select id from seed_products)
union all
select
  'rating_aggregates',
  ra.product_id::text,
  to_jsonb(ra)
from public.rating_aggregates ra
where ra.product_id in (select id from seed_products);

select is(
  (
    select count(*)::int
    from seed_state_before b
    full outer join seed_state_after a
      on a.entity = b.entity
     and a.row_id = b.row_id
    where a.row_id is null
       or b.row_id is null
       or a.payload is distinct from b.payload
  ),
  0,
  'idempotent reapply: every seeded value and timestamp unchanged'
);

select * from finish();
rollback;
