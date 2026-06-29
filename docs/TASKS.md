# Eazy Review Tasks

## Current Repo Status

As of this document setup:
- Expo project exists with Expo Router.
- NativeWind v4 is configured with Tailwind, Babel, and Metro.
- Bottom tabs are Feed, Browse, and Account with placeholder screens.
- Reusable UI primitives exist under `src/components/ui/` (Screen, AppText, Card, Button, ScoreBadge, LoadingState, EmptyState, ErrorState).
- Mock products, Product Detail, and Rating Form are not yet implemented.

## Definition Of Done

Every task is not done until:
- Relevant docs from `docs/DOCUMENTATION_POLICY.md` are updated.
- `docs/TASKS.md` reflects completed work or newly discovered follow-up work.
- `docs/DECISIONS.md` records meaningful product, architecture, data, workflow, design-system, dependency, or toolchain decisions.
- `npm run check` passes when applicable, or skipped checks are explained.
- The final response or PR body lists docs updated, or states `No documentation update needed` with a reason.

## First Implementation Task List

Complete these in order:

### Task 1: Create Expo Project With TypeScript

Status: Done in starter app.

Quality check:
- `package.json` has Expo and TypeScript dependencies.

### Task 2: Install And Configure Expo Router

Status: Mostly done in starter app.

Quality check:
- `package.json` uses `expo-router/entry`.
- Routes load through `app/_layout.tsx`.

### Task 3: Install And Configure NativeWind

Status: Done.

Scope:
- Install NativeWind and required peer/config packages for Expo SDK 56.
- Add Tailwind config.
- Add Babel/Metro config if required by the current NativeWind docs.

Quality check:
- `global.css` imported in root layout.
- `tailwind.config.js`, `babel.config.js`, and `metro.config.js` exist.
- `npm run check` passes.

### Task 4: Create App Tabs

Status: Done.

Create:
- `app/(tabs)/feed.tsx`
- `app/(tabs)/browse.tsx`
- `app/(tabs)/account.tsx`

Replace starter tab names with:
- Feed.
- Browse.
- Account.

Quality check:
- Starter `index.tsx`, `two.tsx`, and modal route removed.
- `app/index.tsx` redirects `/` to `/feed`.
- Tab layout uses Eazy Review names and icons.

### Task 5: Create Reusable UI Components

Status: Partial.

Created in this milestone:
- `Screen`
- `Button`
- `Card`
- `AppText`
- `ScoreBadge`
- `LoadingState`
- `EmptyState`
- `ErrorState`

Still pending:
- `Input`
- `ProductCard`
- `RatingRow`

### Task 6: Create Mock Product Data

Status: Pending.

Create:
- `src/types/product.ts`
- `src/features/products/mockProducts.ts`

### Task 7: Build Browse Screen With Mock Product List

Status: Pending.

Requirements:
- Search input.
- Product list.
- Filter button placeholder.
- Sort button placeholder.
- Empty/loading/error states.
- Product cards navigate to Product Detail.

### Task 8: Build Product Detail Screen

Status: Pending.

Requirements:
- Product image area.
- Product title area.
- Metadata.
- Eazy Score.
- Community Score.
- Lowest price section.
- Rating breakdown.
- My Rating state.
- Description.
- CTA.

### Task 9: Build Rating Form Screen With Fake Local State

Status: Pending.

Requirements:
- Look, comfort, quality, outfit, value, overall.
- Optional comment.
- 1-10 validation.
- Return to product detail after submit.

### Task 10: Review UX Flow Before Supabase

Status: Pending.

Acceptance:
- User can browse fake products.
- User can open a product.
- User can submit a fake rating.
- UI flow is understandable.

## Supabase Tasks

Do not start until mock UX flow works:
- Create Supabase project.
- Add schema migrations.
- Add RLS policies.
- Seed products.
- Add Supabase Auth.
- Add product and rating queries.
- Add TanStack Query.
- Replace mock product browsing with Supabase data.
- Replace fake rating flow with real rating mutations.
