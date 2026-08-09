# Task 17 — My Rating Persistence And Rated Products

## Status

**Task 17 — implementation complete for human review. Not accepted. Not merged.**

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly / check) | **PASS** (see commands below) |
| Local database (`npm run test:db:reset`) | **PASS** — 8 pgTAP files / 456 tests; concurrency harness pass |
| Simulator / web mobile preview | **Not run** in this session |
| Physical iPhone | **PENDING HUMAN** |
| Human acceptance | **NOT CLAIMED** |
| Merge | **NOT AUTHORIZED** |

## Branch and SHAs

- Branch: `agent/task-17-my-rating-persistence`
- Starting SHA: `75967c820dc950c66ed05fdd85f811f7c9fe9ce2` (Task 16 merge / PR #35 on `master`)
- Ending SHA: recorded at PR open / final commit on branch

## Scope delivered

1. **Cleanup:** Task 16 Done (merged PR #35); Task 17 authorized/in progress in active status docs.
2. **Connected My Rating API:** `getUserRating`, `saveUserRating` (read → update/insert → 23505 update recovery; no PostgREST upsert), `getUserRatedProducts`.
3. **Query keys:** `ratingKeys.mine(userId, productId)`, `ratingKeys.ratedProducts(userId)`; public catalog keys unchanged.
4. **Invalidation after save:** product detail, product list, My Rating, Rated Products — server truth only for Community Score.
5. **Rate / Edit UI:** `app/product/[id]/rate.tsx` with Private note (max 500), whole scores 1–10, duplicate-submit guard.
6. **Product Detail:** public `useProductQuery` + owner `useUserRatingQuery`; Rate/Edit CTA.
7. **Account + Rated Products:** count/link + `app/account/rated-products.tsx`.
8. **Isolation:** user-scoped rating keys remain under `USER_SCOPED_KEY_ROOTS` (Task 16 path).

## Security / privacy notes

- Identity columns never appear in UPDATE payloads (`user_id`, `product_id`, `id`, timestamps).
- Private note is owner-only and excluded from Rated Products list view model.
- No service-role credential in Expo.
- Client never writes `rating_aggregates` or computes Community Score.
- Schema / RLS / grants / migrations: **unchanged**.

## Automated commands run

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 31 suites, 218 tests |
| `npm run check:readonly` | PASS |
| `npm run check` | PASS (including Expo Doctor 20/20, deps up to date) |
| `npm run test:db:reset` | PASS — pgTAP 456 tests; concurrency harness 2 scenarios |
| `git diff --check` | PASS |

## Explicit non-claims

- Physical-device journey: **PENDING HUMAN**
- Human acceptance: **NOT CLAIMED**
- Merge: **NOT AUTHORIZED**
- Task 18: **not started**
- Staging: **untouched**
- Production: **untouched**
- Dependabot PR #30: **untouched**
