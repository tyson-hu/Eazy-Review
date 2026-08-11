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
  offer_finish_line_id constant uuid := 'a1000000-0000-4000-8000-000000000031';
  offer_dicks_id constant uuid := 'a1000000-0000-4000-8000-000000000032';
  image_url constant text :=
    'https://raw.githubusercontent.com/tyson-hu/Eazy-Review/470be6a710642a98aceea59dc67d6d908029bc0a/assets/images/products/product-05-air-force-1-white.png';
  complete_description constant text :=
    'The all-white staple Air Force 1 Low.';
  offer_checked_at constant timestamptz := '2026-08-03T16:17:14Z';
  r_product public.products%rowtype;
  r_image public.product_images%rowtype;
  r_assessment public.eazy_assessments%rowtype;
  r_offer public.product_offers%rowtype;
  r_agg public.rating_aggregates%rowtype;
  n int;
begin
  -- -------------------------------------------------------------------------
  -- Complete product: Nike Air Force 1 Low White (mock catalog id 5 / CW2288-111)
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
    'Nike',
    'Nike Air Force 1 Low White',
    'CW2288-111',
    'men',
    '2020-07-15'::date,
    complete_description,
    true
  where not exists (
    select 1 from public.products p where p.id = complete_product_id
  );

  select * into strict r_product
  from public.products
  where id = complete_product_id;

  if r_product.brand is distinct from 'Nike'
    or r_product.name is distinct from 'Nike Air Force 1 Low White'
    or r_product.sku is distinct from 'CW2288-111'
    or r_product.size_type is distinct from 'men'
    or r_product.release_date is distinct from '2020-07-15'::date
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

  -- sneaker-10-v1 editorial fixture (deliberate values; not remapped from
  -- retired quality/details/overall fields). Dimensions sum to 79 -> score 79.
  -- Care (maintenance)=7 is intentionally below the rest. Resale and
  -- Acquisition Ease are deliberate fixture values for the rubric, not
  -- invented from old quality/overall.
  insert into public.eazy_assessments (
    id,
    product_id,
    look,
    outfit,
    material,
    craftsmanship,
    maintenance,
    comfort,
    collection,
    value,
    resale_potential,
    acquisition_ease,
    score,
    methodology_version,
    is_current
  )
  select
    assessment_id,
    complete_product_id,
    8.0,  -- look / Appearance
    8.0,  -- outfit / Styling
    8.0,  -- material / Materials
    8.0,  -- craftsmanship
    7.0,  -- maintenance / Care
    8.0,  -- comfort
    8.0,  -- collection / Collectibility
    8.0,  -- value / Product Value
    8.0,  -- resale_potential (deliberate fixture)
    8.0,  -- acquisition_ease (deliberate fixture)
    79,   -- derived; trigger recomputes if dimensions change
    'sneaker-10-v1',
    true
  where not exists (
    select 1 from public.eazy_assessments ea where ea.id = assessment_id
  );

  select * into strict r_assessment
  from public.eazy_assessments
  where id = assessment_id;

  if r_assessment.product_id is distinct from complete_product_id
    or r_assessment.look is distinct from 8.0
    or r_assessment.outfit is distinct from 8.0
    or r_assessment.material is distinct from 8.0
    or r_assessment.craftsmanship is distinct from 8.0
    or r_assessment.maintenance is distinct from 7.0
    or r_assessment.comfort is distinct from 8.0
    or r_assessment.collection is distinct from 8.0
    or r_assessment.value is distinct from 8.0
    or r_assessment.resale_potential is distinct from 8.0
    or r_assessment.acquisition_ease is distinct from 8.0
    or r_assessment.score is distinct from 79
    or r_assessment.methodology_version is distinct from 'sneaker-10-v1'
    or r_assessment.is_current is distinct from true
  then
    raise exception
      'Task 13 seed conflict: eazy_assessments % exists with non-canonical data',
      assessment_id;
  end if;

  -- Offers verified 2026-08-03 from in-stock US retailer product pages.
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
    offer_finish_line_id,
    complete_product_id,
    'Finish Line',
    'https://www.finishline.com/pdp/mens-nike-air-force-1-07-casual-shoes/prod2767626/CW2288/111',
    10.0,
    'US',
    'USD',
    115.00,
    offer_checked_at
  where not exists (
    select 1 from public.product_offers po where po.id = offer_finish_line_id
  );

  select * into strict r_offer
  from public.product_offers
  where id = offer_finish_line_id;

  if r_offer.product_id is distinct from complete_product_id
    or r_offer.website_name is distinct from 'Finish Line'
    or r_offer.website_link is distinct from
      'https://www.finishline.com/pdp/mens-nike-air-force-1-07-casual-shoes/prod2767626/CW2288/111'
    or r_offer.size is distinct from 10.0
    or r_offer.size_region is distinct from 'US'
    or r_offer.currency is distinct from 'USD'
    or r_offer.price is distinct from 115.00
    or r_offer.last_checked_at is distinct from offer_checked_at
  then
    raise exception
      'Task 13 seed conflict: product_offers % exists with non-canonical data',
      offer_finish_line_id;
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
    offer_dicks_id,
    complete_product_id,
    'DICK''S Sporting Goods',
    'https://www.dickssportinggoods.com/p/nike-mens-air-force-1-07-shoes-16nikmrfrc1grywhtlfs/16nikmrfrc1grywhtlfs?color=White%2FWhite',
    10.0,
    'US',
    'USD',
    114.99,
    offer_checked_at
  where not exists (
    select 1 from public.product_offers po where po.id = offer_dicks_id
  );

  select * into strict r_offer
  from public.product_offers
  where id = offer_dicks_id;

  if r_offer.product_id is distinct from complete_product_id
    or r_offer.website_name is distinct from 'DICK''S Sporting Goods'
    or r_offer.website_link is distinct from
      'https://www.dickssportinggoods.com/p/nike-mens-air-force-1-07-shoes-16nikmrfrc1grywhtlfs/16nikmrfrc1grywhtlfs?color=White%2FWhite'
    or r_offer.size is distinct from 10.0
    or r_offer.size_region is distinct from 'US'
    or r_offer.currency is distinct from 'USD'
    or r_offer.price is distinct from 114.99
    or r_offer.last_checked_at is distinct from offer_checked_at
  then
    raise exception
      'Task 13 seed conflict: product_offers % exists with non-canonical data',
      offer_dicks_id;
  end if;

  -- -------------------------------------------------------------------------
  -- Sparse product: Adidas Samba OG Cloud White Core Black (mock catalog id 7)
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
    'Adidas',
    'Adidas Samba OG Cloud White Core Black',
    'B75806',
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

  if r_product.brand is distinct from 'Adidas'
    or r_product.name is distinct from 'Adidas Samba OG Cloud White Core Black'
    or r_product.sku is distinct from 'B75806'
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
    or r_agg.outfit_avg is not null
    or r_agg.material_avg is not null
    or r_agg.craftsmanship_avg is not null
    or r_agg.maintenance_avg is not null
    or r_agg.comfort_avg is not null
    or r_agg.collection_avg is not null
    or r_agg.value_avg is not null
    or r_agg.resale_potential_avg is not null
    or r_agg.acquisition_ease_avg is not null
    or r_agg.score is not null
    or r_agg.methodology_version is not null
  then
    raise exception
      'Task 13 seed: complete product aggregate is not empty zero-count';
  end if;

  select * into strict r_agg
  from public.rating_aggregates
  where product_id = sparse_product_id;
  if r_agg.rating_count <> 0
    or r_agg.look_avg is not null
    or r_agg.outfit_avg is not null
    or r_agg.material_avg is not null
    or r_agg.craftsmanship_avg is not null
    or r_agg.maintenance_avg is not null
    or r_agg.comfort_avg is not null
    or r_agg.collection_avg is not null
    or r_agg.value_avg is not null
    or r_agg.resale_potential_avg is not null
    or r_agg.acquisition_ease_avg is not null
    or r_agg.score is not null
    or r_agg.methodology_version is not null
  then
    raise exception
      'Task 13 seed: sparse product aggregate is not empty zero-count';
  end if;
end;
$task13_seed$;
