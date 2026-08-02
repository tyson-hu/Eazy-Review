# Tasks 11–12 Database Acceptance — Historical Record

This file preserves the dated implementation and acceptance record for the
database foundation. Current schema, RLS, grant, trigger, and frontend mapping
contracts live in `docs/DATA_MODEL.md`, `docs/SECURITY.md`, and
`docs/API_CONTRACTS.md`. This evidence is historical and must not be treated as
a current task ledger.

## Scope and environment boundary

- Task 11 established the deny-by-default seven-table schema and trigger-owned
  Community Score behavior.
- Task 12 added the complete RLS policy set and explicit least-privilege Data
  API grants.
- Local and separately authorized staging acceptance were completed.
- No production database read, write, migration, seed, or credential action
  occurred.
- Expo remained disconnected from Supabase at acceptance.

## Task 11 migration chronology

The four forward-only Task 11 migrations were:

1. `20260727213403_task_11_core_schema.sql`
2. `20260728001835_task_11_review_hardening.sql`
3. `20260728115256_prevent_rating_lock_inversion.sql`
4. `20260728162303_order_rating_advisory_lock_keys.sql`

Local acceptance on 2026-07-28 passed 183 pgTAP assertions plus the
same-product writer race and the overlapping multi-product rating-delete race.
The harness used deterministic fixture users and never deleted `auth.users`.

The explicitly authorized staging acceptance on 2026-07-28 confirmed:

- parity for all four migrations;
- RLS enabled on all seven exposed tables;
- zero client policies and zero prohibited effective table/helper privileges;
- both required trigger-only `SECURITY DEFINER` functions with hardened search
  paths and denied client execution;
- replacement of the old row trigger with three statement triggers using
  transition tables;
- stable ordering by actual 64-bit advisory-lock keys; and
- transaction-rolled-back profile/aggregate behavior with no fixture residue.

Linked public-schema lint reported no errors. Production was not touched.

## Task 12 authorization acceptance

Task 12 added the fifth forward-only migration:
`20260729214448_task_12_least_privilege_rls_grants.sql`.

Local acceptance on 2026-07-29 passed seven pgTAP files with 418 assertions,
including 268 exact policy/privilege/helper checks and 70 authorization
behavior scenarios, followed by both Task 11 concurrency races. Public-schema
lint, the secret scan, typecheck, lint, decision checks, skill-wrapper checks,
Expo Doctor (20/20), dependency alignment, and the full repository gate also
passed after the separately scoped Expo SDK 57 patch alignment.

The separately authorized staging acceptance on 2026-07-29 applied only the
Task 12 migration, with no seeds or test roles. It confirmed migration parity,
an empty post-apply dry run, clean linked security advisors and schema lint,
all 16 policies, exact effective table/column privileges, helper execution
denial, anonymous/owner behavior, unpublished-product rules, trusted
server-role aggregate side effects, and zero fixture residue. Hosted pgTAP was
unavailable to the linked runner, so the approved fallback used direct,
transaction-rolled-back catalog and authorization checks.

Production was not touched.
