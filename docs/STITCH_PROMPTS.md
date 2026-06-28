# Stitch Prompts

Use these prompts for visual exploration. Stitch output is not a source of truth; selected directions must be captured in `docs/DESIGN.md` before implementation.

## Prompting Rules

Do not prompt Stitch with a vague request like `make a sneaker review app`.

Use a design-brief structure:
- Product context.
- Target user.
- Exact screen jobs.
- Required components.
- Visual system.
- Platform constraints.
- What to avoid.

For consistency, include concrete UI language such as `bottom tab navigation`, `segmented control`, `horizontal category chips`, `sticky CTA`, `score badge`, `rating category row`, and `price-size pill`.

Generate screens in small batches:
- Batch 1: Feed, Browse, Product Detail.
- Batch 2: Rating Submission, Account, Rated Products.
- Batch 3: later social, comparison, and saved-product concepts only after the MVP works.

After generating related screens, use a final refinement prompt to apply one consistent visual theme across selected screens.

## Global Design Brief

```txt
Design a premium mobile app UI for Eazy Review, a sneaker and streetwear product review intelligence app where users discover products, compare Eazy Score with Community Score, review category ratings, inspect price-by-size data, and decide whether a product is worth buying.

The app should feel premium, sharp, data-rich, trustworthy, clean, and fashion-aware, like a mix of Nike SNKRS product storytelling, StockX marketplace trust, Letterboxd-style community taste, and Consumer Reports-style scoring clarity.

Avoid a childish sneaker-store look. Avoid generic ecommerce UI. Avoid crowded spreadsheet-like rating dashboards. Avoid making it feel like a clone of StockX, GOAT, or SNKRS.

Platform:
iOS mobile app, 393px width, safe-area aware, React Native + Expo style, bottom tab navigation.

Design language:
- Background: #F7F8FA
- Card: #FFFFFF
- Primary text: #111827
- Secondary text: #6B7280
- Border: #E5E7EB
- Primary accent: #2563EB
- Positive score: #10B981
- Warning / markup: #F59E0B
- Negative / risky: #EF4444
- Typography: SF Pro or Inter-like modern sans-serif
- Score and price numbers: large, bold, high contrast
- Card radius: 18px
- Button radius: 14px
- Screen padding: 16px
- Card gap: 12px
- Shadows: subtle only
- Icons: thin, modern, consistent
- Product images: premium studio sneaker photography on clean white/gray backgrounds
```

## Product Detail Page Prompt

```txt
Design a premium iOS product detail screen for Eazy Review, a sneaker review intelligence app. The screen should help users decide whether a sneaker is worth buying.

Make the sneaker image and Eazy Score / Community Score comparison the main focal point. Show the decision first, then details.

Required sections:
1. Product hero image
2. Brand and product name
3. Eazy Score and Community Score comparison with large score numbers
4. Top strengths and weaknesses
5. Category rating breakdown using compact score bars
6. Lowest price / price-by-size module
7. Community review previews
8. My Rating state
9. Sticky Rate/Edit CTA
10. Description

Use premium white space, clear hierarchy, consistent score badges, and the global visual system.

Avoid generic ecommerce UI, crowded charts, excessive badges, social clutter, dark mode, and admin UI.
```

## Browse Page Prompt

```txt
Design a premium mobile Browse / Explore screen for Eazy Review. The screen should help users quickly find a sneaker, brand, or category and understand which products are worth opening.

Required elements:
- Large rounded search bar with placeholder "Search sneakers, brands, models"
- Horizontal filter chips for Brand, Size, Price, Rating, Style, Material
- Sort control for Highest Eazy Score, Highest Community Score, Lowest Price, Recently Added
- Product list
- Product cards showing image, brand, name, SKU, Eazy Score, Community Score, and lowest price
- Empty, loading, and error states
- Popular searches empty-state suggestions

Use the global visual system. Product cards should feel editorial and data-rich without being crowded.
```

## Rating Flow Prompt

```txt
Design a short premium mobile rating submission screen for Eazy Review. The screen should make rating feel fast, clear, and low-friction.

Fields:
- Look 1-10
- Comfort 1-10
- Quality 1-10
- Outfit 1-10
- Value 1-10
- Overall 1-10
- Optional comment

Required structure:
- Product preview
- Overall rating emphasized
- Category rating rows
- Optional comment input
- Submit button
- Save/progress feedback

Avoid long intimidating forms, extra required fields, confusing category names, and social posting clutter.
```

## Account Page Prompt

```txt
Design the Eazy Review Account tab with logged-out and logged-in states. The screen should show user identity, credibility, and rating history without becoming overly social.

Logged out:
- App name
- Short message
- Sign In
- Create Account
- Forgot Password
- Continue browsing message

Logged in:
- Avatar
- Display name
- Username
- Joined date
- Number of rated products
- Rated Products
- Settings
- Terms
- Privacy
- Log Out
- Delete Account

Use the global visual system. Keep the screen calm, useful, and account-focused.
```

## Feed Page Prompt

```txt
Design a premium mobile Feed / Discover tab for Eazy Review. The screen should help users find interesting products worth checking and surface useful community taste.

Sections:
- Today's Pick
- Trending Now
- Best Eazy Scores
- Best Community Scores
- Newly Added
- Optional review snippets for later exploration only

Use the same ProductCard design from Browse.
Make the featured product the main focal point. Do not make Feed more complex than Browse or Product Detail. Do not add comments, likes, or social reactions to the MVP implementation.
```

## Refinement Prompt

```txt
Refine the selected Eazy Review screens to look more premium and production-ready.

Make the UI less generic and less childish. Increase white space, improve typography hierarchy, make cards more editorial, and make product images feel like high-end sneaker studio photography.

Apply this consistent system:
- Background: #F7F8FA
- Cards: #FFFFFF, 18px radius, subtle shadow only when useful, 1px #E5E7EB border
- Primary CTA: #2563EB background, white text, 14px radius
- Score numbers: large, bold, high-contrast
- Category rating rows: compact, clean, data-dashboard style
- Bottom navigation: consistent tabs, thin line icons, active tab in #2563EB
- Screen padding: 16px
- Card gap: 12px

Make all screens feel like one app, not separate mockups. Preserve the difference between Eazy Score, Community Score, and My Rating.
```
