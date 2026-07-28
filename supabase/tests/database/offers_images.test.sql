-- Packet 6: product_offers / product_images checks and cascade behavior.
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(8);

insert into public.products (id, brand, name)
values (
  '66666666-6666-6666-6666-666666666661'::uuid,
  'OfferBrand',
  'Offer Image Fixture'
);

-- Negative price fails.
select throws_ok(
  $$insert into public.product_offers (
      product_id, website_name, website_link, price
    ) values (
      '66666666-6666-6666-6666-666666666661'::uuid,
      'Shop',
      'https://example.com/a',
      -1.00
    )$$,
  '23514',
  null,
  'negative offer price is rejected'
);

-- Invalid market (size_region) fails.
select throws_ok(
  $$insert into public.product_offers (
      product_id, website_name, website_link, size_region, price
    ) values (
      '66666666-6666-6666-6666-666666666661'::uuid,
      'Shop',
      'https://example.com/b',
      'EU',
      10.00
    )$$,
  '23514',
  null,
  'invalid size_region is rejected'
);

-- Invalid currency fails.
select throws_ok(
  $$insert into public.product_offers (
      product_id, website_name, website_link, currency, price
    ) values (
      '66666666-6666-6666-6666-666666666661'::uuid,
      'Shop',
      'https://example.com/c',
      'EUR',
      10.00
    )$$,
  '23514',
  null,
  'invalid currency is rejected'
);

-- Valid offer + image, then unique sort_order conflict.
select lives_ok(
  $$insert into public.product_offers (
      product_id, website_name, website_link, size, size_region, currency, price
    ) values (
      '66666666-6666-6666-6666-666666666661'::uuid,
      'Shop',
      'https://example.com/ok',
      10.0,
      'US',
      'USD',
      120.00
    )$$,
  'valid US/USD offer insert succeeds'
);

select lives_ok(
  $$insert into public.product_images (product_id, image_url, sort_order)
    values (
      '66666666-6666-6666-6666-666666666661'::uuid,
      'https://example.com/img-0.png',
      0
    )$$,
  'first image sort_order insert succeeds'
);

select throws_ok(
  $$insert into public.product_images (product_id, image_url, sort_order)
    values (
      '66666666-6666-6666-6666-666666666661'::uuid,
      'https://example.com/img-dup.png',
      0
    )$$,
  '23505',
  null,
  'duplicate (product_id, sort_order) is rejected'
);

insert into public.product_images (product_id, image_url, sort_order)
values (
  '66666666-6666-6666-6666-666666666661'::uuid,
  'https://example.com/img-1.png',
  1
);

-- Cascades: deleting the product removes offers and images.
select lives_ok(
  $$delete from public.products
    where id = '66666666-6666-6666-6666-666666666661'::uuid$$,
  'product delete cascades related offers/images'
);

select ok(
  (
    select
      (
        select count(*)::int
        from public.product_offers
        where product_id = '66666666-6666-6666-6666-666666666661'::uuid
      ) = 0
      and (
        select count(*)::int
        from public.product_images
        where product_id = '66666666-6666-6666-6666-666666666661'::uuid
      ) = 0
      and (
        select count(*)::int
        from public.rating_aggregates
        where product_id = '66666666-6666-6666-6666-666666666661'::uuid
      ) = 0
  ),
  'product delete removes offers, images, and aggregate rows'
);

select * from finish();
rollback;
