---
id: decision-keep-mvp-offer-payloads-single-currency
date: 2026-07-25
status: accepted
area: data-supabase
tasks: [11, 13, 14]
pr: 14
tags: [currency, offers, pricing, supabase]
supersedes: []
---

# Keep MVP offer payloads single-currency

## Context

Product Detail and Browse need one lowest-price value, but comparing raw numeric
amounts across currencies is incorrect without a trusted conversion source,
timestamp, and rounding policy. The MVP schema and seed plan currently support
USD offers only.

## Decision

Keep each product's MVP offer payload single-currency. The Task 11 schema
allowlists `USD`, and Task 13 normalizes seed values before insert. Task 14
adapters omit or reject mismatched-currency rows before calculating a lowest
price; they never take a numeric minimum across currencies.

Browse carries the selected ISO 4217 code beside the amount as
`ProductCardData.lowestPriceCurrency`, and all cards use currency-aware
formatting. Existing mock catalog prices are treated as USD until the connected
offer mapping replaces them.

## Consequences

- Browse and Detail display the same currency for a product's selected offers
  and lowest price.
- The MVP does not perform exchange-rate conversion or silently compare unlike
  monetary units.
- Supporting another currency requires deliberately expanding the schema
  whitelist and preserving the one-currency payload rule, or superseding this
  decision with a grouping/conversion contract.

## Revisit when

The product needs simultaneous multi-currency offers and has chosen either
currency grouping or an auditable conversion source with rate timestamps,
rounding, and failure behavior.

## Related

- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `src/types/product.ts`
- `src/utils/formatPrice.ts`
