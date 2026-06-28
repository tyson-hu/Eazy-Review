# Eazy Review UI Design Principles

This file is the UI design brief for Eazy Review. Use it before generating screens in Stitch, implementing React Native UI, or reviewing visual output.

## Product Identity

Eazy Review is a sneaker and streetwear review intelligence app.

It helps users decide whether a product is worth buying by combining:
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
- A generic shopping app.
- A basic sneaker store.
- A childish hypebeast app.
- A spreadsheet full of scores.
- A clone of StockX, GOAT, or SNKRS.

## Core UI Promise

Every screen should help users quickly understand whether a sneaker is worth buying, why it is rated that way, and what the community thinks.

The user should be able to answer:
- Is this product good?
- Why is it good or bad?
- Is the price reasonable?
- What do real users say?
- Should I rate, save, compare, or skip it?

## Design Personality

The UI should feel:
- Premium.
- Sharp.
- Trustworthy.
- Data-rich.
- Fashion-aware.
- Community-driven.
- Clean.
- Modern.

The UI should avoid feeling:
- Cheap.
- Crowded.
- Childish.
- Overly playful.
- Generic.
- Template-like.
- Too marketplace-heavy.
- Too technical.

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

Avoid filling every empty space with badges, chips, icons, or labels. If everything is visible, nothing is important.

## Principle 3: Data Without Clutter

Eazy Review has many numbers, but it should not feel like a spreadsheet.

Show data in layers:
- Layer 1: overall score.
- Layer 2: top strengths and weaknesses.
- Layer 3: category breakdown.
- Layer 4: detailed reviews.

The full rating system should be easy to access, but not visually overwhelming.

## Principle 4: Consistent Components

Reuse the same visual patterns across screens.

Core components:
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

Colors:

```txt
Background: #F7F8FA
Card: #FFFFFF
Primary Text: #111827
Secondary Text: #6B7280
Border: #E5E7EB
Primary Accent: #2563EB
Positive Score: #10B981
Warning / Markup: #F59E0B
Negative / Risky: #EF4444
```

Typography:
- Use a clean system-style font direction: SF Pro, Inter, or a modern sans-serif.
- Use large bold numbers for scores and prices.
- Use medium-weight product names.
- Use small quiet metadata.
- Use clear section titles.
- Do not use decorative or overly playful fonts.

Layout:

```txt
Reference mobile width: 393px
Screen padding: 16px
Card gap: 12px
Card radius: 18px
Button radius: 14px
Bottom tab height: standard iOS style
Safe-area aware layout
```

Card style:
- White background.
- Subtle border.
- Soft shadow only when needed.
- Rounded but not childish.
- Clear internal spacing.
- Consistent image area.

## Screen-Level Principles

Feed / Discover:
- Job: help users find interesting products worth checking.
- Focal point: featured sneaker or trending review.
- Show: featured product, trending products, top-rated sections, category chips, and review snippets later when community text is in scope.
- Avoid: too many product grids, too many banners, marketplace discount feeling, overloaded homepage.

Browse / Explore:
- Job: help users quickly find a product, brand, or category.
- Focal point: search bar and product results.
- Show: large search bar, useful filters, product cards, sorting options, popular searches.
- Avoid: tiny filters, crowded product cards, unclear score badges, random recommendations.

Product Detail:
- Job: help users decide whether this product is worth buying.
- Focal point: sneaker image plus score summary.
- Show: hero image, brand/name, Eazy Score, Community Score, top strengths and weaknesses, rating breakdown, price by size, review previews, rate button.
- Avoid: showing all data at the same visual weight, too many badges, crowded charts, marketplace-first layout.

Rating Submission:
- Job: make it easy and satisfying to rate a product.
- Focal point: rating input.
- Show: product preview, overall rating, category ratings, optional comment, submit button, progress feedback.
- Avoid: long intimidating forms, too many required fields, confusing category names, no save/progress feedback.

Account:
- Job: show user identity, credibility, and rating history.
- Focal point: user stats and reviewed products.
- Show: avatar, rated-product count, rating history, settings links, account actions.
- Avoid: overly social profile treatment, too many personal details, empty profile with no value.

## Component Rules

Score Badge:
- Include score number, score label, and source label.
- Use consistent score color meaning.
- Display `No score yet` when score is null.

Score meaning:

```txt
90-100: Excellent
80-89: Strong
70-79: Good
60-69: Mixed
Below 60: Risky
```

Product Card:
- Include product image, brand, product name, score, and price signal or review count.
- Keep SKU visible when useful for product identification.
- Avoid putting too much information on small cards.

Review Card:
- Include user, product, rating, short opinion, and helpful action.
- The card should feel like a buying insight, not just a comment.

Rating Breakdown:
- Prefer horizontal score bars, compact category rows, expandable detail sections, and top strengths/weaknesses.
- Avoid complex charts unless they are very clear on mobile.

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

Eazy Review should look and feel like a premium sneaker review intelligence app.

The UI should combine strong product photography, clear scoring, useful community opinions, and clean buying signals. Every screen should help users make a faster and more confident decision.

The app should be visually sharp, data-rich, trustworthy, and fashion-aware while avoiding generic ecommerce layouts, childish sneaker styling, crowded rating dashboards, and inconsistent AI-generated UI.
