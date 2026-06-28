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

- Feed: daily recommended products, trending products, and curated discovery sections.
- Browse: product list with search, filters, sorting, infinite-scroll placeholder, and product detail navigation.
- Account: logged-out auth entry points and logged-in profile/rated-products/settings flows.
- Product Detail: product identity, scores, offers, breakdowns, My Rating, description, and rating CTA.
- Rating Form: short 1-10 rating form for look, comfort, quality, outfit, value, overall, and optional comment.

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

Do not call the app-builder rating "official rating" in UI. Internal database names can still use `official_ratings`.

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
11. Create Supabase project.
12. Create database schema.
13. Add Supabase Auth.
14. Connect Browse/Product Detail to Supabase.
15. Connect rating submission to Supabase.
16. Add TanStack Query.
17. Add real filtering/sorting/search.
18. Add Feed sections.
19. Add scraping/import pipeline later.

## Success Criteria

- Users can browse without logging in.
- Rating requires login.
- Product cards show image, brand, name, SKU, Eazy Score, Community Score, and lowest price.
- Product detail clearly compares Eazy Score, Community Score, and My Rating.
- User ratings are one per user per product.
- Community Score is recalculated by database/server-side logic, not trusted client logic.
- The app remains simple, clean, and consistent.
