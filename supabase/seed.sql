-- Catalog seed: deterministic published products (Task 13 fixtures + the
-- 2026-09-02 catalog extension). Idempotent for same-database reapplication:
-- insert-if-absent, then assert any existing seeded row exactly matches the
-- canonical values below. Never writes rating_aggregates (product insert
-- trigger creates empty rows). Never creates auth.users, profiles, or
-- user_ratings. Single DO block (no outer COMMIT) so the file can re-run
-- inside a test transaction without breaking the outer transaction boundary.
--
-- Data provenance
-- - Products 1–2 are the unchanged Task 13 fixtures (complete Air Force 1 +
--   sparse Samba); their ids, values, image URL, and offers are verbatim.
-- - Products 3–27: metadata (brand, title, style code, gender, release date,
--   colorway, retail price) from StockX via the KicksDB standard API,
--   fetched 2026-09-02T23:35Z, matched by exact style code. Descriptions are
--   a fixed factual sentence built from those traits, not StockX copy.
-- - Eazy assessments for products 3–27 are the maintainer's official
--   sneaker-10-v1 dimensions (0–10 half-steps) supplied by CSV on 2026-09-02.
--   score and methodology_version are trigger-derived and never seeded.
-- - Offers for products 3–27 are StockX lowest asks (USD, US market) for up
--   to three common sizes; last_checked_at is the KicksDB variant refresh
--   time. Links are canonical StockX product pages.
-- - Images for products 3–27 are StockX product photos (840x600 JPEG)
--   committed under supabase/seed-assets/products at the pinned commit in
--   the URLs (merge with a merge commit, never squash, to keep it reachable).
--   Personal-study use directed by the maintainer on 2026-09-02.
--
-- Deterministic ids live under a1000000-0000-4000-8000-. Task 13 rows keep
-- 0000000000NN; extension rows use 0000TT00KKNN (TT: 10 product, 20 image,
-- 30 assessment, 40 offer; KK product index 03–27; NN item index).

do $catalog_seed$
declare
  catalog constant jsonb := $catalog$[
    {
      "id": "a1000000-0000-4000-8000-000000000001",
      "brand": "Nike",
      "name": "Nike Air Force 1 Low White",
      "sku": "CW2288-111",
      "size_type": "men",
      "release_date": "2020-07-15",
      "description": "The all-white staple Air Force 1 Low.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000000000011","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/470be6a710642a98aceea59dc67d6d908029bc0a/assets/images/products/product-05-air-force-1-white.png","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000000000021","look":8,"outfit":8,"material":8,"craftsmanship":8,"maintenance":7,"comfort":8,"collection":8,"value":8,"resale_potential":8,"acquisition_ease":8},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000000000031","website_name":"Finish Line","website_link":"https://www.finishline.com/pdp/mens-nike-air-force-1-07-casual-shoes/prod2767626/CW2288/111","size":10,"size_region":"US","currency":"USD","price":115,"last_checked_at":"2026-08-03T16:17:14Z"},
        {"id":"a1000000-0000-4000-8000-000000000032","website_name":"DICK'S Sporting Goods","website_link":"https://www.dickssportinggoods.com/p/nike-mens-air-force-1-07-shoes-16nikmrfrc1grywhtlfs/16nikmrfrc1grywhtlfs?color=White%2FWhite","size":10,"size_region":"US","currency":"USD","price":114.99,"last_checked_at":"2026-08-03T16:17:14Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000000000002",
      "brand": "Adidas",
      "name": "Adidas Samba OG Cloud White Core Black",
      "sku": "B75806",
      "size_type": "unisex",
      "release_date": null,
      "description": null,
      "images": [],
      "offers": []
    },
    {
      "id": "a1000000-0000-4000-8000-000010000300",
      "brand": "Jordan",
      "name": "Jordan 4 Retro OG Nigel Sylvester Brick After Brick",
      "sku": "IQ8055-100",
      "size_type": "men",
      "release_date": "2026-05-22",
      "description": "Jordan 4 Retro OG Nigel Sylvester Brick After Brick in Sail/Cinnabar/Anthracite/Muslin. Released May 22, 2026 at $230 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000301","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/iq8055-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000301","look":9,"outfit":9,"material":8.5,"craftsmanship":8,"maintenance":7,"comfort":7.5,"collection":8,"value":9,"resale_potential":7,"acquisition_ease":7},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000301","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-nigel-sylvester-brick-after-brick","size":10,"size_region":"US","currency":"USD","price":223,"last_checked_at":"2026-09-02T00:01:57.953106Z"},
        {"id":"a1000000-0000-4000-8000-000040000302","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-nigel-sylvester-brick-after-brick","size":9,"size_region":"US","currency":"USD","price":231,"last_checked_at":"2026-09-02T00:01:57.9531Z"},
        {"id":"a1000000-0000-4000-8000-000040000303","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-nigel-sylvester-brick-after-brick","size":11,"size_region":"US","currency":"USD","price":265,"last_checked_at":"2026-09-02T00:01:57.953111Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010000400",
      "brand": "Jordan",
      "name": "Jordan 1 Retro High OG SP Fragment x Union LA Sport Royal",
      "sku": "IO7847-001",
      "size_type": "men",
      "release_date": "2026-02-14",
      "description": "Jordan 1 Retro High OG SP Fragment x Union LA Sport Royal in Black/Navy/Sport Royal/Sail. Released February 14, 2026 at $205 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000401","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/io7847-001.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000401","look":9.5,"outfit":9,"material":9,"craftsmanship":8.5,"maintenance":8.5,"comfort":8,"collection":9.5,"value":9,"resale_potential":8,"acquisition_ease":7},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000401","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-sp-fragment-x-union-la-sport-royal","size":10,"size_region":"US","currency":"USD","price":340,"last_checked_at":"2026-09-02T00:16:56.395935Z"},
        {"id":"a1000000-0000-4000-8000-000040000402","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-sp-fragment-x-union-la-sport-royal","size":9,"size_region":"US","currency":"USD","price":342,"last_checked_at":"2026-09-02T00:16:56.395888Z"},
        {"id":"a1000000-0000-4000-8000-000040000403","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-sp-fragment-x-union-la-sport-royal","size":11,"size_region":"US","currency":"USD","price":335,"last_checked_at":"2026-09-02T00:16:56.395976Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010000500",
      "brand": "Jordan",
      "name": "Air Jordan 4 Retro OG SP Nigel Sylvester Brick by Brick",
      "sku": "HF4340-800",
      "size_type": "men",
      "release_date": "2025-03-14",
      "description": "Air Jordan 4 Retro OG SP Nigel Sylvester Brick by Brick in Firewood Orange/Sail-Cinnabar. Released March 14, 2025 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000501","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/hf4340-800.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000501","look":9,"outfit":8,"material":9,"craftsmanship":8,"maintenance":7,"comfort":8,"collection":9,"value":9,"resale_potential":9,"acquisition_ease":6},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000501","website_name":"StockX","website_link":"https://stockx.com/air-air-jordan-4-retro-og-sp-nigel-sylvester-bike-air-firewood-orange","size":10,"size_region":"US","currency":"USD","price":594,"last_checked_at":"2026-09-02T00:13:21.636288Z"},
        {"id":"a1000000-0000-4000-8000-000040000502","website_name":"StockX","website_link":"https://stockx.com/air-air-jordan-4-retro-og-sp-nigel-sylvester-bike-air-firewood-orange","size":9,"size_region":"US","currency":"USD","price":543,"last_checked_at":"2026-09-02T00:13:21.636278Z"},
        {"id":"a1000000-0000-4000-8000-000040000503","website_name":"StockX","website_link":"https://stockx.com/air-air-jordan-4-retro-og-sp-nigel-sylvester-bike-air-firewood-orange","size":11,"size_region":"US","currency":"USD","price":635,"last_checked_at":"2026-09-02T00:13:21.636294Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010000600",
      "brand": "Jordan",
      "name": "Jordan 4 Retro Black Cat (2025)",
      "sku": "FV5029-010",
      "size_type": "men",
      "release_date": "2025-11-28",
      "description": "Jordan 4 Retro Black Cat (2025) in Black/Black/Light Graphite. Released November 28, 2025 at $220 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000601","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/fv5029-010.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000601","look":9.5,"outfit":9,"material":8.5,"craftsmanship":8,"maintenance":8,"comfort":8,"collection":8,"value":9,"resale_potential":9,"acquisition_ease":7},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000601","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-black-cat-2025","size":10,"size_region":"US","currency":"USD","price":300,"last_checked_at":"2026-09-02T00:05:56.288616Z"},
        {"id":"a1000000-0000-4000-8000-000040000602","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-black-cat-2025","size":9,"size_region":"US","currency":"USD","price":297,"last_checked_at":"2026-09-02T00:05:56.288577Z"},
        {"id":"a1000000-0000-4000-8000-000040000603","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-black-cat-2025","size":11,"size_region":"US","currency":"USD","price":309,"last_checked_at":"2026-09-02T00:05:56.288655Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010000700",
      "brand": "Jordan",
      "name": "Jordan 4 Retro Travis Scott Cactus Jack",
      "sku": "308497-406",
      "size_type": "men",
      "release_date": "2018-06-09",
      "description": "Jordan 4 Retro Travis Scott Cactus Jack in University Blue/Black-Varsity Red. Released June 9, 2018 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000701","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/308497-406.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000701","look":10,"outfit":8,"material":10,"craftsmanship":9,"maintenance":7,"comfort":7.5,"collection":10,"value":9.5,"resale_potential":10,"acquisition_ease":3},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000701","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-travis-scott-cactus-jack","size":10,"size_region":"US","currency":"USD","price":768,"last_checked_at":"2026-09-02T00:05:35.920965Z"},
        {"id":"a1000000-0000-4000-8000-000040000702","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-travis-scott-cactus-jack","size":9,"size_region":"US","currency":"USD","price":760,"last_checked_at":"2026-09-02T00:05:35.920933Z"},
        {"id":"a1000000-0000-4000-8000-000040000703","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-travis-scott-cactus-jack","size":11,"size_region":"US","currency":"USD","price":824,"last_checked_at":"2026-09-02T00:05:35.920996Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010000800",
      "brand": "Jordan",
      "name": "Jordan 1 Retro High Trophy Room Chicago",
      "sku": "DA2728-100",
      "size_type": "men",
      "release_date": "2021-02-10",
      "description": "Jordan 1 Retro High Trophy Room Chicago in White/Varsity Red-Sail-Black. Released February 10, 2021 at $190 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000801","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/da2728-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000801","look":10,"outfit":9,"material":9,"craftsmanship":9,"maintenance":7,"comfort":8,"collection":10,"value":10,"resale_potential":10,"acquisition_ease":2},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000801","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-trophy-room-chicago","size":10,"size_region":"US","currency":"USD","price":689,"last_checked_at":"2026-09-02T00:15:28.826675Z"},
        {"id":"a1000000-0000-4000-8000-000040000802","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-trophy-room-chicago","size":9,"size_region":"US","currency":"USD","price":899,"last_checked_at":"2026-09-02T00:15:28.826646Z"},
        {"id":"a1000000-0000-4000-8000-000040000803","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-trophy-room-chicago","size":11,"size_region":"US","currency":"USD","price":419,"last_checked_at":"2026-09-02T00:15:28.826701Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010000900",
      "brand": "Jordan",
      "name": "Jordan 1 Retro Low OG Nigel Sylvester Better With Time",
      "sku": "IB8958-001",
      "size_type": "men",
      "release_date": "2025-08-16",
      "description": "Jordan 1 Retro Low OG Nigel Sylvester Better With Time in Black/Muslin/Varsity Red. Released August 16, 2025 at $150 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020000901","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/ib8958-001.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030000901","look":8,"outfit":8,"material":8,"craftsmanship":9,"maintenance":9,"comfort":7.5,"collection":9,"value":9,"resale_potential":8,"acquisition_ease":7},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040000901","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-low-og-nigel-sylvester-better-with-time","size":10,"size_region":"US","currency":"USD","price":245,"last_checked_at":"2026-09-02T00:12:26.59245Z"},
        {"id":"a1000000-0000-4000-8000-000040000902","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-low-og-nigel-sylvester-better-with-time","size":9,"size_region":"US","currency":"USD","price":260,"last_checked_at":"2026-09-02T00:12:26.592444Z"},
        {"id":"a1000000-0000-4000-8000-000040000903","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-low-og-nigel-sylvester-better-with-time","size":11,"size_region":"US","currency":"USD","price":290,"last_checked_at":"2026-09-02T00:12:26.592457Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001000",
      "brand": "Jordan",
      "name": "Jordan 4 Retro OG SP Undefeated (2025)",
      "sku": "IB1519-200",
      "size_type": "men",
      "release_date": "2025-08-28",
      "description": "Jordan 4 Retro OG SP Undefeated (2025) in Deep Green/Clementine/Black/Sail. Released August 28, 2025 at $230 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001001","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/ib1519-200.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001001","look":9,"outfit":8,"material":9,"craftsmanship":8,"maintenance":7.5,"comfort":7.5,"collection":10,"value":9.5,"resale_potential":9,"acquisition_ease":4},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001001","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-sp-undefeated-2025","size":10,"size_region":"US","currency":"USD","price":304,"last_checked_at":"2026-09-02T00:24:36.256868Z"},
        {"id":"a1000000-0000-4000-8000-000040001002","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-sp-undefeated-2025","size":9,"size_region":"US","currency":"USD","price":275,"last_checked_at":"2026-09-02T00:24:36.256791Z"},
        {"id":"a1000000-0000-4000-8000-000040001003","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-sp-undefeated-2025","size":11,"size_region":"US","currency":"USD","price":275,"last_checked_at":"2026-09-02T00:24:36.256936Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001100",
      "brand": "Jordan",
      "name": "Jordan 5 Retro Grape (2025)",
      "sku": "HQ7978-100",
      "size_type": "men",
      "release_date": "2025-06-21",
      "description": "Jordan 5 Retro Grape (2025) in White/Grape Ice-New Emerald. Released June 21, 2025 at $215 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001101","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/hq7978-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001101","look":8,"outfit":7,"material":8,"craftsmanship":8.5,"maintenance":6,"comfort":7,"collection":6,"value":9,"resale_potential":6,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001101","website_name":"StockX","website_link":"https://stockx.com/air-jordan-5-retro-grape-2025","size":10,"size_region":"US","currency":"USD","price":172,"last_checked_at":"2026-09-02T00:15:40.89959Z"},
        {"id":"a1000000-0000-4000-8000-000040001102","website_name":"StockX","website_link":"https://stockx.com/air-jordan-5-retro-grape-2025","size":9,"size_region":"US","currency":"USD","price":166,"last_checked_at":"2026-09-02T00:15:40.899551Z"},
        {"id":"a1000000-0000-4000-8000-000040001103","website_name":"StockX","website_link":"https://stockx.com/air-jordan-5-retro-grape-2025","size":11,"size_region":"US","currency":"USD","price":158,"last_checked_at":"2026-09-02T00:15:40.89963Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001200",
      "brand": "Jordan",
      "name": "Jordan 14 Retro Ferrari (2025)",
      "sku": "IF5015-600",
      "size_type": "men",
      "release_date": "2025-06-14",
      "description": "Jordan 14 Retro Ferrari (2025) in Challenge Red/Black-Vibrant Yellow-Anthracite. Released June 14, 2025 at $215 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001201","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/if5015-600.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001201","look":9,"outfit":7,"material":9,"craftsmanship":8,"maintenance":5,"comfort":8,"collection":9,"value":9,"resale_potential":8,"acquisition_ease":7},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001201","website_name":"StockX","website_link":"https://stockx.com/air-jordan-14-retro-ferrari-2025","size":10,"size_region":"US","currency":"USD","price":356,"last_checked_at":"2026-09-02T00:06:18.12768Z"},
        {"id":"a1000000-0000-4000-8000-000040001202","website_name":"StockX","website_link":"https://stockx.com/air-jordan-14-retro-ferrari-2025","size":9,"size_region":"US","currency":"USD","price":300,"last_checked_at":"2026-09-02T00:06:18.127674Z"},
        {"id":"a1000000-0000-4000-8000-000040001203","website_name":"StockX","website_link":"https://stockx.com/air-jordan-14-retro-ferrari-2025","size":11,"size_region":"US","currency":"USD","price":315,"last_checked_at":"2026-09-02T00:06:18.127685Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001300",
      "brand": "Jordan",
      "name": "Jordan 3 Retro Seoul 2.0",
      "sku": "IB1482-100",
      "size_type": "men",
      "release_date": "2025-05-15",
      "description": "Jordan 3 Retro Seoul 2.0 in White/Black/Sport Royal/Challenge Red/Pale Vanilla/College Grey. Released May 15, 2025 at $200 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001301","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/ib1482-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001301","look":8.5,"outfit":9,"material":8,"craftsmanship":8,"maintenance":7,"comfort":8.5,"collection":6,"value":9,"resale_potential":6,"acquisition_ease":8.5},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001301","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-seoul-20","size":10,"size_region":"US","currency":"USD","price":160,"last_checked_at":"2026-09-02T00:08:00.565799Z"},
        {"id":"a1000000-0000-4000-8000-000040001302","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-seoul-20","size":9,"size_region":"US","currency":"USD","price":159,"last_checked_at":"2026-09-02T00:08:00.565748Z"},
        {"id":"a1000000-0000-4000-8000-000040001303","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-seoul-20","size":11,"size_region":"US","currency":"USD","price":155,"last_checked_at":"2026-09-02T00:08:00.565842Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001400",
      "brand": "Jordan",
      "name": "Jordan 4 Retro White Cement (2025)",
      "sku": "FV5029-100",
      "size_type": "men",
      "release_date": "2025-05-24",
      "description": "Jordan 4 Retro White Cement (2025) in Summit White/Fire Red-Tech Grey-Black. Released May 24, 2025 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001401","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/fv5029-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001401","look":9.5,"outfit":9.5,"material":9,"craftsmanship":8,"maintenance":8,"comfort":7.5,"collection":8,"value":9,"resale_potential":7,"acquisition_ease":9},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001401","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-white-cement-2025","size":10,"size_region":"US","currency":"USD","price":239,"last_checked_at":"2026-09-02T00:29:16.318919Z"},
        {"id":"a1000000-0000-4000-8000-000040001402","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-white-cement-2025","size":9,"size_region":"US","currency":"USD","price":243,"last_checked_at":"2026-09-02T00:29:16.318914Z"},
        {"id":"a1000000-0000-4000-8000-000040001403","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-white-cement-2025","size":11,"size_region":"US","currency":"USD","price":235,"last_checked_at":"2026-09-02T00:29:16.318925Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001500",
      "brand": "Jordan",
      "name": "Jordan 1 Retro High OG UNC Reimagined",
      "sku": "DZ5485-402",
      "size_type": "men",
      "release_date": "2025-05-10",
      "description": "Jordan 1 Retro High OG UNC Reimagined in Dark Powder Blue/Dark Powder Blue-Sail. Released May 10, 2025 at $180 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001501","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/dz5485-402.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001501","look":7,"outfit":9,"material":8,"craftsmanship":8,"maintenance":6,"comfort":7.5,"collection":8,"value":9,"resale_potential":4,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001501","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-unc-reimagined","size":10,"size_region":"US","currency":"USD","price":99,"last_checked_at":"2026-09-02T00:15:55.048415Z"},
        {"id":"a1000000-0000-4000-8000-000040001502","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-unc-reimagined","size":9,"size_region":"US","currency":"USD","price":87,"last_checked_at":"2026-09-02T00:15:55.048408Z"},
        {"id":"a1000000-0000-4000-8000-000040001503","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-unc-reimagined","size":11,"size_region":"US","currency":"USD","price":107,"last_checked_at":"2026-09-02T00:15:55.048421Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001600",
      "brand": "Nike",
      "name": "Nike Air Max 1 '87 SP Supreme Varsity Purple",
      "sku": "HF8813-500",
      "size_type": "men",
      "release_date": "2025-03-20",
      "description": "Nike Air Max 1 '87 SP Supreme Varsity Purple in Varsity Purple/White/Varsity Purple. Released March 20, 2025 at $170 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001601","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/hf8813-500.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001601","look":9,"outfit":7,"material":8,"craftsmanship":9,"maintenance":9,"comfort":8,"collection":8,"value":8,"resale_potential":8,"acquisition_ease":6},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001601","website_name":"StockX","website_link":"https://stockx.com/nike-air-max-1-87-sp-supreme-varsity-purple","size":10,"size_region":"US","currency":"USD","price":171,"last_checked_at":"2026-09-02T00:08:51.422935Z"},
        {"id":"a1000000-0000-4000-8000-000040001602","website_name":"StockX","website_link":"https://stockx.com/nike-air-max-1-87-sp-supreme-varsity-purple","size":9,"size_region":"US","currency":"USD","price":170,"last_checked_at":"2026-09-02T00:08:51.422897Z"},
        {"id":"a1000000-0000-4000-8000-000040001603","website_name":"StockX","website_link":"https://stockx.com/nike-air-max-1-87-sp-supreme-varsity-purple","size":11,"size_region":"US","currency":"USD","price":179,"last_checked_at":"2026-09-02T00:08:51.422976Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001700",
      "brand": "Jordan",
      "name": "Jordan 1 Retro High OG SP Union LA Chicago Shadow",
      "sku": "HV8563-600",
      "size_type": "men",
      "release_date": "2025-02-27",
      "description": "Jordan 1 Retro High OG SP Union LA Chicago Shadow in Varsity Red/Black-Sail-Shadow Grey-Muslin. Released February 27, 2025 at $200 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001701","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/hv8563-600.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001701","look":9,"outfit":9,"material":8,"craftsmanship":8,"maintenance":9,"comfort":8,"collection":9,"value":9,"resale_potential":9,"acquisition_ease":7.5},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001701","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-sp-union-la-chicago-shadow","size":10,"size_region":"US","currency":"USD","price":180,"last_checked_at":"2026-09-02T00:12:32.905228Z"},
        {"id":"a1000000-0000-4000-8000-000040001702","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-sp-union-la-chicago-shadow","size":9,"size_region":"US","currency":"USD","price":170,"last_checked_at":"2026-09-02T00:12:32.905121Z"},
        {"id":"a1000000-0000-4000-8000-000040001703","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-sp-union-la-chicago-shadow","size":11,"size_region":"US","currency":"USD","price":184,"last_checked_at":"2026-09-02T00:12:32.905498Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001800",
      "brand": "Jordan",
      "name": "Jordan 4 Retro SB Navy",
      "sku": "DR5415-100",
      "size_type": "men",
      "release_date": "2025-03-18",
      "description": "Jordan 4 Retro SB Navy in Summit White/White/Navy/Neutral Grey/Gum Yellow/Varsity Red. Released March 18, 2025 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001801","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/dr5415-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001801","look":9,"outfit":9,"material":9,"craftsmanship":8,"maintenance":7,"comfort":8,"collection":8,"value":6,"resale_potential":8,"acquisition_ease":6},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001801","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-sb-navy","size":10,"size_region":"US","currency":"USD","price":223,"last_checked_at":"2026-09-02T00:10:38.931769Z"},
        {"id":"a1000000-0000-4000-8000-000040001802","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-sb-navy","size":9,"size_region":"US","currency":"USD","price":190,"last_checked_at":"2026-09-02T00:10:38.931719Z"},
        {"id":"a1000000-0000-4000-8000-000040001803","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-sb-navy","size":11,"size_region":"US","currency":"USD","price":221,"last_checked_at":"2026-09-02T00:10:38.931807Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010001900",
      "brand": "Jordan",
      "name": "Jordan 3 Retro OG SP A Ma Maniére Diffused Blue",
      "sku": "HV8571-100",
      "size_type": "men",
      "release_date": "2025-03-29",
      "description": "Jordan 3 Retro OG SP A Ma Maniére Diffused Blue in White/Medium Grey-Violet Ore. Released March 29, 2025 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020001901","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/hv8571-100.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030001901","look":9,"outfit":8,"material":9,"craftsmanship":9,"maintenance":8,"comfort":8,"collection":7,"value":9,"resale_potential":7,"acquisition_ease":8},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040001901","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-og-sp-diffused-blue","size":10,"size_region":"US","currency":"USD","price":186,"last_checked_at":"2026-09-02T00:20:20.553214Z"},
        {"id":"a1000000-0000-4000-8000-000040001902","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-og-sp-diffused-blue","size":9,"size_region":"US","currency":"USD","price":166,"last_checked_at":"2026-09-02T00:20:20.55317Z"},
        {"id":"a1000000-0000-4000-8000-000040001903","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-og-sp-diffused-blue","size":11,"size_region":"US","currency":"USD","price":184,"last_checked_at":"2026-09-02T00:20:20.553253Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002000",
      "brand": "Jordan",
      "name": "Jordan 3 Retro Lucky Shorts",
      "sku": "CT8532-101",
      "size_type": "men",
      "release_date": "2025-02-22",
      "description": "Jordan 3 Retro Lucky Shorts in Summit White/Hydrogen Blue-Legend Blue-Photon Dust-Pure Platinum-Sail. Released February 22, 2025 at $200 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002001","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/ct8532-101.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002001","look":9,"outfit":8,"material":8,"craftsmanship":8,"maintenance":8,"comfort":8,"collection":7,"value":6,"resale_potential":4,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002001","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-lucky-shorts","size":10,"size_region":"US","currency":"USD","price":145,"last_checked_at":"2026-09-02T00:21:01.584562Z"},
        {"id":"a1000000-0000-4000-8000-000040002002","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-lucky-shorts","size":9,"size_region":"US","currency":"USD","price":145,"last_checked_at":"2026-09-02T00:21:01.584521Z"},
        {"id":"a1000000-0000-4000-8000-000040002003","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-lucky-shorts","size":11,"size_region":"US","currency":"USD","price":129,"last_checked_at":"2026-09-02T00:21:01.584605Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002100",
      "brand": "Jordan",
      "name": "Jordan 1 Retro High '85 OG Bred (2025)",
      "sku": "HV6674-067",
      "size_type": "men",
      "release_date": "2025-02-14",
      "description": "Jordan 1 Retro High '85 OG Bred (2025) in Black/Multi-Color. Released February 14, 2025 at $250 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002101","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/hv6674-067.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002101","look":10,"outfit":8,"material":8,"craftsmanship":9,"maintenance":10,"comfort":8,"collection":10,"value":9,"resale_potential":10,"acquisition_ease":0},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002101","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-85-bred","size":10,"size_region":"US","currency":"USD","price":356,"last_checked_at":"2026-09-02T00:25:14.495932Z"},
        {"id":"a1000000-0000-4000-8000-000040002102","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-85-bred","size":9,"size_region":"US","currency":"USD","price":300,"last_checked_at":"2026-09-02T00:25:14.495926Z"},
        {"id":"a1000000-0000-4000-8000-000040002103","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-85-bred","size":11,"size_region":"US","currency":"USD","price":350,"last_checked_at":"2026-09-02T00:25:14.495937Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002200",
      "brand": "Jordan",
      "name": "Jordan 1 Retro High OG Black Toe Reimagined",
      "sku": "DZ5485-106",
      "size_type": "men",
      "release_date": "2025-02-15",
      "description": "Jordan 1 Retro High OG Black Toe Reimagined in White/Black-Varsity Red-Sail. Released February 15, 2025 at $180 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002201","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/dz5485-106.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002201","look":9,"outfit":9,"material":7,"craftsmanship":8,"maintenance":9,"comfort":7,"collection":9,"value":10,"resale_potential":1,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002201","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-black-toe-reimagined","size":10,"size_region":"US","currency":"USD","price":90,"last_checked_at":"2026-09-02T00:12:13.53948Z"},
        {"id":"a1000000-0000-4000-8000-000040002202","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-black-toe-reimagined","size":9,"size_region":"US","currency":"USD","price":101,"last_checked_at":"2026-09-02T00:12:13.539437Z"},
        {"id":"a1000000-0000-4000-8000-000040002203","website_name":"StockX","website_link":"https://stockx.com/air-jordan-1-retro-high-og-black-toe-reimagined","size":11,"size_region":"US","currency":"USD","price":95,"last_checked_at":"2026-09-02T00:12:13.539529Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002300",
      "brand": "Jordan",
      "name": "Jordan 3 Retro Black Cat (2025)",
      "sku": "CT8532-001",
      "size_type": "men",
      "release_date": "2025-01-11",
      "description": "Jordan 3 Retro Black Cat (2025) in Black/Dark Charcoal/Black. Released January 11, 2025 at $200 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002301","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/ct8532-001.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002301","look":8.5,"outfit":8.5,"material":8,"craftsmanship":8,"maintenance":7,"comfort":8,"collection":8,"value":7,"resale_potential":2,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002301","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-black-cat-2025","size":10,"size_region":"US","currency":"USD","price":293,"last_checked_at":"2026-09-02T00:17:25.201995Z"},
        {"id":"a1000000-0000-4000-8000-000040002302","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-black-cat-2025","size":9,"size_region":"US","currency":"USD","price":299,"last_checked_at":"2026-09-02T00:17:25.201956Z"},
        {"id":"a1000000-0000-4000-8000-000040002303","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-black-cat-2025","size":11,"size_region":"US","currency":"USD","price":285,"last_checked_at":"2026-09-02T00:17:25.202037Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002400",
      "brand": "Jordan",
      "name": "Jordan 4 Retro OG SP A Ma Maniére While You Were Sleeping (Women's)",
      "sku": "FZ4810-200",
      "size_type": "women",
      "release_date": "2024-09-20",
      "description": "Jordan 4 Retro OG SP A Ma Maniére While You Were Sleeping (Women's) in Fossil Stone/Metallic Pewter/Burgundy Crush. Released September 20, 2024 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002401","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/fz4810-200.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002401","look":9,"outfit":10,"material":9,"craftsmanship":7.5,"maintenance":7,"comfort":8,"collection":9,"value":10,"resale_potential":2,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002401","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-sp-a-ma-maniere-while-you-were-sleeping-womens","size":8,"size_region":"US","currency":"USD","price":272,"last_checked_at":"2026-09-02T00:19:12.494604Z"},
        {"id":"a1000000-0000-4000-8000-000040002402","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-sp-a-ma-maniere-while-you-were-sleeping-womens","size":7,"size_region":"US","currency":"USD","price":244,"last_checked_at":"2026-09-02T00:19:12.494527Z"},
        {"id":"a1000000-0000-4000-8000-000040002403","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-og-sp-a-ma-maniere-while-you-were-sleeping-womens","size":9,"size_region":"US","currency":"USD","price":255,"last_checked_at":"2026-09-02T00:19:12.494672Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002500",
      "brand": "Jordan",
      "name": "Jordan 3 Retro OG Black Cement (2024)",
      "sku": "DN3707-010",
      "size_type": "men",
      "release_date": "2024-11-23",
      "description": "Jordan 3 Retro OG Black Cement (2024) in Black/Fire Red/Cement Grey/Sail. Released November 23, 2024 at $220 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002501","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/dn3707-010.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002501","look":8,"outfit":8,"material":8,"craftsmanship":6,"maintenance":8,"comfort":8,"collection":8,"value":8,"resale_potential":0,"acquisition_ease":10},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002501","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-black-cement-2024","size":10,"size_region":"US","currency":"USD","price":218,"last_checked_at":"2026-09-02T00:06:14.872974Z"},
        {"id":"a1000000-0000-4000-8000-000040002502","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-black-cement-2024","size":9,"size_region":"US","currency":"USD","price":213,"last_checked_at":"2026-09-02T00:06:14.872969Z"},
        {"id":"a1000000-0000-4000-8000-000040002503","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-black-cement-2024","size":11,"size_region":"US","currency":"USD","price":242,"last_checked_at":"2026-09-02T00:06:14.872979Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002600",
      "brand": "Jordan",
      "name": "Jordan 3 Retro SP Nina Chanel Abney Bicoastal (Women's)",
      "sku": "FZ7974-300",
      "size_type": "women",
      "release_date": "2024-06-20",
      "description": "Jordan 3 Retro SP Nina Chanel Abney Bicoastal (Women's) in Bicoastal/Black/Malachite/Fossil. Released June 20, 2024 at $225 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002601","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/fz7974-300.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002601","look":8,"outfit":7,"material":7.5,"craftsmanship":8,"maintenance":7,"comfort":7.5,"collection":8,"value":9,"resale_potential":4,"acquisition_ease":7},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002601","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-sp-nina-chanel-abney-bicoastal-womens","size":8,"size_region":"US","currency":"USD","price":252,"last_checked_at":"2026-09-02T00:22:18.875439Z"},
        {"id":"a1000000-0000-4000-8000-000040002602","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-sp-nina-chanel-abney-bicoastal-womens","size":7,"size_region":"US","currency":"USD","price":170,"last_checked_at":"2026-09-02T00:22:18.875433Z"},
        {"id":"a1000000-0000-4000-8000-000040002603","website_name":"StockX","website_link":"https://stockx.com/air-jordan-3-retro-sp-nina-chanel-abney-bicoastal-womens","size":9,"size_region":"US","currency":"USD","price":228,"last_checked_at":"2026-09-02T00:22:18.875445Z"}
      ]
    },
    {
      "id": "a1000000-0000-4000-8000-000010002700",
      "brand": "Jordan",
      "name": "Jordan 4 Retro Military Blue (2024)",
      "sku": "FV5029-141",
      "size_type": "men",
      "release_date": "2024-05-04",
      "description": "Jordan 4 Retro Military Blue (2024) in Off-White/Military Blue/Neutral Grey. Released May 4, 2024 at $215 retail.",
      "images": [
        {"id":"a1000000-0000-4000-8000-000020002701","image_url":"https://raw.githubusercontent.com/tyson-hu/Eazy-Review/788b356109ccadf28b43a65851810aa84bdd33de/supabase/seed-assets/products/fv5029-141.jpg","sort_order":0}
      ],
      "assessment": {"id":"a1000000-0000-4000-8000-000030002701","look":9,"outfit":9,"material":8,"craftsmanship":7.5,"maintenance":7,"comfort":7.5,"collection":9,"value":8,"resale_potential":5,"acquisition_ease":8},
      "offers": [
        {"id":"a1000000-0000-4000-8000-000040002701","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-military-blue-2024","size":10,"size_region":"US","currency":"USD","price":197,"last_checked_at":"2026-09-02T00:05:45.133806Z"},
        {"id":"a1000000-0000-4000-8000-000040002702","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-military-blue-2024","size":9,"size_region":"US","currency":"USD","price":210,"last_checked_at":"2026-09-02T00:05:45.133712Z"},
        {"id":"a1000000-0000-4000-8000-000040002703","website_name":"StockX","website_link":"https://stockx.com/air-jordan-4-retro-military-blue-2024","size":11,"size_region":"US","currency":"USD","price":200,"last_checked_at":"2026-09-02T00:05:45.133872Z"}
      ]
    }
  ]$catalog$::jsonb;
  product jsonb;
  image jsonb;
  assessment jsonb;
  offer jsonb;
  seed_product_id uuid;
  r_product public.products%rowtype;
  r_image public.product_images%rowtype;
  r_assessment public.eazy_assessments%rowtype;
  r_offer public.product_offers%rowtype;
  r_agg public.rating_aggregates%rowtype;
  n int;
begin
  -- Guard the constant itself: every deterministic id and sku appears once.
  select count(*) - count(distinct e->>'id') into n
  from (
    select p from jsonb_array_elements(catalog) as p
    union all select i from jsonb_array_elements(catalog) as p,
      jsonb_array_elements(p->'images') as i
    union all select p->'assessment' from jsonb_array_elements(catalog) as p
      where p ? 'assessment'
    union all select o from jsonb_array_elements(catalog) as p,
      jsonb_array_elements(p->'offers') as o
  ) as rows(e);
  if n <> 0 then
    raise exception 'Catalog seed: duplicate deterministic id in seed data';
  end if;

  select count(*) - count(distinct p->>'sku') into n
  from jsonb_array_elements(catalog) as p;
  if n <> 0 then
    raise exception 'Catalog seed: duplicate sku in seed data';
  end if;

  for product in
    select e.value
    from jsonb_array_elements(catalog) with ordinality as e(value, ord)
    order by e.ord
  loop
    seed_product_id := (product->>'id')::uuid;

    -- -----------------------------------------------------------------------
    -- Product
    -- -----------------------------------------------------------------------
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
      seed_product_id,
      product->>'brand',
      product->>'name',
      product->>'sku',
      product->>'size_type',
      (product->>'release_date')::date,
      product->>'description',
      true
    where not exists (
      select 1 from public.products p where p.id = seed_product_id
    );

    select * into strict r_product
    from public.products
    where id = seed_product_id;

    if r_product.brand is distinct from product->>'brand'
      or r_product.name is distinct from product->>'name'
      or r_product.sku is distinct from product->>'sku'
      or r_product.size_type is distinct from product->>'size_type'
      or r_product.release_date is distinct from
        (product->>'release_date')::date
      or r_product.description is distinct from product->>'description'
      or r_product.is_published is distinct from true
    then
      raise exception
        'Catalog seed conflict: product % exists with non-canonical data',
        seed_product_id;
    end if;

    -- -----------------------------------------------------------------------
    -- Images
    -- -----------------------------------------------------------------------
    for image in
      select e.value
      from jsonb_array_elements(product->'images') with ordinality
        as e(value, ord)
      order by e.ord
    loop
      insert into public.product_images (
        id,
        product_id,
        image_url,
        sort_order
      )
      select
        (image->>'id')::uuid,
        seed_product_id,
        image->>'image_url',
        (image->>'sort_order')::int
      where not exists (
        select 1 from public.product_images pi
        where pi.id = (image->>'id')::uuid
      );

      select * into strict r_image
      from public.product_images
      where id = (image->>'id')::uuid;

      if r_image.product_id is distinct from seed_product_id
        or r_image.image_url is distinct from image->>'image_url'
        or r_image.sort_order is distinct from (image->>'sort_order')::int
      then
        raise exception
          'Catalog seed conflict: product_images % exists with non-canonical data',
          image->>'id';
      end if;
    end loop;

    -- -----------------------------------------------------------------------
    -- Current Eazy assessment (sneaker-10-v1 dimensions only; the
    -- eazy_assessments_derive_composite_trigger derives score and forces
    -- methodology_version, so neither is seeded or asserted here).
    -- -----------------------------------------------------------------------
    if product ? 'assessment' then
      assessment := product->'assessment';

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
        is_current
      )
      select
        (assessment->>'id')::uuid,
        seed_product_id,
        (assessment->>'look')::numeric,
        (assessment->>'outfit')::numeric,
        (assessment->>'material')::numeric,
        (assessment->>'craftsmanship')::numeric,
        (assessment->>'maintenance')::numeric,
        (assessment->>'comfort')::numeric,
        (assessment->>'collection')::numeric,
        (assessment->>'value')::numeric,
        (assessment->>'resale_potential')::numeric,
        (assessment->>'acquisition_ease')::numeric,
        true
      where not exists (
        select 1 from public.eazy_assessments ea
        where ea.id = (assessment->>'id')::uuid
      );

      select * into strict r_assessment
      from public.eazy_assessments
      where id = (assessment->>'id')::uuid;

      if r_assessment.product_id is distinct from seed_product_id
        or r_assessment.look is distinct from (assessment->>'look')::numeric
        or r_assessment.outfit is distinct from
          (assessment->>'outfit')::numeric
        or r_assessment.material is distinct from
          (assessment->>'material')::numeric
        or r_assessment.craftsmanship is distinct from
          (assessment->>'craftsmanship')::numeric
        or r_assessment.maintenance is distinct from
          (assessment->>'maintenance')::numeric
        or r_assessment.comfort is distinct from
          (assessment->>'comfort')::numeric
        or r_assessment.collection is distinct from
          (assessment->>'collection')::numeric
        or r_assessment.value is distinct from
          (assessment->>'value')::numeric
        or r_assessment.resale_potential is distinct from
          (assessment->>'resale_potential')::numeric
        or r_assessment.acquisition_ease is distinct from
          (assessment->>'acquisition_ease')::numeric
        or r_assessment.methodology_version is distinct from 'sneaker-10-v1'
        or r_assessment.is_current is distinct from true
      then
        raise exception
          'Catalog seed conflict: eazy_assessments % exists with non-canonical data',
          assessment->>'id';
      end if;
    end if;

    -- -----------------------------------------------------------------------
    -- Offers
    -- -----------------------------------------------------------------------
    for offer in
      select e.value
      from jsonb_array_elements(product->'offers') with ordinality
        as e(value, ord)
      order by e.ord
    loop
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
        (offer->>'id')::uuid,
        seed_product_id,
        offer->>'website_name',
        offer->>'website_link',
        (offer->>'size')::numeric,
        offer->>'size_region',
        offer->>'currency',
        (offer->>'price')::numeric,
        (offer->>'last_checked_at')::timestamptz
      where not exists (
        select 1 from public.product_offers po
        where po.id = (offer->>'id')::uuid
      );

      select * into strict r_offer
      from public.product_offers
      where id = (offer->>'id')::uuid;

      if r_offer.product_id is distinct from seed_product_id
        or r_offer.website_name is distinct from offer->>'website_name'
        or r_offer.website_link is distinct from offer->>'website_link'
        or r_offer.size is distinct from (offer->>'size')::numeric
        or r_offer.size_region is distinct from offer->>'size_region'
        or r_offer.currency is distinct from offer->>'currency'
        or r_offer.price is distinct from (offer->>'price')::numeric
        or r_offer.last_checked_at is distinct from
          (offer->>'last_checked_at')::timestamptz
      then
        raise exception
          'Catalog seed conflict: product_offers % exists with non-canonical data',
          offer->>'id';
      end if;
    end loop;

    -- -----------------------------------------------------------------------
    -- Trigger-created empty aggregate (seed never inserts aggregates).
    -- -----------------------------------------------------------------------
    select count(*) into n
    from public.rating_aggregates
    where rating_aggregates.product_id = seed_product_id;
    if n <> 1 then
      raise exception
        'Catalog seed: expected exactly one trigger-created rating_aggregates row for product % (found %)',
        seed_product_id, n;
    end if;

    select * into strict r_agg
    from public.rating_aggregates
    where rating_aggregates.product_id = seed_product_id;
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
        'Catalog seed: product % aggregate is not empty zero-count',
        seed_product_id;
    end if;
  end loop;
end;
$catalog_seed$;
