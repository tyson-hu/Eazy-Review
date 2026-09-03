# Task 21 — Real Feed MVP preview

## Status

Web mobile preview of the connected Feed on the 27-product local catalog
**pass**. iOS Simulator **not-run**. Physical device **not-tested**.

## Run report

- Mode: `web-preview`
- Journey: Feed → Newly Added card → Product Detail → Back → Best Eazy
  Scores card → Product Detail
- Environment matrix:
  - Mobile web (393×852, Expo Metro `http://localhost:8081`, local
    Docker Supabase): **pass**
  - iOS Simulator: **not-run**
  - Physical device: **not-tested**
- Overall result: **pass**
- Step-by-step:
  - Feed loads without the placeholder copy: **pass**
  - Newly Added shows five published products: **pass**
  - Best Eazy Scores shows five scored products, distinct from Newly
    Added: **pass**
  - Most Rated is absent on the zero-rating seed: **pass**
  - Newly Added card opens Product Detail
    (`/product/a1000000-0000-4000-8000-000010002700`): **pass**
  - Back returns to Feed with both sections still populated: **pass**
  - Best Eazy Scores card opens Product Detail
    (`/product/a1000000-0000-4000-8000-000010001700`): **pass**
- Evidence directory: `docs/evidence/task-21-real-feed-mvp/`
- Evidence filenames:
  - `screenshots/web-01-feed-newly-added.png` — Feed top / Newly Added
  - `screenshots/web-02-feed-full.png` — Feed scrolled to **Best Eazy
    Scores** (section header + first ranked cards). Distinct hash from
    `web-01`.
  - `screenshots/web-03-product-detail-from-feed.png`
  - `screenshots/web-04-product-detail-from-best-eazy.png`
- GitHub disposition: `RESULT.md` plus the four screenshots above are
  selected proof. No local-only raw captures were kept.
- Findings and severity: none after review-fix recapture of `web-02`
- Known limitations: web-only; native tab chrome and iOS Simulator were
  not exercised. Most Rated cannot appear until two products have
  community ratings. Expo web uses an inner scroll container, so
  `web-02` is a viewport capture scrolled to Best Eazy Scores rather
  than a document-height stitch.
- Automated checks run separately: focused Feed Jest suites 22/22;
  `npm run typecheck`; `npm run lint`; `npm run check:readonly`;
  parent `npm run check:expo` on the review-fix head
- Required next decision: human review and acceptance of the
  implementation PR. Project #4 Status write `T21: Gated → In Progress`
  was applied after chat approval.
