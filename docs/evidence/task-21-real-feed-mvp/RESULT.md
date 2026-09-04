# Task 21 — Real Feed MVP preview

## Status

Web mobile preview of the connected Feed on the 27-product local catalog
**pass**. iOS Simulator **not-run**. Physical device **not-tested**.

The first run below captured the initial card-stack Feed. The 2026-09-03
redesign re-run supersedes its Feed captures; `web-01` and `web-02` are
retained as point-in-time evidence of the layout that was replaced. The
2026-09-03 curated-collections re-run (first section below) adds Editor's
Picks without changing the Newly Added spotlight.

## Curated collections re-run (2026-09-03)

- Mode: `web-preview`
- Reason: Task 21 extension on PR #52 — merge the seeded `editors-picks`
  collection into Feed (`docs/decisions/2026-09-03-curated-feed-collections.md`).
- Journey: Feed Newly Added spotlight → scroll to Editor's Picks → first
  curated row → Product Detail
- Environment matrix:
  - Mobile web (393×852, Expo Metro `http://localhost:8081`, local Docker
    Supabase, 27 published products plus one published collection): **pass**
  - iOS Simulator: **not-run**
  - Physical device: **not-tested**
- Overall result: **pass**
- Step-by-step:
  - Newly Added still leads with the same spotlight and basis caption: **pass**
  - Editor's Picks renders after Newly Added at `feed_position` 150 with
    caption `Picked by Eazy Review` and five unnumbered rows: **pass**
  - Best Eazy Scores remains below Editor's Picks with numbered rows: **pass**
  - First Editor's Picks row opens Product Detail
    (`/product/a1000000-0000-4000-8000-000010000300`): **pass**
- Evidence filenames:
  - Newly Added spotlight is byte-identical to
    `screenshots/web-05-feed-redesign-spotlight.png`; no duplicate capture
    was added.
  - `screenshots/web-09-feed-editors-picks.png` — Editor's Picks header,
    five unnumbered rows, and the Best Eazy Scores header
  - `screenshots/web-10-product-detail-from-editors-picks.png` — Product
    Detail for Jordan 4 Retro OG Nigel Sylvester Brick After Brick
- GitHub disposition: `RESULT.md` plus `web-09` and `web-10` are selected
  proof for this run. Earlier `web-01`–`web-07` remain historical.
- Findings and severity: none.
- Known limitations: web-only; native tab chrome, iOS Simulator, and
  Dynamic Type were not exercised.
- Automated checks run separately: focused Feed Jest suites 60/60;
  `npm run typecheck`; `npm run lint`; `npm run test:db`.
- Required next decision: human review and acceptance of curated collections
  on PR #52.

## Redesign re-run (2026-09-03)

- Mode: `web-preview`
- Reason: human-directed Feed redesign on PR #52 so Feed no longer mirrors
  Browse (`docs/decisions/2026-09-03-feed-scoreboard-layout.md`).
- Journey: Feed spotlight → Product Detail → Back → Best Eazy Scores rank 3
  row → Product Detail
- Environment matrix:
  - Mobile web (393×852, Expo Metro `http://localhost:8081`, local Docker
    Supabase, 27 published products): **pass**
  - iOS Simulator: **not-run**
  - Physical device: **not-tested**
- Overall result: **pass**
- Step-by-step:
  - Newly Added header shows the basis caption `Latest additions to the
    catalog`: **pass**
  - Lead product renders as the spotlight with eyebrow `Latest addition`,
    36px Eazy Score `78 / 100`, `Good · Editorial assessment`, Community
    `No ratings yet`, labeled lowest verified offer, and accent `View
    product`: **pass**
  - Remaining four Newly Added products render as unnumbered rank rows with
    labeled Eazy Score: **pass**
  - Best Eazy Scores renders `Ranked by Eazy Score` and five numbered rows;
    long names wrap to three lines so ranks 1 and 2 stay distinguishable:
    **pass**
  - Most Rated is absent on the zero-rating seed: **pass**
  - No Browse `ProductCard` renders on Feed: **pass**
  - Spotlight tap opens Product Detail
    (`/product/a1000000-0000-4000-8000-000010002700`): **pass**
  - Back returns to Feed with sections populated; rank 3 row tap opens
    Product Detail (`/product/a1000000-0000-4000-8000-000010001400`):
    **pass**
- Evidence filenames:
  - `screenshots/web-05-feed-redesign-spotlight.png` — Feed top / spotlight
  - `screenshots/web-06-feed-redesign-newly-added-rows.png` — Newly Added
    rows and the Best Eazy Scores header
  - `screenshots/web-07-feed-redesign-best-eazy-scores.png` — five numbered
    Best Eazy Scores rows
  - Product Detail reached from the spotlight is byte-identical to
    `screenshots/web-03-product-detail-from-feed.png` (same product, screen
    unchanged); no duplicate capture was added.
- Findings and severity: one medium finding found and fixed during the run —
  two-line row names truncated ranks 1 and 2 to the same text; rows now
  allow three lines. One web-only pre-existing observation, not fixed here:
  generated class CSS is name-ordered, so a trailing `text-accent` or
  `text-negative` on an `AppText` body/caption variant does not override
  the variant color on web (affects existing sign-in/recovery accent text
  and negative-tone `ScoreBadge`); the new Feed components avoid the
  pattern via the `score` and `action` variants.
- Known limitations: web-only; native tab chrome, iOS Simulator, and
  Dynamic Type were not exercised. Most Rated cannot appear until two
  products have community ratings.
- Automated checks run separately: focused Feed Jest suites 24/24;
  `npm run typecheck`; `npm run lint`.
- Required next decision: human review and acceptance of the redesigned
  Feed on PR #52.

## Run report (2026-09-02, initial card-stack layout)

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
