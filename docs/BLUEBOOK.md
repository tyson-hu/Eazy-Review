# Eazy Review Bluebook

## Product Vision

Eazy Review is a clean product discovery and rating app where users can quickly answer:

- Is this product good?
- Is it worth buying?
- How does Eazy rate it?
- How does the community rate it?
- How did I rate it?
- Where can I buy it?

The first successful version is not the version with the most features. The first successful version lets a user browse products, open a product, understand the scores, rate it, and later find rated products.

## Core Problem

Sneaker and product discovery often separates product information, market pricing, expert opinion, and personal/community ratings. Eazy Review should make those signals easy to compare without requiring users to log in before browsing.

## Core Value Proposition

Eazy Review combines an app-curated product score with community ratings and the user's own rating history in one mobile-first product detail experience.

## Target Users

- Sneaker and product shoppers comparing products before buying.
- Users who want a lightweight personal rating history.
- App owners who want to curate product quality through Eazy Scores.

## Main Screens

- Feed: a small set of truthful, real-data discovery sections; do not claim
  “Trending” without a real time-based activity signal.
- Browse: a product list with brand/name/SKU search and product detail
  navigation; add filters, sorting, or pagination only when catalog evidence
  requires them.
- Account: logged-out auth entry points and logged-in profile, rated-products,
  deletion, and required legal/support actions.
- Product Detail: product identity, scores, offers, breakdowns, My Rating, description, and rating CTA.
- Rating Form: short 1-10 rating form for look, comfort, quality, outfit, value, overall, and optional private note (not a public review).

## Core Product Flow

```txt
Browse product list
-> Open product detail
-> View Eazy Score and Community Score
-> Submit or edit My Rating
-> See updated rating state
```

## MVP Scope

Include:
- Browse products.
- Search products.
- View product detail.
- See Eazy Score.
- See Community Score.
- Sign up.
- Sign in.
- Sign out.
- Submit a rating.
- Edit own rating.
- View rated products in Account.

Do not include first:
- Scraping.
- Push notifications.
- Social following.
- Comments.
- Likes.
- Dark mode.
- Advanced recommendation algorithm.
- Admin dashboard.
- Complex animations.
- Multi-language support.

## Naming Rules

Use these UI names:
- Eazy Score: the app's curated rating created by the app owner.
- Community Score: average rating from normal users.
- My Rating: the logged-in user's own rating for the product.

Do not call the app-builder rating "official rating" in UI. Internal database
names follow `docs/DATA_MODEL.md` (`eazy_assessments` for editorial scoring).

## Recommended Stack

- Expo: mobile app framework.
- Expo Router: file-based navigation and tab navigation.
- React Native: native mobile UI.
- TypeScript: safer product, rating, and API code.
- NativeWind: reusable styling system.
- Supabase: auth, Postgres, storage, RLS, functions, and triggers.
- TanStack Query: client caching, fetching, mutations, loading states, errors, and refetching.

## Build Order

1. Create Expo app with TypeScript.
2. Set up Expo Router.
3. Set up NativeWind.
4. Create reusable UI components.
5. Create mock product data.
6. Build Browse screen with fake data.
7. Build Product Detail screen with fake data.
8. Build Rating Form with fake local update.
9. Build Feed placeholder.
10. Build Account placeholder.
11. Task 11 — create local/staging Supabase environments and the deny-by-default core schema.
12. Task 12 — add RLS policies, explicit Data API grants, and authorization tests.
13. Task 13 — seed exactly two deterministic products: one complete and one sparse.
14. Task 14 — establish the Supabase client, generated types, TanStack Query, query keys, React Native lifecycle/online integration, and the minimal frontend test harness.
15. Task 15 — connect anonymous published Browse/Product Detail reads; do not build a temporary UUID rating map.
16. Task 16 — add core email/password auth, session restoration, Account state, and the Rate gate.
17. Task 17 — persist owner-only My Rating, add Rated Products, and verify the accepted server-owned aggregate behavior end to end.
18. Task 18 — add password recovery and mobile deep links.
19. Task 19 — add caller-derived protected account deletion through a server-only boundary.
20. Task 20 — scale Browse search/filter/sort/pagination only when measured catalog size requires it.
21. Task 21 — replace the placeholder with a small real Feed.
22. Task 22 — close cross-feature test gaps, add path-filtered database CI and one small E2E smoke, and clean up the test suite.
23. Task 23 — complete reliability, accessibility, and device QA.
24. Task 24 — finish privacy, legal, support, and store disclosures.
25. Task 25 — configure isolated EAS environments and produce a TestFlight candidate.
26. Task 26 — complete release-candidate QA and App Store submission.
27. Task 27 — establish lightweight post-launch operations.
28. Task 28 — add catalog import/admin infrastructure after MVP.
29. Task 29 — optional read-only public publishing/project-journal workstream.

## Success Criteria

- Users can browse without logging in.
- Rating requires login.
- Product cards show image, brand, name, SKU, Eazy Score, Community Score, and lowest price.
- Product detail clearly compares Eazy Score, Community Score, and My Rating.
- User ratings are one per user per product.
- Community Score is recalculated by database/server-side logic, not trusted client logic.
- The app remains simple, clean, and consistent.
