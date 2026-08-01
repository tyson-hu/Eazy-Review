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
- Feed contains real, non-duplicative sections or the Feed tab is removed.

## UI States

- Loading states exist for product lists and product detail.
- Empty states exist for no products, no search results, and no rated products.
- Error states exist for failed product and rating requests.
- Rating form validation messages are clear (including Private note max length when connected).
- Account logged-out and logged-in states both work.
- Rated Products empty and populated states both work.
- Offline/reconnect and retry states are understandable.
- Root-level errors offer a recovery path.

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
- Rating saves use the direct RLS-protected read/insert/update path with
  unique-conflict retry (`23505`), not a client PostgREST upsert that updates
  identity columns. A save function is permitted only under the defect-evidence
  and separate-authorization exception in the accepted rating-write decision.
- User cannot create duplicate ratings for the same product.
- `user_ratings.product_id` and `user_ratings.user_id` are immutable after insert.

## Mobile QA

- Feed, Browse, Account, Product Detail, and Rating Form work on supported
  phone widths.
- Text does not overflow buttons/cards.
- Touch targets are comfortable.
- Navigation back behavior is predictable.
- Keyboard does not block rating inputs or the Private note field.
- VoiceOver labels/reading order and Dynamic Type behavior are verified.
- Light-only appearance is explicit and no unreviewed dark-mode surface ships.
- iPad support remains disabled unless an iPad QA matrix is completed.
- Release candidate passes on a real iPhone plus one Android smoke device.

## Automated Verification

- Frontend unit/integration tests pass in the documented path-filtered CI
  workflow for relevant application changes; they are not local-only.
- Database migrations, pgTAP authorization/behavior tests, and concurrency
  races pass in the documented CI path.
- The critical Browse → Detail → auth → Rate/Edit journey passes its small E2E
  smoke.
- Account-switch tests prove prior user-scoped cache data is removed.

## Security

- No Supabase service-role key in client code.
- Environment variables are documented.
- CI uses the package-manager version declared in `package.json`, and
  `npm ci` passes with strict install-script allowlist enforcement.
- RLS is enabled on public tables.
- Delete-account flow is confirmed before release (owned by Task 19):
  protected server derives the target from the verified caller, revokes all
  refresh sessions, and keeps the service-role secret out of the client.
- Human-run deletion evidence covers a second pre-existing session failing to
  refresh, deleted credentials failing to sign in, profile/rating cascades,
  correct retained Community aggregates, local cache cleanup, and the
  configured residual JWT-expiry bound, which is no more than one hour for the
  MVP.
- Reset Password updates credentials only from a verified recovery session;
  direct navigation and expired/invalid links fail safely.

## Store Readiness

- App icon and splash assets are final.
- Final Terms, Privacy, and support/contact routes plus the public
  account-deletion information URL are linked directly from Account and have
  the required public metadata URLs.
- At the later Android publication boundary only, verify the functional
  external account-deletion request resource prepared conditionally by Task 24
  and complete its URL and deletion declarations in Google Play Data Safety.
  This Play Console verification is not part of Task 26's iOS release gate.
- App Store privacy answers match the actual email/profile/rating/private-note
  data inventory and any diagnostics SDKs.
- The current App Store age-rating questionnaire, including social-media
  capability answers, is completed in the final App Store Connect app record
  and matches the release-candidate feature set.
- Public-release recovery-email delivery and provider configuration are
  verified end to end with the release-candidate environment.
- A public-release recovery email opens the installed release-candidate build
  through the approved production redirect and completes the verified
  password-reset flow end to end.
- App Store screenshots are current.
- App display name, bundle/package identifiers, version, and build number are
  final.
- Development, preview, and production EAS profiles are isolated; preview
  points only to staging.
- Production Supabase configuration/migration/seed steps have a
  human-controlled runbook and approval record.
- TestFlight build is tested.
- Clean-install and upgrade paths are tested.
- App Review notes explain sign-in, recovery, and in-app account deletion.
- Known limitations are documented.
- Rollback and staged/manual release choice are documented.

## Documentation

- `docs/DOCUMENTATION_POLICY.md` has been followed for every release-bound change.
- `docs/TASKS.md` reflects completed and remaining work.
- Qualifying high-impact decisions have individual records under `docs/decisions/`; routine fixes and task progress were not converted into ADRs.
- `npm run decisions:check` confirms the generated `docs/DECISIONS.md` index is current.
- `README.md` setup and validation instructions are current.
- Product, UI, data, API, and user-flow docs match the released behavior.
