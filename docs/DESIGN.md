# Eazy Review Design System

## Visual Direction

Eazy Review should feel like a premium sneaker review intelligence app: sharp, trustworthy, data-rich, fashion-aware, and clean. The UI should help users make buying and rating decisions quickly, not just browse products.

Reference feel:
- Nike SNKRS product storytelling.
- StockX-level trust.
- Letterboxd-style community taste.
- Consumer Reports-style scoring clarity.

Avoid:
- Generic ecommerce UI.
- Childish sneaker-store styling.
- Heavy marketplace discount treatment.
- Spreadsheet-like rating dashboards.
- Screen-by-screen visual inconsistency.

Core visual system:
- Background: `#F7F8FA`.
- Cards: `#FFFFFF`.
- Primary text: `#111827`.
- Secondary text: `#6B7280`.
- Borders: `#E5E7EB`.
- Primary accent: `#2563EB`.
- Positive score: `#10B981`.
- Warning / markup: `#F59E0B`.
- Negative / risky: `#EF4444`.
- Reference mobile width: `393px`.
- Screen padding: `16px`.
- Card gap: `12px`.
- Card radius: `18px`.
- Button radius: `14px`.

## Layout Rules

- Design mobile-first.
- Use a small design system instead of one-off screen styling.
- Show the decision first, then the details.
- Keep dense product information scannable.
- Avoid overloaded cards.
- Use premium white space to separate product identity, score summary, price data, community proof, and actions.
- Preserve enough spacing for thumb-friendly touch targets.
- Use loading, empty, and error states for product and account surfaces.

## Typography Direction

- Use a clean system-style font direction: SF Pro, Inter, or a modern sans-serif.
- Use large bold numbers for scores and prices.
- Use medium-weight product names.
- Product names should be readable over decorative typography.
- Use small quiet metadata.
- Use concise labels for rating sections.
- Avoid marketing copy in core app surfaces.
- Avoid decorative fonts and overly playful typography.
- Use `Eazy Score`, `Community Score`, and `My Rating` exactly.

## Product Card Rules

Product cards are used in Feed, Browse, and Rated Products.

Show:
- Product image.
- Brand.
- Product name.
- SKU.
- Eazy Score.
- Community Score.
- Lowest price.

Do not add description, long metadata, comments, likes, or social UI to MVP product cards.

## Product Detail Structure

Product detail should include:
- Product image area.
- Product title area.
- Product metadata.
- Score overview.
- Price/purchase section.
- Rating breakdown.
- My Rating section.
- Description.
- Rate/Edit CTA.

CTA logic:
- Logged out: `Sign in to rate`.
- Logged in without rating: `Rate this product`.
- Logged in with existing rating: `Edit my rating`.

## Rating Display Rules

- Eazy Score and Community Score should be easy to compare.
- My Rating should be visually distinct from aggregate scores.
- Score badges should display `No score yet` when score is null.
- Category breakdowns should use a label, numeric average, and simple visual bar.
- User rating categories are look, comfort, quality, outfit, value, and overall.
- Prefer layered data: overall score first, top strengths/weaknesses second, category breakdown third, detailed reviews later.
- Avoid complex charts unless they remain clear on mobile.

Score meaning:
- `90-100`: Excellent.
- `80-89`: Strong.
- `70-79`: Good.
- `60-69`: Mixed.
- Below `60`: Risky.

## Rating Form Rules

The first rating form should be short:
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

## Reusable UI Components

Initial reusable UI components:
- `Screen`
- `Button`
- `Input`
- `Card`
- `AppText`
- `ScoreBadge`
- `ProductCard`
- `RatingRow`
- `LoadingState`
- `EmptyState`
- `ErrorState`

Keep these components small. Add abstractions only when they remove real duplication.

## Account Screen

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

## Feed Screen

MVP Feed can be simple. Use horizontal product-card sections:
- Today's Pick.
- Trending Now.
- Best Eazy Scores.
- Best Community Scores.
- Newly Added.

Do not overbuild Feed before Browse, Product Detail, and Rating work.

## Accessibility

- Use readable text contrast.
- Preserve minimum touch sizes for buttons and list items.
- Provide useful labels for icon-only controls.
- Do not rely on color alone to communicate score state.
