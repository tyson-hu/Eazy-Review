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
    terms.tsx
    privacy.tsx
    support.tsx
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
- Terms.
- Privacy.
- Support / Contact.

External destination from Account:
- Account deletion information (public web URL; not an Expo route).

Product Detail opens from:
- Feed product card.
- Browse product card.
- Rated Products list.

Rating Form opens from Product Detail.

Route ownership is phased: Task 16 adds core auth routes and Account states;
Task 17 adds Rated Products; Task 18 adds recovery routes; Task 19 adds the
Delete Account action and protected server boundary; Task 24 adds direct Terms,
Privacy, and support/contact routes plus the public account-deletion
information URL. No generic Settings route is planned for the MVP.

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

Current connected path (Tasks 16–17):

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

Historical mock path (Task 9 session-only; retained for chronology):

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

Task 15 connected-read interim (historical; superseded by Task 16 gate):

```txt
User opens connected Product Detail
-> Rating is honestly shown as temporarily unavailable
-> No Sign In or Rating Form route is opened
-> No mock save is claimed for the Supabase product
```

Task 16 rate gate (signed-out remains authoritative):

```txt
User opens Product Detail
-> If signed out: Sign in to rate (return path to this product)
-> After successful sign-in: return to Product Detail
-> Sign-out / account switch clears user-scoped Query cache only
```

Task 17 durable Rate/Edit path:

```txt
User opens Product Detail while signed in
-> If no My Rating: CTA Rate this product; form empty
-> If My Rating exists: CTA Edit my rating; form prefilled
-> Incomplete Save: sticky footer explains remaining categories + field errors; no network write
-> Complete Save uses read then insert/update (23505 recovers to update)
-> Product Detail refetches My Rating + server-owned Community Score
-> Account shows rated-product count and Rated Products list
```

## Flow 3: Edit Own Rating

Current connected edit path (auth + Supabase):

```txt
User opens Product Detail
-> Product detects that user already rated it
-> Button says Edit my rating
-> User edits rating
-> Rating is updated
-> Community Score is recalculated
```

Historical mock path (Task 9 session-only; retained for chronology):

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

The signed-in Account profile read shows known-offline status immediately,
keeps cached profile details visible with offline context, and bounds an
unreachable backend with the shared request deadline instead of leaving the
profile loading state on native transport timing.

## Flow 5: Password Recovery

Routes:
- Request: `app/auth/forgot-password.tsx` (`/auth/forgot-password`)
- Completion: `app/auth/reset-password.tsx` (`/auth/reset-password`)

```txt
Logged-out user opens Account or Sign In
-> User taps Forgot Password
-> Forgot Password screen (request recovery email)
-> User submits email; non-enumerating confirmation
-> User opens recovery deep link / email link
-> App exchanges/verifies the link and observes a PASSWORD_RECOVERY session
-> App opens Reset Password (completion)
-> User sets a new password; honest success/error state
-> User remains on the authenticated recovery session and continues to Account
  (sign-in is not required again when the session is already established)
-> Later sign-in uses the new password only (old password fails)
```

`forgot-password.tsx` owns the recovery-request UI only. `reset-password.tsx`
owns new-password completion and is the deep-link target when the auth provider
requires a separate completion screen (Task 18). Do not fold completion into
the forgot-password route.

Reset Password enables its completion form only for a verified recovery
session. Direct navigation, an ordinary signed-in session, or an
expired/replayed/invalid recovery link shows a safe error with a path to request
a new email; it must not call the password-update API. A completed ordinary
PKCE or token callback settles into that safe unavailable state rather than
remaining on the verification loader.

The request outcome also remains non-enumerating when Auth explicitly rejects
an absent account: the screen shows the same submitted confirmation as an
accepted request. Transport and service failures still show honest retryable
errors.

A temporary transport/server failure stays distinct from an expired, replayed,
or unusable-PKCE-verifier link and tells the user to check connectivity and
reopen the same link. This applies whether the provider failure arrives in the
callback URL or during SDK exchange. Reopening the link retries verification;
a definitive expired/replayed code or missing/mismatched PKCE verifier instead
offers a new recovery request because the same link cannot succeed. Password
update remains gated until verification succeeds.

If recovery-link verification overlaps a newer auth transition, a late callback
must not reopen the password form for a different current account or after
sign-out. Both the SDK recovery event and the callback result are bound to the
initiating attempt; they may promote recovery only when its verified principal
still matches the latest authenticated principal. `INITIAL_SESSION` and
`TOKEN_REFRESHED` maintenance events for the principal that predated the link
do not count as newer user transitions and cannot reject deliberate recovery.
A matching `USER_UPDATED` event is maintenance too, so a password update from
the preceding recovery cannot consume the new link when it settles late.
On a cold recovery launch, the app marks the callback attempt as started before
reading the persisted local principal. Only that principal's matching delayed
`INITIAL_SESSION` is reclassified as pre-link maintenance; sign-in or sign-out
that occurs while the local read is pending remains a newer transition.
The local signed-out transition emitted after bootstrap cleans up a
definitively invalid persisted session is maintenance too; it cannot consume a
recovery link that was opened while bootstrap validation was still finishing.
Bootstrap captures the exact restored session, validates its bearer through an
isolated non-persisting Auth client, and removes local Auth storage only when
the principal plus access/refresh snapshot still match. It never uses shared-
client `auth.signOut()` for this cleanup, so a replacement session already
present at the exact-session recheck remains current. The link enters
processing immediately, but its Auth exchange waits until bootstrap restoration
and any conditional exact-session cleanup settle; it therefore cannot install
a fresh same-account session between the stale-session recheck and removal. An
explicit user sign-out remains superseding. That wait is bounded by the shared
request deadline. If restoration stalls, the link is not exchanged and the
screen settles to the retryable temporary-failure state; reopening the link
after restoration completes can process it.
If the stale SDK event has already installed its session, whether emitted as
`PASSWORD_RECOVERY` or
ordinary `SIGNED_IN`, authenticated UI stays gated while the app restores the
superseding session; reconciliation failure uses current-device sign-out and
explicitly settles signed-out instead of leaving auth loading. Duplicate
delivery of the active or already-pending recovery callback is ignored. A
newer distinct link replaces the pending callback, immediately keeps the reset
route in processing, and runs automatically after the active single-use
exchange and its stale-session reconciliation settle. The older attempt cannot
expose or retain a password form once that newer link arrives.
Explicit sign-in, sign-up, and sign-out wait for recovery reconciliation that
started first; reconciliation
waits only for the snapshot of explicit auth operations that started first and
stops when one establishes a newer auth state. A later operation waits behind
reconciliation without joining that snapshot, so the two sides cannot
deadlock. Neither ordering can overwrite the newer user action. When several
transitions occur after callback start, the latest explicit sign-in/sign-out
remains authoritative even if it returns to the same account as the recovery
link; recovery stays unverified. Event provenance is confirmed only when that
explicit operation succeeds, so a queued sign-in that fails cannot consume the
valid recovery event emitted while it was pending.

If the recovery session becomes definitively missing or expires after the form
was verified, a failed update clears the form and returns to the invalid-link
restart state. Weak-password and temporary failures keep the form for manual
retry. If another recovery link opens while Reset Password remains mounted,
entering `processing` clears the prior password values, error, and success card
so the newly verified account receives a fresh form. Any password-update
request still in flight from the preceding attempt loses authority to change
the new form or clear the new recovery phase when it later settles. Leaving
the Reset Password screen also invalidates its pending update, so a completion
from the departed screen cannot clear a recovery attempt opened afterward.

Recovery redirect matrix (scheme `eazyreview` from `app.json`):

| Environment | Redirect | Configured by |
| --- | --- | --- |
| Local Supabase + Development build | `Linking.createURL('/auth/reset-password')` (typically `eazyreview://…/auth/reset-password`) | Task 18 (`supabase/config.toml` allowlist variants) |
| Preview / staging Auth host | Same app scheme after host allowlist; optional after human approval | Task 18/25 as separately approved |
| Production | Human-applied allowlist only | Tasks 25–26 |

For the physical local row, the email first opens the Auth verification origin
from `SUPABASE_AUTH_EXTERNAL_URL` in the gitignored root `.env`. That origin
must be the Mac's device-reachable LAN URL with `/auth/v1`; after verification,
Auth redirects to the separate app-scheme URL shown in the matrix.

## Flow 6: Delete Account

```txt
Signed-in user opens Account
-> User taps the separate Delete Account action
-> Inline confirmation opens on Account; no route transition occurs
-> App shows exact permanent-data and Community Score recalculation copy
-> App shows exact instruction to enter current password, then tap Delete my
   account
-> User enters Current password (not email or a DELETE phrase)
-> Isolated Auth reauthentication uses the signed-in account's fixed email
-> Returned principal must match the principal that started deletion
-> Client invokes the protected function with that exact fresh bearer,
   no target id, and no request-body content
-> Server verifies the live caller and derives that caller as the only target
-> Auth Admin global sign-out revokes refresh sessions (confirmed failure aborts)
-> Server hard-deletes that auth user at most once
-> Profile and My Rating rows cascade; Community Score aggregates recompute
-> Principal-bound local settlement removes/quarantines only that principal
-> App shows an honest signed-out outcome or preserves the latest newer winner
-> Public Browse and Product Detail remain available
```

Delete Account is hidden while signed out. The confirmation copy is exact:

> Your Eazy Review account, your My Rating entries, and private notes will be
> permanently deleted. Public product information will remain. Each affected
> Community Score will be recalculated without your rating. This cannot be
> undone.

The confirmation instruction under that copy is exact:

> To confirm, enter your current password, then tap Delete my account.

The secure field uses the visible placeholder and accessibility label
`Current password`. Confirmation is that password only.

`Cancel` closes the inline card and clears the password and error without a
router call. Empty password cannot submit. Pending disables password editing,
Cancel, Sign out, the Delete Account entry point, and the final destructive
action, preventing duplicate submission. Pre-revocation wrong-password,
offline, validation, and service failures use fixed safe errors and keep the
initiating principal signed in for a deliberate manual retry; the app never
automatically retries the destructive request.

The signed-out outcome is one of:

- confirmed deletion: `Your account was deleted. You can continue browsing
  Eazy Review without an account.`;
- confirmed retained account after revocation: `Your account was not deleted.
  All sessions were signed out. Sign in again to retry.`; or
- unresolved revocation/deletion: `We couldn't confirm whether account deletion
  finished. Sign in again. If your account is still available, you can retry
  deletion.`

Local coordination binds the attempt to principal A with a revisioned
preparing/pending/settled deletion guard. Shared-session `auth.signOut()` is not
used for deletion settlement. Exact principal-bound storage cleanup and
principal-scoped Query removal affect A only; public catalog cache remains. A
late A refresh/write/event stays blocked, while the latest allowed B/C session
or signed-out transition wins. If the attempt is superseded, the Account form,
password, error, and A outcome notice are cleared; B/C is preserved and no
deletion claim is shown for that newer principal. Mount, payload-free guard
signals, and foreground reconciliation recover missed local guard changes.

The client never chooses a target user id, sends a target in the request, or
contains a service-role secret. Task 19 owns this flow. Only a human—not a
coding agent or agent-controlled browser/MCP/SQL/admin tool—may activate the
destructive submit for verification or acceptance, including the second
pre-existing session check. Already-issued access tokens may remain valid until
their configured expiry even after refresh-session revocation; human evidence
records that bounded lifetime without claiming immediate token invalidation.
Task 24's public account-deletion information link explains this in-app path
and the data deletion/retention behavior; it is informational and does not
replace or invoke the Task 19 action.

## Browse Requirements

Route: `app/(tabs)/browse.tsx`

Features:
- Search input.
- Product list.
- Product cards.
- Empty state.
- Loading state.
- Error state.
- Manual retry.
- Cached products remain visible during background refresh or while offline;
  offline-without-cache is an explicit full-surface state.

Task 15 uses client-side search for the small connected catalog. Filter, sort,
and pagination controls belong to conditional Task 20 only after measured
catalog scale justifies them; do not keep disabled placeholders.

MVP local search should search:
- Brand.
- Name.
- SKU.

Product card tap should navigate to `/product/[id]`.

Task 15 Product Detail keeps cached public data visible during refresh/offline
periods and shows explicit initial loading, offline-without-cache, request
failure/retry, and published-product-not-found states. A missing image,
assessment, offer, or Community Score remains missing; it is never converted to
a zero or fabricated fallback.

## Product Detail Requirements

Route: `app/product/[id]/index.tsx`

Sections:
- Product image area.
- Product title area.
- Product metadata.
- Score overview: Eazy Score and Community Score as 0–100 counterparts;
  `Editorial assessment` under Eazy and the rating count inside Community
  (`Early score · N rating(s)` below five).
- Decision summary: overall Community-versus-Eazy delta plus the highest and
  lowest Community dimensions across the canonical ten dimensions. Use calm
  empty/tied copy and suppress direct cross-source claims when methodology
  versions differ.
- Verified offers: price, seller, size, currency, and checked date.
- Expanded score comparison: all ten shared 0–10 dimensions with distinct
  Eazy and Community columns and complete row accessibility labels.
- Compact My Rating: `/100` composite and score label when rated; keep the
  existing signed-out, loading, offline, error, and unrated states.
- Description.
- Persistent Rate/Edit CTA.

## Rating Form Requirements

Route: `app/product/[id]/rate.tsx`

Fields:
- Appearance, Styling, Materials, Craftsmanship, Care, Comfort,
  Collectibility, Product Value, Resale Potential, and Acquisition Ease: 0–10
  in half steps.
- My Rating preview: derived 0–100 composite; Overall is not editable.
- Private note: optional, owner-only, not a public review; maximum 500
  characters.

Interaction:
- Drag the platform-native slider for large changes; use − / + for exact
  half-step changes; Clear returns the field to unanswered.
- Horizontal-biased curved drags belong to the slider. Vertical-biased drags
  belong to page scrolling.
- Slider interaction never dismisses Rate/Edit. Standard leading-edge Back
  remains available on iOS.
- VoiceOver announces the dimension and value and can increment or decrement
  in half steps (post-launch accessibility ownership under Task 27; deferred
  from Task 17 by human scope decision on 2026-08-10 — not a Task 17 merge
  blocker and not an initial-release Task 23/26 blocker).
- Save with unanswered categories: no network write; sticky footer reports how
  many categories still need a score; each unanswered row shows an inline error
  that clears when that category is set.
- At maximum Dynamic Type, Rate/Edit should keep dimension labels, values,
  slider, ±/Clear, private note, My Rating preview, and Save footer readable
  and operable (Task 27 post-launch accessibility hardening; Task 17 recorded
  physical FAIL and deferred this work — not a Task 17 merge blocker).

### Task 9 mock behavior

During the fake-local-state phase:

- Authentication is not enforced.
- Ratings persist only in the current JavaScript session.
- Product Detail reflects the updated My Rating after submission.
- Community Score and community category averages do not change.
- App reload resets the mock rating fixtures.
- The Rate/Edit optional text field is **Private note** (`privateNote`) on the
  connected Task 17 form.
- The real query invalidation behavior below applies after Supabase integration.

After successful connected submission, invalidate the public product/list and
owner rating/Rated Products scopes through the canonical key factories in
[`docs/API_CONTRACTS.md`](API_CONTRACTS.md#ratings-mutations), then navigate
back to Product Detail. Product Detail composes public detail with the
owner-scoped My Rating; never cache `privateNote` or other viewer-owned state
under a public catalog key.
