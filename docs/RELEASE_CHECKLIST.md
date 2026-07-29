# Release Checklist

Use this after the MVP flow exists. Do not treat it as permission to skip the roadmap order.

## Product Flow

- Browse works without login.
- Product cards open Product Detail.
- Product Detail shows Eazy Score and Community Score.
- Logged-out users are redirected to Sign In before rating.
- Logged-in users can submit My Rating.
- Logged-in users can edit My Rating.
- Rated Products list opens rated product details.

## UI States

- Loading states exist for product lists and product detail.
- Empty states exist for no products, no search results, and no rated products.
- Error states exist for failed product and rating requests.
- Rating form validation messages are clear (including Private note max length when connected).
- Account logged-out and logged-in states both work.
- Rated Products empty and populated states both work.

## Data And Auth

- Anonymous clients can read **published** products only (`is_published = true`).
- Related catalog rows (images, current Eazy assessments, rating aggregates, offers) are readable anonymously only for published products; draft-related rows stay hidden.
- Users can only insert/update/delete their own ratings; `private_note` is owner-only.
- Users cannot insert or update ratings for unpublished products; they may delete an existing own rating after unpublish.
- Authenticated users can update only mutable profile fields (`display_name` / `username` / `avatar_url`); audit timestamps are server-maintained.
- Profile rows are created by the auth.users trigger, not by client INSERT; sign-up leaves a readable profile for Account.
- Rating writes cannot set `user_ratings.id` or timestamps via client grants.
- Community Score is recalculated by database/server-side logic; clients cannot write `rating_aggregates` or execute refresh RPCs.
- Every product has a zero-count `rating_aggregates` row from create/seed (or Detail normalizes a missing join to `ratingCount: 0`).
- Rating saves use a controlled server function or insert vs score-only update with unique-conflict retry (`23505`), not a client PostgREST upsert that updates identity columns.
- User cannot create duplicate ratings for the same product.
- `user_ratings.product_id` and `user_ratings.user_id` are immutable after insert.

## Mobile QA

- Feed, Browse, Account, Product Detail, and Rating Form work on small phone widths.
- Text does not overflow buttons/cards.
- Touch targets are comfortable.
- Navigation back behavior is predictable.
- Keyboard does not block rating inputs or the Private note field.

## Security

- No Supabase service-role key in client code.
- Environment variables are documented.
- The compatible Expo/ESLint advisory follow-up in `docs/TASKS.md` has been
  re-checked against current upstream releases; no force-fix, dependency
  override, or unsupported SDK/toolchain change was used.
- RLS is enabled on public tables.
- Delete-account flow is confirmed before release (owned by Task 15):
  protected server derives the target from the verified caller, revokes all
  refresh sessions, and keeps the service-role secret out of the client.
- Human-run deletion evidence covers a second pre-existing session failing to
  refresh, deleted credentials failing to sign in, profile/rating cascades,
  correct retained Community aggregates, local cache cleanup, and the
  configured residual JWT-expiry bound.
- Reset Password updates credentials only from a verified recovery session;
  direct navigation and expired/invalid links fail safely.

## Store Readiness

- App icon and splash assets are final.
- Terms and Privacy pages exist.
- App Store screenshots are current.
- TestFlight build is tested.
- Known limitations are documented.

## Documentation

- `docs/DOCUMENTATION_POLICY.md` has been followed for every release-bound change.
- `docs/TASKS.md` reflects completed and remaining work.
- Qualifying high-impact decisions have individual records under `docs/decisions/`; routine fixes and task progress were not converted into ADRs.
- `npm run decisions:check` confirms the generated `docs/DECISIONS.md` index is current.
- `README.md` setup and validation instructions are current.
- Product, UI, data, API, and user-flow docs match the released behavior.
