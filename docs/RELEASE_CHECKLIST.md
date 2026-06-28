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
- Rating form validation messages are clear.
- Account logged-out and logged-in states both work.

## Data And Auth

- Products are publicly readable.
- Product images are publicly readable.
- Eazy Scores are publicly readable.
- Rating summaries are publicly readable.
- Product offers are publicly readable.
- Users can only insert/update/delete their own ratings.
- Community Score is recalculated by database/server-side logic.
- User cannot create duplicate ratings for the same product.

## Mobile QA

- Feed, Browse, Account, Product Detail, and Rating Form work on small phone widths.
- Text does not overflow buttons/cards.
- Touch targets are comfortable.
- Navigation back behavior is predictable.
- Keyboard does not block rating/comment inputs.

## Security

- No Supabase service-role key in client code.
- Environment variables are documented.
- RLS is enabled on public tables.
- Delete-account flow is confirmed before release.

## Store Readiness

- App icon and splash assets are final.
- Terms and Privacy pages exist.
- App Store screenshots are current.
- TestFlight build is tested.
- Known limitations are documented.

## Documentation

- `docs/DOCUMENTATION_POLICY.md` has been followed for every release-bound change.
- `docs/TASKS.md` reflects completed and remaining work.
- `docs/DECISIONS.md` captures meaningful decisions since the previous release.
- `README.md` setup and validation instructions are current.
- Product, UI, data, API, and user-flow docs match the released behavior.
