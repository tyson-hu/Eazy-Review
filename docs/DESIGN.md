# Eazy Review Design System

Product UI/UX source of truth: identity, design principles, component rules, screen-level rules, AI-prompt guardrails, and the design quality checklist. Visual style language (full token prose, typography ladder, elevation) lives in `docs/UI_STYLE.md`. The Visual System section below is the app-canonical token subset adapted from that style for NativeWind and UI implementation.

Use this file before generating screens in Stitch, implementing React Native UI, or reviewing visual output; read `docs/UI_STYLE.md` when applying visual language detail.

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
- Feed: featured product or trending review.
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
- Community reviews.
- User actions.

Avoid filling every empty space with badges, chips, icons, or labels. If everything is visible, nothing is important. Avoid overloaded cards, and preserve enough spacing for thumb-friendly touch targets.

## Principle 3: Data Without Clutter

Eazy Review has many numbers, but it should not feel like a spreadsheet.

Show data in layers:
- Layer 1: overall score.
- Layer 2: top strengths and weaknesses.
- Layer 3: category breakdown.
- Layer 4: detailed reviews.

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

App-canonical values adapted from `docs/UI_STYLE.md`. Token changes must also update `docs/STITCH_PROMPTS.md` (copy-paste values inline by design) and `tailwind.config.js`.

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

Score semantics (positive / warning / negative) are product-only; they are not part of the Apple style palette in `docs/UI_STYLE.md`.

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
- Prefer SF Pro / system stack (`system-ui`, `-apple-system`); align with `docs/UI_STYLE.md`. Inter is an acceptable off-platform substitute.
- Body ~17px at weight 400; headlines and strong emphasis at weight 600. Do not use weight 500 — the ladder is 400 + 600 (weight 300 only where UI style explicitly calls for airy display).
- Use large weight-600 numbers for scores and prices.
- Use weight-600 product names, readable over decorative typography.
- Use small quiet metadata and clear, concise section and rating labels.
- Avoid marketing copy in core app surfaces.
- Avoid decorative fonts and overly playful typography.
- Use `Eazy Score`, `Community Score`, and `My Rating` exactly.

Card style:
- White background.
- Subtle 1px border.
- No shadow on cards, buttons, or text. The only allowed drop-shadow is on product imagery resting on a surface (`rgba(0, 0, 0, 0.22) 3px 5px 30px`; RN `shadowRadius` ≈ half the CSS blur).
- Rounded at 18px (utility card), not childish.
- Internal padding ~24px; clear spacing between stacked content.
- Consistent image area.

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

Score meaning:

```txt
90-100: Excellent
80-89: Strong
70-79: Good
60-69: Mixed
Below 60: Risky
```

### Product Card

Product cards are used in Feed, Browse, and Rated Products.

Show:
- Product image.
- Brand.
- Product name.
- SKU.
- Eazy Score.
- Community Score.
- Lowest price.

Do not add description, long metadata, comments, likes, or social UI to MVP product cards. Avoid putting too much information on small cards.

### Review Card

- Include user, product, rating, short opinion, and helpful action.
- The card should feel like a buying insight, not just a comment.
- Design exploration only for MVP (see Principle 7).

### Rating Breakdown

- Category breakdowns use a label, numeric average, and a simple horizontal score bar.
- Prefer compact category rows, expandable detail sections, and top strengths/weaknesses.
- User rating categories are look, comfort, quality, outfit, value, and overall.
- Prefer layered data: overall score first, top strengths/weaknesses second, category breakdown third, detailed reviews later.
- Avoid complex charts unless they remain clear on mobile.

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
- `RatingRow`
- `RatingInputRow`
- `LoadingState`
- `EmptyState`
- `ErrorState`

Keep these components small. Add abstractions only when they remove real duplication.

## Screen-Level Rules

### Feed / Discover

- Job: help users find interesting products worth checking.
- Focal point: featured sneaker or trending review.
- MVP Feed can be simple. Use horizontal product-card sections: Today's Pick, Trending Now, Best Eazy Scores, Best Community Scores, Newly Added.
- Later, when community text is in scope: category chips and review snippets.
- Avoid: too many product grids, too many banners, marketplace discount feeling, overloaded homepage.
- Do not overbuild Feed before Browse, Product Detail, and Rating work.

### Browse / Explore

- Job: help users quickly find a product, brand, or category.
- Focal point: search bar and product results.
- Show: large search bar, useful filters, product cards, sorting options, popular searches.
- Avoid: tiny filters, crowded product cards, unclear score badges, random recommendations.

### Product Detail

- Job: help users decide whether this product is worth buying.
- Focal point: sneaker image plus score summary.
- Structure: product image area, product title area, product metadata, score overview (Eazy Score and Community Score), top strengths and weaknesses, rating breakdown, price/purchase section (price by size), review previews, My Rating section, description, Rate/Edit CTA.
- Avoid: showing all data at the same visual weight, too many badges, crowded charts, marketplace-first layout.

CTA logic:
- Logged out: `Sign in to rate`.
- Logged in without rating: `Rate this product`.
- Logged in with existing rating: `Edit my rating`.

### Rating Submission

- Job: make it easy and satisfying to rate a product.
- Focal point: rating input.
- Show: product preview, overall rating emphasized first, supporting category rating rows, optional comment, submit button, progress feedback.
- Keep single-line score inputs pill-shaped; use the 18px utility-card radius for the multiline Comment field so its taller shape does not become an oversized capsule.
- Avoid: long intimidating forms, too many required fields, confusing category names, no save/progress feedback.

Form fields (keep the first rating form short):
- Look: 1-10.
- Comfort: 1-10.
- Quality: 1-10.
- Outfit: 1-10.
- Value: 1-10.
- Overall: 1-10.
- Comment: optional.

Validation:
- Numeric fields are required.
- Values must be between 1 and 10.
- Comment is optional.

### Account

- Job: show user identity, credibility, and rating history.
- Focal point: user stats and reviewed products.
- Avoid: overly social profile treatment, too many personal details, empty profile with no value.

Logged-out state should show:
- App logo/name.
- Short message.
- Sign In button.
- Create Account button.
- Forgot Password link.
- Continue browsing message.

Logged-in state should show:
- Avatar.
- Display name.
- Username.
- Joined date.
- Number of rated products.
- Rated Products link.
- Settings link.
- Terms of Use link.
- Privacy Policy link.
- Log Out button.
- Delete Account button.

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
Design a premium iOS product detail screen for Eazy Review, a sneaker review intelligence app. The screen should help users decide whether a sneaker is worth buying. Make the sneaker image and Eazy Score / Community Score comparison the main focal point. Show rating strengths, price-by-size data, and community review previews in separate clean sections. Use premium white space, clear hierarchy, and consistent score badges. Avoid generic ecommerce UI and crowded charts.
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
