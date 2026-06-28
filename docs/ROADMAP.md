# Eazy Review Roadmap

## Phase 1: Foundation

1. Confirm `docs/BLUEBOOK.md`.
2. Confirm `docs/DESIGN.md`.
3. Confirm `docs/DATA_MODEL.md`.
4. Set up `AGENTS.md`.
5. Set up `.cursor/rules`.
6. Set up Supabase local/dev project.

## Phase 2: UI Shell

1. App navigation.
2. Design tokens / theme.
3. Shared components.
4. Product card.
5. Rating display components.
6. Empty/loading/error components.

## Phase 3: Core Screens

1. Feed placeholder.
2. Browse/search.
3. Product detail.
4. Rating flow.
5. Account.
6. Rated products list.

## Phase 4: Real Data

1. Supabase product table.
2. User rating table.
3. User profile table.
4. Product query hooks.
5. Rating submission mutation.
6. Feed/search queries.

## Phase 5: Social Layer

Future only, after core app works:
- Comments.
- Likes.
- Shares.
- Reports/moderation.
- Activity feed.

## Phase 6: Polish And Release

1. Performance cleanup.
2. Error states.
3. Auth edge cases.
4. TestFlight QA.
5. App Store assets.
6. Release checklist.

## MVP Milestones

### Milestone 1: App Shell

Deliverables:
- Expo app created.
- Expo Router working.
- Bottom tabs working.
- NativeWind working.
- Basic reusable UI components created.

Acceptance:
- User can open Feed, Browse, and Account tabs.
- App runs on iOS/Android simulator or physical device.

### Milestone 2: Mock Product Experience

Deliverables:
- Mock products.
- Browse screen.
- Product cards.
- Product detail screen.
- Rating form with fake local update.

Acceptance:
- User can browse fake products.
- User can open a product.
- User can submit a fake rating.
- UI flow feels understandable.

### Milestone 3: Supabase Setup

Deliverables:
- Supabase project created.
- Tables created.
- RLS policies added.
- Seed product data added.

Acceptance:
- Products can be read publicly.
- User ratings can only be changed by the owner.

### Milestone 4: Auth

Deliverables:
- Sign up.
- Sign in.
- Sign out.
- Session persistence.
- Auth-aware Account screen.

Acceptance:
- Logged-out user can browse.
- Logged-out user must sign in to rate.
- Logged-in user can access rating form.

### Milestone 5: Real Product Data

Deliverables:
- Browse fetches Supabase products.
- Product detail fetches Supabase product.
- Product card shows real score and price data.

Acceptance:
- No mock data needed for product browsing.

### Milestone 6: Real Rating System

Deliverables:
- User can submit rating.
- User can edit rating.
- Rating summary recalculates.
- Product detail refreshes after rating.
- Rated Products screen works.

Acceptance:
- Community Score changes after user rating.
- User cannot create duplicate ratings for the same product.

### Milestone 7: Feed

Deliverables:
- Today's Pick.
- Trending Now.
- Best Eazy Scores.
- Best Community Scores.
- Newly Added.

Acceptance:
- Feed uses real product data.
- Product cards open Product Detail.

### Milestone 8: Polish

Deliverables:
- Loading states.
- Empty states.
- Error states.
- Form validation.
- Better spacing.
- Basic settings pages.
- Terms and privacy placeholders.

Acceptance:
- App feels stable and usable.
