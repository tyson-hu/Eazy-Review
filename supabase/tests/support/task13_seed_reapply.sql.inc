-- Task 13: deterministic catalog seed (complete + sparse published products).
-- Idempotent for same-database reapplication: insert-if-absent, then assert
-- any existing fixture row exactly matches the canonical values.
-- Never writes rating_aggregates (product insert trigger creates empty rows).
-- Never creates auth.users, profiles, or user_ratings.
-- Single DO block (no outer COMMIT) so the file can re-run inside a test
-- transaction without breaking the outer transaction boundary.

do $task13_seed$
declare
  complete_product_id constant uuid := 'a1000000-0000-4000-8000-000000000001';
  sparse_product_id constant uuid := 'a1000000-0000-4000-8000-000000000002';
  image_id constant uuid := 'a1000000-0000-4000-8000-000000000011';
  assessment_id constant uuid := 'a1000000-0000-4000-8000-000000000021';
  offer_kith_id constant uuid := 'a1000000-0000-4000-8000-000000000031';
  offer_sp_id constant uuid := 'a1000000-0000-4000-8000-000000000032';
  image_url constant text :=
    'https://raw.githubusercontent.com/tyson-hu/Eazy-Review/470be6a/assets/images/products/product-03-990v6-grey.png';
  complete_description constant text :=
    'The sixth version of the MADE in USA 990 in the signature grey mesh and pig suede build with FuelCell and ENCAP cushioning.';
  offer_checked_at constant timestamptz := '2026-08-02T14:19:30Z';
  r_product public.products%rowtype;
  r_image public.product_images%rowtype;
  r_assessment public.eazy_assessments%rowtype;
  r_offer public.product_offers%rowtype;
  r_agg public.rating_aggregates%rowtype;
  n int;
begin
  -- -------------------------------------------------------------------------
  -- Complete product: New Balance 990v6 Grey (mock catalog id 3 / M990GL6)
  -- -------------------------------------------------------------------------
  insert into public.products (
    id,
    brand,
    name,
    sku,
    size_type,
    release_date,
    description,
    is_published
  )
  select
    complete_product_id,
    'New Balance',
    'New Balance 990v6 Grey',
    'M990GL6',
    'men',
    '2022-11-04'::date,
    complete_description,
    true
  where not exists (
    select 1 from public.products p where p.id = complete_product_id
  );

  select * into strict r_product
  from public.products
  where id = complete_product_id;

  if r_product.brand is distinct from 'New Balance'
    or r_product.name is distinct from 'New Balance 990v6 Grey'
    or r_product.sku is distinct from 'M990GL6'
    or r_product.size_type is distinct from 'men'
    or r_product.release_date is distinct from '2022-11-04'::date
    or r_product.description is distinct from complete_description
    or r_product.is_published is distinct from true
  then
    raise exception
      'Task 13 seed conflict: product % exists with non-canonical data',
      complete_product_id;
  end if;

  insert into public.product_images (
    id,
    product_id,
    image_url,
    sort_order
  )
  select
    image_id,
    complete_product_id,
    image_url,
    0
  where not exists (
    select 1 from public.product_images pi where pi.id = image_id
  );

  select * into strict r_image
  from public.product_images
  where id = image_id;

  if r_image.product_id is distinct from complete_product_id
    or r_image.image_url is distinct from image_url
    or r_image.sort_order is distinct from 0
  then
    raise exception
      'Task 13 seed conflict: product_images % exists with non-canonical data',
      image_id;
  end if;

  -- Task 13 seed editorial fixture (methodology_version task13-seed-v1).
  -- Coherent with mock catalog eazyScore 88; not community or laboratory evidence.
  insert into public.eazy_assessments (
    id,
    product_id,
    look,
    comfort,
    quality,
    outfit,
    value,
    maintenance,
    material,
    details,
    collection,
    overall,
    score,
    methodology_version,
    is_current
  )
  select
    assessment_id,
    complete_product_id,
    9,  -- look
    9,  -- comfort
    9,  -- quality
    9,  -- outfit
    7,  -- value (premium retail)
    8,  -- maintenance
    9,  -- material
    9,  -- details
    9,  -- collection
    9,  -- overall
    88, -- score
    'task13-seed-v1',
    true
  where not exists (
    select 1 from public.eazy_assessments ea where ea.id = assessment_id
  );

  select * into strict r_assessment
  from public.eazy_assessments
  where id = assessment_id;

  if r_assessment.product_id is distinct from complete_product_id
    or r_assessment.look is distinct from 9
    or r_assessment.comfort is distinct from 9
    or r_assessment.quality is distinct from 9
    or r_assessment.outfit is distinct from 9
    or r_assessment.value is distinct from 7
    or r_assessment.maintenance is distinct from 8
    or r_assessment.material is distinct from 9
    or r_assessment.details is distinct from 9
    or r_assessment.collection is distinct from 9
    or r_assessment.overall is distinct from 9
    or r_assessment.score is distinct from 88
    or r_assessment.methodology_version is distinct from 'task13-seed-v1'
    or r_assessment.is_current is distinct from true
  then
    raise exception
      'Task 13 seed conflict: eazy_assessments % exists with non-canonical data',
      assessment_id;
  end if;

  -- Offers verified 2026-08-02 from retailer storefront JSON (USD, US sizes).
  insert into public.product_offers (
    id,
    product_id,
    website_name,
    website_link,
    size,
    size_region,
    currency,
    price,
    last_checked_at
  )
  select
    offer_kith_id,
    complete_product_id,
    'Kith',
    'https://kith.com/products/nbm990gl6',
    7.0,
    'US',
    'USD',
    200.00,
    offer_checked_at
  where not exists (
    select 1 from public.product_offers po where po.id = offer_kith_id
  );

  select * into strict r_offer
  from public.product_offers
  where id = offer_kith_id;

  if r_offer.product_id is distinct from complete_product_id
    or r_offer.website_name is distinct from 'Kith'
    or r_offer.website_link is distinct from 'https://kith.com/products/nbm990gl6'
    or r_offer.size is distinct from 7.0
    or r_offer.size_region is distinct from 'US'
    or r_offer.currency is distinct from 'USD'
    or r_offer.price is distinct from 200.00
    or r_offer.last_checked_at is distinct from offer_checked_at
  then
    raise exception
      'Task 13 seed conflict: product_offers % exists with non-canonical data',
      offer_kith_id;
  end if;

  insert into public.product_offers (
    id,
    product_id,
    website_name,
    website_link,
    size,
    size_region,
    currency,
    price,
    last_checked_at
  )
  select
    offer_sp_id,
    complete_product_id,
    'Shoe Palace',
    'https://www.shoepalace.com/products/newbalance-m990gl6-made-in-usa-990v6-mens-lifestyle-shoes-grey',
    10.0,
    'US',
    'USD',
    200.00,
    offer_checked_at
  where not exists (
    select 1 from public.product_offers po where po.id = offer_sp_id
  );

  select * into strict r_offer
  from public.product_offers
  where id = offer_sp_id;

  if r_offer.product_id is distinct from complete_product_id
    or r_offer.website_name is distinct from 'Shoe Palace'
    or r_offer.website_link is distinct from
      'https://www.shoepalace.com/products/newbalance-m990gl6-made-in-usa-990v6-mens-lifestyle-shoes-grey'
    or r_offer.size is distinct from 10.0
    or r_offer.size_region is distinct from 'US'
    or r_offer.currency is distinct from 'USD'
    or r_offer.price is distinct from 200.00
    or r_offer.last_checked_at is distinct from offer_checked_at
  then
    raise exception
      'Task 13 seed conflict: product_offers % exists with non-canonical data',
      offer_sp_id;
  end if;

  -- -------------------------------------------------------------------------
  -- Sparse product: Vans Old Skool Black White (mock catalog id 8)
  -- -------------------------------------------------------------------------
  insert into public.products (
    id,
    brand,
    name,
    sku,
    size_type,
    release_date,
    description,
    is_published
  )
  select
    sparse_product_id,
    'Vans',
    'Vans Old Skool Black White',
    'VN000D3HY28',
    'unisex',
    null,
    null,
    true
  where not exists (
    select 1 from public.products p where p.id = sparse_product_id
  );

  select * into strict r_product
  from public.products
  where id = sparse_product_id;

  if r_product.brand is distinct from 'Vans'
    or r_product.name is distinct from 'Vans Old Skool Black White'
    or r_product.sku is distinct from 'VN000D3HY28'
    or r_product.size_type is distinct from 'unisex'
    or r_product.release_date is not null
    or r_product.description is not null
    or r_product.is_published is distinct from true
  then
    raise exception
      'Task 13 seed conflict: product % exists with non-canonical data',
      sparse_product_id;
  end if;

  -- Assert trigger-created empty aggregates (seed never inserts aggregates).
  select count(*) into n
  from public.rating_aggregates
  where product_id = complete_product_id;
  if n <> 1 then
    raise exception
      'Task 13 seed: expected exactly one trigger-created rating_aggregates row for complete product (found %)',
      n;
  end if;

  select count(*) into n
  from public.rating_aggregates
  where product_id = sparse_product_id;
  if n <> 1 then
    raise exception
      'Task 13 seed: expected exactly one trigger-created rating_aggregates row for sparse product (found %)',
      n;
  end if;

  select * into strict r_agg
  from public.rating_aggregates
  where product_id = complete_product_id;
  if r_agg.rating_count <> 0
    or r_agg.look_avg is not null
    or r_agg.comfort_avg is not null
    or r_agg.quality_avg is not null
    or r_agg.outfit_avg is not null
    or r_agg.value_avg is not null
    or r_agg.overall_avg is not null
    or r_agg.score is not null
  then
    raise exception
      'Task 13 seed: complete product aggregate is not empty zero-count';
  end if;

  select * into strict r_agg
  from public.rating_aggregates
  where product_id = sparse_product_id;
  if r_agg.rating_count <> 0
    or r_agg.look_avg is not null
    or r_agg.comfort_avg is not null
    or r_agg.quality_avg is not null
    or r_agg.outfit_avg is not null
    or r_agg.value_avg is not null
    or r_agg.overall_avg is not null
    or r_agg.score is not null
  then
    raise exception
      'Task 13 seed: sparse product aggregate is not empty zero-count';
  end if;
end;
$task13_seed$;
