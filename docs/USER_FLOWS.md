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
    reset-password.tsx

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
- Reset Password.
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
-> Browse is the initial tab
-> User sees product list
-> User searches by brand, name, or SKU
-> User taps product
-> User views Product Detail
```

Users should be allowed to browse without logging in.

## Flow 2: Rate Product

Target backend path (after auth + Supabase):

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

Current mock path (Task 9 session-only; see Task 9 mock behavior below):

```txt
User opens Product Detail
-> User taps Rate this product
-> Rating Form opens (no login gate)
-> User submits rating
-> My Rating updates for this app session only
-> Community Score does not change
-> User returns to Product Detail
-> Honest alert: not saved to a server; resets on reload
```

## Flow 3: Edit Own Rating

Target backend path (after auth + Supabase):

```txt
User opens Product Detail
-> Product detects that user already rated it
-> Button says Edit my rating
-> User edits rating
-> Rating is updated
-> Community Score is recalculated
```

Current mock path (Task 9 session-only):

```txt
User opens Product Detail
-> Button says Edit my rating when a session My Rating exists
-> User edits and saves
-> My Rating updates for this session only
-> Community Score does not change
```

## Flow 4: View Rated Products

```txt
User opens Account
-> User taps Rated Products
-> App shows all products rated by this user
-> User taps product
-> Product Detail opens
```

## Flow 5: Password Recovery

Routes:
- Request: `app/auth/forgot-password.tsx` (`/auth/forgot-password`)
- Completion: `app/auth/reset-password.tsx` (`/auth/reset-password`)

```txt
Logged-out user opens Account
-> User taps Forgot Password
-> Forgot Password screen (request recovery email)
-> User submits email; honest success/error state
-> User opens recovery deep link / email link
-> App exchanges/verifies the link and observes a PASSWORD_RECOVERY session
-> App opens Reset Password (completion)
-> User sets a new password; honest success/error state
-> User signs in with the new password only (old password fails)
```

`forgot-password.tsx` owns the recovery-request UI only. `reset-password.tsx`
owns new-password completion and is the deep-link target when the auth provider
requires a separate completion screen (Task 18). Do not fold completion into
the forgot-password route.

Reset Password enables its completion form only for a verified recovery
session. Direct navigation, an ordinary signed-in session, or an
expired/replayed/invalid recovery link shows a safe error with a path to request
a new email; it must not call the password-update API.

## Flow 6: Delete Account

```txt
Logged-in user opens Account
-> User taps Delete Account
-> App explains permanent profile/My Rating deletion
-> User confirms and reauthenticates when required
-> Protected server verifies the caller and derives that same user as target
-> Auth Admin global sign-out revokes refresh sessions (failure aborts)
-> Server hard-deletes that auth user
-> Profile and My Rating rows cascade; Community aggregates recompute
-> App clears local session and user-scoped cache
-> App returns to logged-out Account; public browsing remains available
```

The client never chooses a target user id and never contains a service-role
secret. Task 19 owns this flow. A human—not a coding agent or agent-controlled
browser/MCP/SQL/admin tool—runs the destructive verification, including a
second pre-existing session that can no longer refresh. Already-issued JWTs
may remain valid until the configured expiry; the verification records that
bounded lifetime.

## Browse Requirements

Route: `app/(tabs)/browse.tsx`

Features:
- Search input.
- Product list.
- Product cards.
- Empty state.
- Loading state.
- Error state.

Task 15 uses client-side search for the small connected catalog. Filter, sort,
and pagination controls belong to conditional Task 20 only after measured
catalog scale justifies them; do not keep disabled placeholders.

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
- Decision summary (Top strength / Weakest category from community averages; calm empty copy when ratings are missing or fully tied at display precision).
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
- Private note: optional (owner-only; not a public review). Max 500 characters once Task 17 connects the form.

### Task 9 mock behavior

During the fake-local-state phase:

- Authentication is not enforced.
- Ratings persist only in the current JavaScript session.
- Product Detail reflects the updated My Rating after submission.
- Community Score and community category averages do not change.
- App reload resets the mock rating fixtures.
- The Rate/Edit optional text field may still be labeled **Comment** in mock UI until Task 17 renames the connected field to **Private note** (`privateNote`).
- The real query invalidation behavior below applies after Supabase integration.

After successful real submission:
- Invalidate `['product', productId]`.
- Invalidate `['products']`.
- Invalidate `['userRating', userId, productId]`.
- Invalidate `['ratedProducts', userId]`.
- Navigate back to Product Detail.

The shared `['product', productId]` query stores public detail data only.
Product Detail composes My Rating from `['userRating', userId, productId]`;
never cache `privateNote` or other viewer-owned state under the shared product
key.
