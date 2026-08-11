---
id: decision-sneaker-10-v1-shared-rubric
date: 2026-08-09
status: accepted
area: data-supabase
tasks: [17]
pr: null
tags: [community-score, eazy-score, methodology, ratings, supabase]
supersedes: []
---

# Use one sneaker-10-v1 rubric for Eazy, Community, and My Rating

## Context

Physical-device Task 17 testing showed a correctness defect: users entered
Overall on a 1–10 scale while ScoreBadge/getScoreLabel treated values as 0–100.
A score of 9 displayed as "Risky" (9/100). Eazy assessments also used a richer
dimension set than the user six-field rubric, so Eazy Score and Community Score
were not comparable category-by-category. Silently converting ranges (for
example multiplying values ≤10 by 10) would corrupt legitimate low 0–100 scores.

## Decision

Eazy Score, Community Score, and My Rating share one methodology version:
`sneaker-10-v1`.

Ten equal-weight dimensions (0–10, half steps, 0 valid, null unanswered):

1. look (Appearance)
2. outfit (Styling)
3. material (Materials)
4. craftsmanship (Craftsmanship)
5. maintenance (Care — 10 = easy to maintain)
6. comfort (Comfort)
7. collection (Collectibility)
8. value (Product Value — 10 = strong value vs execution, price, concept)
9. resale_potential / resalePotential (Resale Potential — 10 = strong retention/upside)
10. acquisition_ease / acquisitionEase (Acquisition Ease — 10 = easy to obtain)

Composite scores are always 0–100 and never user-entered:

```
composite = round(sum of ten dimensions)
```

which equals `round(average(dimensions) * 10)`.

- Clients write only dimensions and optional `private_note`.
- Server-owned triggers derive `score` and force `methodology_version`.
- Community Score uses the same formula on unrounded means of each dimension
  (sum of means, then round).
- Ratings from other methodology versions are not silently mixed into aggregates.
- Manually entered overall and the reduced user quality field are retired.
- Schema changes are forward-only; previous migrations are not edited.

## Consequences

- Product Detail can show 1:1 Eazy vs Community category rows and matching
  composites.
- ScoreBadge-style APIs must take explicitly named 0–100 composites, never raw
  dimensions.
- Existing pre-v1 local `user_ratings` rows cannot be remapped honestly and are
  cleared by the Task 17 migration; seed fixtures use deliberate dim values.

## Revisit when

Weights become non-equal, dimensions change, or a second concurrent methodology
must be published to clients.

## Related

- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md` (Task 17)
- `docs/decisions/2026-06-28-server-owned-community-score.md`
