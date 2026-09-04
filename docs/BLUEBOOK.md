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
  “Trending” without a real time-based activity signal. Hand-picked sections
  must say they are hand-picked.
- Browse: a product list with brand/name/SKU search and product detail
  navigation; add filters, sorting, or pagination only when catalog evidence
  requires them.
- Account: logged-out auth entry points and logged-in profile, rated-products,
  deletion, and required legal/support actions.
- Product Detail: product identity, scores, offers, breakdowns, My Rating, description, and rating CTA.
- Rating Form: short 0–10 form across the ten shared **sneaker-10-v1**
  dimensions (Appearance, Styling, Materials, Craftsmanship, Care, Comfort,
  Collectibility, Product Value, Resale Potential, Acquisition Ease), optional
  private note, and a live 0–100 **My Rating** preview derived from dimensions
  (not typed overall).

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
- Eazy Score: the app's curated rating created by the app owner (0–100 composite
  from the shared ten-dimension rubric).
- Community Score: average rating from normal users as a 0–100 composite from
  the same rubric (server-owned aggregates).
- My Rating: the logged-in user's own 0–100 composite for the product from the
  same dimensions (owner-only private note never enters community surfaces).

Eazy Review uses **one common rubric** so Eazy assessment and community
assessment can be compared dimension-by-dimension and composite-to-composite.

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

## Delivery Order

`docs/TASKS.md` is the sole current implementation ledger: it owns task order,
status, dependencies, execution ownership, parallel-safety, human gates,
deliverables, and acceptance. `docs/ROADMAP.md` keeps the milestone-level view.
This product plan intentionally does not duplicate either source.

## Success Criteria

- Users can browse without logging in.
- Rating requires login.
- Product cards show image, brand, name, SKU, Eazy Score, Community Score, and lowest price.
- Product detail clearly compares Eazy Score, Community Score, and My Rating.
- User ratings are one per user per product.
- Community Score is recalculated by database/server-side logic, not trusted client logic.
- The app remains simple, clean, and consistent.
