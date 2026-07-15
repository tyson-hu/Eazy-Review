# Eazy Review User Flows

## Navigation Structure

Use Expo Router with tabs.

```txt
app/
  _layout.tsx

  (tabs)/
    _layout.tsx
    feed.tsx
    browse.tsx
    account.tsx

  product/
    [id]/
      index.tsx
      rate.tsx

  auth/
    sign-in.tsx
    sign-up.tsx
    forgot-password.tsx

  account/
    rated-products.tsx
    settings.tsx
    terms.tsx
    privacy.tsx
```

Bottom tabs:
- Feed.
- Browse.
- Account.

Non-tab screens:
- Product Detail.
- Rating Form.
- Sign In.
- Sign Up.
- Forgot Password.
- Rated Products.
- Settings.
- Terms.
- Privacy.

Product Detail opens from:
- Feed product card.
- Browse product card.
- Rated Products list.

Rating Form opens from Product Detail.

## Flow 1: Browse Without Login

```txt
User opens app
-> User taps Browse tab
-> User sees product list
-> User searches or filters
-> User taps product
-> User views Product Detail
```

Users should be allowed to browse without logging in.

## Flow 2: Rate Product

```txt
User opens Product Detail
-> User taps Rate this product
-> If not logged in, redirect to Sign In
-> If logged in, open Rating Form
-> User submits rating
-> Rating is saved
-> Product Community Score is updated
-> User returns to Product Detail
-> Product page shows My Rating
```

## Flow 3: Edit Own Rating

```txt
User opens Product Detail
-> Product detects that user already rated it
-> Button says Edit my rating
-> User edits rating
-> Rating is updated
-> Community Score is recalculated
```

## Flow 4: View Rated Products

```txt
User opens Account
-> User taps Rated Products
-> App shows all products rated by this user
-> User taps product
-> Product Detail opens
```

## Browse Requirements

Route: `app/(tabs)/browse.tsx`

Features:
- Search input.
- Product list.
- Infinite scroll placeholder.
- Filter button.
- Sort button.
- Product cards.
- Empty state.
- Loading state.
- Error state.

MVP local search should search:
- Brand.
- Name.
- SKU.

Product card tap should navigate to `/product/[id]`.

## Product Detail Requirements

Route: `app/product/[id]/index.tsx`

Sections:
- Product image area.
- Product title area.
- Product metadata.
- Score overview.
- Price/purchase section.
- Rating breakdown.
- My Rating section.
- Description.
- Rate/Edit CTA.

## Rating Form Requirements

Route: `app/product/[id]/rate.tsx`

Fields:
- Look: 1-10.
- Comfort: 1-10.
- Quality: 1-10.
- Outfit: 1-10.
- Value: 1-10.
- Overall: 1-10.
- Comment: optional.

### Task 9 mock behavior

During the fake-local-state phase:

- Authentication is not enforced.
- Ratings persist only in the current JavaScript session.
- Product Detail reflects the updated My Rating after submission.
- Community Score and community category averages do not change.
- App reload resets the mock rating fixtures.
- The real query invalidation behavior below applies after Supabase integration.

After successful real submission:
- Invalidate `['product', productId]`.
- Invalidate `['products']`.
- Invalidate `['userRating', productId]`.
- Invalidate `['ratedProducts']`.
- Navigate back to Product Detail.
