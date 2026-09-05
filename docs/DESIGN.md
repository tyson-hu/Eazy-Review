# Eazy Review Design System

This is the sole product UI source of truth: identity, design principles,
app-canonical tokens, typography, elevation, component rules, screen-level
rules, AI-prompt guardrails, and the design quality checklist.

Use this file before generating screens in Stitch, implementing React Native
UI, or reviewing visual output. `tailwind.config.js` is the configured token
consumer. The former Apple website study is archived at
`docs/research/apple-visual-analysis.md` as non-authoritative research.

## Product Identity

Eazy Review is a sneaker and streetwear review intelligence app. It helps users decide whether a product is worth buying by combining:
- Eazy Score.
- Community Score.
- Category-based ratings.
- Price-by-size data.
- Product discovery.
- Personal rating history.

Eazy Review should feel like:
- Nike SNKRS-level product storytelling.
- StockX-level marketplace trust.
- Letterboxd-style community taste.
- Consumer Reports-style scoring clarity.

It should not feel like:
- A generic shopping or ecommerce app.
- A basic or childish sneaker store.
- A heavy marketplace with discount treatment.
- A spreadsheet full of scores.
- A clone of StockX, GOAT, or SNKRS.
- Screen-by-screen visual inconsistency.

## Core UI Promise

Every screen should help users quickly understand whether a sneaker is worth buying, why it is rated that way, and what the community thinks.

The user should be able to answer:
- Is this product good?
- Why is it good or bad?
- Is the price reasonable?
- What do real users say?
- Should I rate, save, compare, or skip it?

## Design Personality

The UI should feel: premium, sharp, trustworthy, data-rich, fashion-aware, community-driven, clean, and modern.

The UI should avoid feeling: cheap, crowded, childish, overly playful, generic, template-like, too marketplace-heavy, or too technical.

## Main Principle

Show the decision first, then show the details.

Do not force users to read every category before understanding the product. The normal visual order is:

```txt
Product image
-> Product name
-> Overall score
-> Key rating reason
-> Price signal
-> Community proof
-> Action
```

## Principle 1: Clear Hierarchy

Each screen must have one clear focal point.

Examples:
- Feed: the spotlight card that leads the first populated real-data section.
- Browse: search bar and product results.
- Product Detail: sneaker image plus score summary.
- Rating Screen: rating input.
- Account: user credibility and rating history.

Do not make every card, number, badge, and button compete for attention.

## Principle 2: Premium White Space

White space should make the app feel confident and high-quality.

Use spacing to separate:
- Product identity.
- Rating summary.
- Price data.
- Community rating breakdowns.
- User actions.

Avoid filling every empty space with badges, chips, icons, or labels. If everything is visible, nothing is important. Avoid overloaded cards, and preserve enough spacing for thumb-friendly touch targets.

## Principle 3: Data Without Clutter

Eazy Review has many numbers, but it should not feel like a spreadsheet.

Show data in layers:
- Layer 1: overall score.
- Layer 2: top strengths and weaknesses.
- Layer 3: category breakdown.
- Layer 4: price and product details.

The full rating system should be easy to access, but not visually overwhelming. Keep dense product information scannable.

## Principle 4: Consistent Components

Reuse the same visual patterns across screens instead of one-off screen styling.

Core visual patterns:
- Product card.
- Score badge.
- Rating category row.
- Review card.
- Price-size pill.
- Brand chip.
- Trend badge.
- Bottom tab navigation.
- Primary CTA button.
- Secondary action button.

Each component should keep consistent spacing, radius, typography, and score-label treatment across Feed, Browse, Product Detail, Rating, and Account.

## Principle 5: Product Photography First

Sneaker images should feel premium and editorial.

Image direction:
- Clean studio background.
- Strong product focus.
- No messy backgrounds.
- No random lifestyle clutter.
- Consistent lighting.
- High-quality product cropping.

The sneaker should feel like the hero, not a thumbnail.

## Principle 6: Trust Through Clarity

Users should understand where every rating comes from.

Separate clearly:
- Eazy Score.
- Community Score.
- My Rating.
- Price data.
- Review count.

Do not mix app-curated scores and user scores without labels.

Bad:

```txt
Score: 86
```

Better:

```txt
Eazy Score: 86
Community Score: 82
My Rating: Not rated yet
```

## Principle 7: Community With Taste

Community content should feel useful, not messy.

Reviews should prioritize:
- Short opinions.
- Clear rating.
- Helpful context.
- User credibility.
- Pros and cons.

The tone should be closer to Letterboxd for sneakers than a random social comment feed.

For MVP, community text and review-card patterns are design exploration only. Do not implement comments, likes, or social reactions until the core Browse, Product Detail, Rating, and Account flows work.

## Principle 8: One Primary Action Per Screen

Each screen should have one main action.

Examples:
- Product Detail: rate this product.
- Browse: open product.
- Feed: discover product.
- Rating Screen: submit rating.
- Account: view rated products.

Secondary actions can exist, but they should not visually overpower the main action.

## Visual System

These are the app-canonical values. Token changes must update
`tailwind.config.js`; update `docs/STITCH_PROMPTS.md` only when its deliberately
inlined prompt values change.

Colors:

```txt
Background: #f5f5f7
Card: #ffffff
Primary Text: #1d1d1f
Secondary Text: #6b6b6b
Border: #e0e0e0
Primary Accent: #0066cc
Accent Focus: #0071e3
Accent On Dark: #2997ff
Positive Score: #047857
Warning / Markup: #b45309
Negative / Risky: #b91c1c
```

Score semantics (positive / warning / negative) are product-specific.

Layout:

```txt
Reference mobile width: 393px
Screen padding: 16px
Card gap: 20–24px
Card radius: 18px
Card padding: 24px
Button / action-input radius: 9999px (pill)
Bottom tab height: standard iOS style
Safe-area aware layout
```

- Content under a navigator header should start ~16px below the header — not an extra status-bar inset. `Screen` defaults to no top safe-area (`safeTop` opt-in only for headerless surfaces); bottom safe-area still applies when `footer` is set.
- Custom stack `headerLeft` hit targets must stay square (no trailing margin). On iOS 26+, liquid-glass shared backgrounds follow the custom-view bounds; a non-square frame becomes an oval.
- Do **not** adopt Apple homepage full-bleed marketing tiles, black global nav, or 80px marketing section pads on app product surfaces.

Typography:
- Prefer SF Pro / system stack (`system-ui`, `-apple-system`). Inter is an
  acceptable off-platform substitute.
- Body ~17px at weight 400; headlines and strong emphasis at weight 600. Do not use weight 500 — the ladder is 400 + 600 (weight 300 only where UI style explicitly calls for airy display).
- Use large weight-600 numbers for scores and prices. The `AppText` `score`
  variant (36px, weight 600) is the one hero-sized composite display; it sets
  no color, and the caller passes the score tone class. Compact Feed scores
  use `scoreCompact` (weight 600, no color or size) and pass both the size
  and the tone class. The `action` variant (17px, weight 600, Primary Accent)
  is the inline text affordance inside a tappable surface. Generated class
  CSS is ordered by name, so do not rely on a trailing size or color class
  to override a variant's own size or color.
- Use weight-600 product names, readable over decorative typography.
- Use small quiet metadata and clear, concise section and rating labels.
- Avoid marketing copy in core app surfaces.
- Avoid decorative fonts and overly playful typography.
- Use `Eazy Score`, `Community Score`, and `My Rating` exactly.
- Respect system Dynamic Type when practical. Prefer adaptive layout (vertical
  stacking, content-driven card height, scroll) over dense fixed rows as the
  UI is hardened. Do **not** disable `allowFontScaling` globally.
- Deliberate **component-level** `maxFontSizeMultiplier` may be used only for
  large score displays and compact UI chrome (stepper symbols, primary button
  labels) when a measured layout defect requires it. Body, captions, and
  product identity keep full system scaling unless a later accessibility
  task revisits the caps.
- Maximum / XXL Dynamic Type acceptance and full VoiceOver verification are
  **post-launch** (Task 27) after the 2026-08-10 human scope decision.
  Initial-release QA still targets normal text size and ordinary readability.

Card style:
- White background.
- Subtle 1px border.
- No shadow on cards, buttons, or text. The only allowed drop-shadow is on product imagery resting on a surface (`rgba(0, 0, 0, 0.22) 3px 5px 30px`; RN `shadowRadius` ≈ half the CSS blur).
- Rounded at 18px (utility card), not childish.
- Internal padding ~24px; clear spacing between stacked content.
- Consistent image area.
- Product cards and Account cards grow with content where the current design
  already allows it. Fixed heights that clip identity text at normal sizes are
  defects. Extreme accessibility content-size clipping is a known
  initial-release limitation tracked under Task 27, not a Task 17 acceptance
  reset.

Interaction:
- All button press feedback: `scale(0.95)` (also applied to tappable product cards). Action inputs do not use press scale.

Layout rules:
- Design mobile-first.
- Use a small design system instead of one-off screen styling.
- Use loading, empty, and error states for product and account surfaces.

## Component Rules

### Score Badge

- Include score number, score label, and source label.
- Use consistent score color meaning.
- Display `No score yet` when score is null.
- Eazy Score and Community Score should be easy to compare; My Rating should be visually distinct from aggregate scores.
- Side-by-side score pairs remain the normal-size layout. Vertical restacking
  at extreme accessibility content sizes is post-launch work (Task 27), not a
  Task 17 requirement after the 2026-08-10 human scope decision.
- Product Detail labels the Eazy source `Editorial assessment`. Community count
  belongs inside the Community Score badge: fewer than five ratings use
  `Early score · N rating(s)`; five or more use `N ratings`.

Score meaning:

```txt
90-100: Excellent
80-89: Strong
70-79: Good
60-69: Mixed
Below 60: Risky
```

### Product Card

Product cards are used in Browse and Rated Products. Feed does not stack
Product Cards; it uses the Product Spotlight Card and Product Rank Row below so
the two tabs never read as the same list.

Show:
- Product image.
- Brand.
- Product name.
- SKU.
- Eazy Score.
- Community Score.
- Lowest price.

Do not add description, long metadata, comments, likes, or social UI to MVP product cards. Avoid putting too much information on small cards.

### Product Spotlight Card

The Feed's single hero-sized surface; only the lead product of the first
populated section uses it.

- Eyebrow names why the product leads (`Latest addition`, `Top Eazy Score`,
  `Most rated`); never a marketing headline.
- Reading order follows the Main Principle: 224px editorial image area with the
  product shadow, brand, product name at title size, SKU, one large Eazy Score
  (`score` variant, tone colored, `/ 100`, score label plus
  `Editorial assessment`), compact Community Score with rating-count context
  (`Early score · N rating(s)` under five; `N ratings` at five or more), a
  labeled `Lowest verified offer` line, and a `View product` action text.
- Null states: `No image available`, `—` with `Not assessed yet`, `—` with
  `No ratings yet` or `No score yet`, and `No verified offer available`.
- The whole card is the tap target and opens Product Detail. Do not nest a
  button inside it or add a Rate action; rating stays on Product Detail.

### Product Rank Row

Compact list row for Feed rankings. Rows stack inside one bordered
`Card`-radius container with hairline dividers, so a section reads as a
scoreboard, not a card stack.

- Left to right: optional rank number (ranked sections only), 48px thumbnail
  on the Background tile, brand label plus weight-600 product name (up to three
  lines so long sneaker names stay distinguishable), then one labeled composite
  score column: `Eazy Score` or `Community Score`, `NN / 100` in the score
  tone, and a caption (score label for Eazy Score; `N rating(s)` for Community
  Score; `Not assessed yet`, `No ratings yet`, or `No score yet` when null).
- Rows show one score each; the section header names the ordering basis. Do
  not add price, SKU, or a second score to a row.
- Minimum row height 72px; the whole row is the tap target and opens Product
  Detail. A missing image leaves the Background tile empty.

### Review Card

- Include user, product, rating, short opinion, and helpful action.
- The card should feel like a buying insight, not just a comment.
- Design exploration only for MVP (see Principle 7).

### Rating Breakdown

- Composite labels use **0–100**: `Eazy Score`, `Community Score`, `My Rating`.
- Dimension rows use **0–10** (half-step display such as `9.0`).
- Prefer explicitly named props such as `score100` and `score10` (or typed view
  models). Never feed a dimension into a 0–100 badge or a composite into a
  0–10 row.
- Do **not** fix scale mixups with heuristics like
  `score <= 10 ? score * 10 : score`.
- Shared ordered dimensions: Appearance, Styling, Materials, Craftsmanship,
  Care, Comfort, Collectibility, Product Value, Resale Potential, Acquisition
  Ease.
- Product Detail: Eazy Score and Community Score side by side, then a
  decision summary, verified offers, and the expanded one-to-one Eazy vs
  Community dimension columns. The value columns use a visible gutter and
  every row has one complete accessibility label naming the dimension and both
  values.
- Layered data: composite scores first; composite delta and community
  strengths/weaknesses second; verified offers third; dimension comparison
  fourth. Public written reviews remain post-MVP.
- Avoid complex charts unless they remain clear on mobile.

### Connected-action and query state (Task 15/17)

- Loading/fetching: show LoadingState only while a fetch is actively in flight.
- Offline (known): compact non-spammy feedback before/after Save on connected
  screens; fail-fast offline message for writes.
- Timeout: bounded request deadline (~10s); clear retry copy.
- Transport/backend unreachable: distinct from offline when the device is
  networked.
- Retry: keep entered form values; user initiates retry after reconnect.
- Cached offline: keep showing cached data with stale/offline context when
  useful.
- No infinite spinner for `isPending` + paused mutations/queries, or for
  `status: pending` + `fetchStatus: paused` with no cache.
- Preserve user input after transport failures (no silent form wipe).

### Reusable UI Components

Initial reusable UI components:
- `Screen`
- `HeaderBackButton`
- `Button`
- `Input`
- `Card`
- `AppText`
- `ScoreBadge`
- `ProductCard`
- `ProductSpotlightCard`
- `ProductRankRow`
- `DimensionStepperRow`
- `LoadingState`
- `EmptyState`
- `ErrorState`

Keep these components small. Add abstractions only when they remove real duplication.

## Screen-Level Rules

### Feed / Discover

- Job: help users find interesting products worth checking, and show at a
  glance how the catalog is scored.
- Focal point: the spotlight card that leads the first populated real-data
  section. Everything below it is compact.
- Feed must look different from Browse. Browse is a search bar over a stack of
  full Product Cards; Feed is a scoreboard: one Product Spotlight Card, then
  sections of Product Rank Rows. Never render the Browse Product Card stack on
  Feed.
- Every section has a header (section title) and a one-line basis caption
  that states truthfully how it is ordered. Auto captions are `Latest additions
  to the catalog`, `Ranked by Eazy Score`, and `Ranked by number of community
  ratings`. A curated caption must say the list is hand-picked (for example
  `Picked by Eazy Review`) and must not claim a measured basis such as
  `Ranked by Eazy Score` or `Trending`.   The client substitutes that trusted
  copy when a stored caption breaks the rule, and substitutes trusted
  title and eyebrow copy when those fields claim `Trending` or another
  reserved measured basis. Spotlight and rank-row accessibility labels
  include the displayed eyebrow or rank, the shown signal and score, and
  the relevant caption.
- Auto sections are Newly Added, Best Eazy Scores, and Most Rated. Published
  curated collections with a `feed_position` merge into the same ordered list.
  Ranked sections appear only when at least two products qualify and show at
  most five products. Hide empty or duplicate sections; do not label a section
  “Trending” without a real time-based activity signal. Do not add Best
  Community Scores.
- Only the first populated section's lead product renders as the spotlight;
  that section's remaining products continue as rows beneath it. When that
  lead section is ranked, the spotlight is rank 1 and remaining rows continue
  from 2. Newly Added rows and unranked curated rows carry no rank numbers;
  Best Eazy Scores, Most Rated, and ranked curated rows are numbered. Newly
  Added and Best Eazy Scores rows show Eazy Score; Most Rated rows show
  Community Score and the rating count. A curated row shows the collection's
  `signal`.
- Post-MVP, when community text is in scope: a `Latest community reviews`
  section of Review Cards (user, product, rating, short opinion, helpful
  action) inserted after the spotlight and before the ranked sections, plus
  category chips. Until then the slot does not exist on screen; never ship a
  placeholder for it.
- Avoid: horizontal carousels that hide the ranking, too many banners,
  marketplace discount feeling, overloaded homepage.
- Do not overbuild Feed before Browse, Product Detail, and Rating work.

### Browse / Explore

- Job: help users quickly find a product, brand, or category.
- Focal point: search bar and product results.
- Show now: large search bar, product cards, and brand/name/SKU search.
- Add filters, sorting, pagination, or popular searches only when conditional
  Task 20 has measured evidence that the catalog needs them.
- Avoid: tiny filters, crowded product cards, unclear score badges, random recommendations.

### Product Detail

- Job: help users decide whether this product is worth buying.
- Focal point: sneaker image plus score summary.
- Structure: product image area, product title area, product metadata, score
  overview (Eazy Score and Community Score), Decision summary, verified offers
  (price, seller, size, currency, and checked date), expanded ten-dimension
  score comparison, compact My Rating, description, persistent Rate/Edit CTA.
- Decision summary: state the overall Community-versus-Eazy delta only when
  both sources use the same methodology; then show the highest and lowest
  Community dimensions across the shared ten-dimension rubric. Use calm empty
  copy for no ratings, and omit opposing strongest/weakest labels when the
  highest and lowest values tie at one-decimal display precision.
- Score comparison: label the first column `Dimension`; explain plainly that
  both scores use the same ten 0–10 dimensions; keep all ten rows expanded.
  Do not add a Difference column. When methodology versions differ, suppress
  the rows and direct cross-source claims and explain that direct comparison is
  unavailable.
- My Rating: when rated, show only the derived `/100` composite, its score
  label, and edit guidance. The Rate/Edit screen owns the ten editable
  dimensions and owner-only private note. Preserve signed-out, loading,
  offline, error, and unrated Product Detail states.
- Image empty state: products with no public image show "No image available";
  HTTP(S) product URLs load normally.
- Post-MVP only: public written-review snippets or previews are social content and
  must not appear in the MVP Product Detail structure.
- Avoid: showing all data at the same visual weight, too many badges, crowded charts, marketplace-first layout.

Phased CTA ownership:
- Task 15 connected-read interim: show an honest unavailable rating state.
  Authentication is not connected yet, so do not show a broken
  `Sign in to rate` route or claim a mock save for a Supabase product.
- Task 16: connect the logged-out `Sign in to rate` gate and
  return-to-product behavior. Do not claim durable rating persistence yet.
  After sign-in, return to Product Detail, where rating remains honestly
  unavailable until Task 17 connects durable My Rating persistence.
- Task 17 final state: logged in without a rating shows `Rate this product`;
  logged in with an existing rating shows `Edit my rating`.

### Rating Submission

- Job: make it easy and satisfying to rate a product.
- Focal point: shared ten-dimension form with a live derived **My Rating** (0–100).
- Show: product preview; groups Style / Build and Wear / Market and Ownership;
  platform-native 0–10 half-step sliders for large changes between − / + fine
  controls; Clear = unanswered; 0 is valid; live My Rating preview when
  complete (explicit incomplete state when not); optional private note;
  submit; progress feedback that is never an endless offline spinner.
- Incomplete save must not be a silent no-op: tapping Save with missing
  categories shows a sticky footer summary (how many categories still need a
  score) plus per-field errors on unanswered rows. Offline and failed save
  reuse the same footer error region.
- Gesture ownership: horizontal and naturally curved horizontal drags adjust
  the slider without scrolling; vertical-biased drags scroll without changing
  the value. Rate/Edit disables iOS full-screen Back while preserving the
  standard leading-edge Back gesture.
- Accessibility: each slider exposes its dimension, current value, range, and
  adjustable actions. Minus, plus, and Clear remain 44-point single-pointer
  alternatives.
- Avoid: editable Overall; long intimidating free-text score fields; confusing
  category names; no save/progress feedback; offline write queues; score
  entry that requires only repeated ± taps for large moves.

Form fields (methodology `sneaker-10-v1`):

| Group | UI label | Field |
| --- | --- | --- |
| Style | Appearance | look |
| Style | Styling | outfit |
| Build and Wear | Materials | material |
| Build and Wear | Craftsmanship | craftsmanship |
| Build and Wear | Care | maintenance (10 = easy to maintain) |
| Build and Wear | Comfort | comfort |
| Market and Ownership | Collectibility | collection |
| Market and Ownership | Product Value | value |
| Market and Ownership | Resale Potential | resalePotential |
| Market and Ownership | Acquisition Ease | acquisitionEase |

- Private note: optional (owner-only; not a public comment). Max 500 characters.

Validation:
- Numeric fields are required.
- Values must be between 0 and 10 in 0.5 increments.
- Private note is optional; when present, max 500 characters (Task 17+).

Connected Task 17 form: label **Private note** and property `privateNote`.

### Account

- Job: show user identity, credibility, and rating history.
- Focal point: user stats and reviewed products.
- Avoid: overly social profile treatment, too many personal details, empty profile with no value.

Render only the controls owned by the current accepted task:

- Task 16 logged out: app logo/name, short message, Sign In, Create Account,
  and continue-browsing message.
- Task 16 logged in: current profile identity (avatar when available, display
  name, and username), joined date, and Log Out.
- Task 17 adds the number of rated products and Rated Products link.
- Task 18 adds Forgot Password
  (`app/auth/forgot-password.tsx`; recovery links land on
  `app/auth/reset-password.tsx`).
- Task 19 adds the signed-in-only Delete Account experience described below.
- Task 24 adds direct Terms of Use, Privacy Policy, and support/contact routes
  plus a public account-deletion information URL. The deletion-information
  link opens the public web destination; it does not add another destructive
  action or a native Expo route. Task 19 remains the sole in-app Delete Account
  action.

No generic Settings route is planned for the MVP. Add one only when concrete
settings have explicit task ownership.

#### Task 19 Delete Account

`Delete Account` is a separate secondary action below the ordinary `Sign out`
card. It is not shown while signed out and it opens an inline confirmation card
on Account; opening, canceling, and submitting never add or navigate to another
route.

The confirmation uses this exact permanence copy:

> Your Eazy Review account, your My Rating entries, and private notes will be
> permanently deleted. Public product information will remain. Each affected
> Community Score will be recalculated without your rating. This cannot be
> undone.

Immediately under that permanence copy, the card shows this exact confirmation
instruction:

> To confirm, enter your current password, then tap Delete my account.

The inline card contains a secure `Current password` input (visible placeholder
and accessibility label both `Current password`), `Cancel`, and the final
`Delete my account` action. Confirmation is the current password only — not a
typed email or `DELETE` phrase. Only the final action uses the shared
`destructive` button variant and the Negative / Risky color; `Delete Account`
and `Cancel` remain secondary actions. An empty password disables final submit,
and a nonempty password is passed through unchanged rather than trimmed or
normalized. When the password field is focused, Account must keep the
confirmation copy, instruction, field, and Cancel / Delete actions visible above
the software keyboard (`Screen` scroll with keyboard insets, plus scroll-into-view
when the deletion form opens or the field focuses).

While deletion is pending, disable the password input, Cancel, Sign out, the
Delete Account entry point, and the final action. Keep the final action's
accessible name while its visible label becomes a loading indicator. Errors
use fixed safe copy in an alert region and never expose SDK, server, identity,
session, or credential detail. Cancel collapses the card and clears the
password and error.

After the initiating principal is signed out, Account may show one of these
fixed alert messages:

- Confirmed deletion: `Your account was deleted. You can continue browsing
  Eazy Review without an account.`
- Confirmed retained account after revocation: `Your account was not deleted.
  All sessions were signed out. Sign in again to retry.`
- Unconfirmed destructive outcome: `We couldn't confirm whether account
  deletion finished. Sign in again. If your account is still available, you
  can retry deletion.`

An auth transition that supersedes the attempt shows none of those notices. A
principal change clears the initiating principal's open card, password, error,
and notice, so a newer signed-in principal is never presented as the result of
the earlier deletion. The signed-out Account keeps its sign-in/create-account
controls and explicit continue-browsing path; public Browse remains available.

## Accessibility

- Use readable text contrast.
- Preserve minimum touch sizes for buttons and list items.
- Provide useful labels for icon-only controls.
- Do not rely on color alone to communicate score state.

## AI Design Prompt Guardrails

When prompting Google Stitch, Figma AI, or Cursor for UI work, include:
- Product identity.
- Target user.
- Screen job.
- Main focal point.
- Required components.
- Visual principles.
- Color system.
- Spacing rules.
- What to avoid.
- Platform constraints.

Do not prompt like:

```txt
Design a sneaker review app.
```

Prompt like:

```txt
Design a premium iOS product detail screen for Eazy Review, a sneaker review intelligence app. The screen should help users decide whether a sneaker is worth buying. Make the sneaker image and Eazy Score / Community Score comparison the main focal point. Show rating strengths, a community category breakdown and rating count, and price-by-size data in separate clean sections. Use premium white space, clear hierarchy, and consistent score badges. Avoid generic ecommerce UI, public written-review previews, and crowded charts.
```

Reusable full prompts live in `docs/STITCH_PROMPTS.md`.

## Design Quality Checklist

Before accepting any generated or implemented screen, check:
- Does the screen have one clear focal point?
- Can the user understand the product value in 5 seconds?
- Is the score summary visually obvious?
- Are Eazy Score, Community Score, and My Rating clearly separated?
- Is the layout clean and aligned?
- Are cards consistent?
- Is there enough white space?
- Does it feel premium instead of generic?
- Does it avoid looking like a basic ecommerce app?
- Does it match the Eazy Review identity?

## Final Direction Statement

Eazy Review should look and feel like a premium sneaker review intelligence app. The UI should combine strong product photography, clear scoring, useful community opinions, and clean buying signals so every screen helps users make a faster and more confident decision — visually sharp, data-rich, trustworthy, and fashion-aware, while avoiding generic ecommerce layouts, childish sneaker styling, crowded rating dashboards, and inconsistent AI-generated UI.
