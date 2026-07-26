# supabase-schema-change

Goal: plan or apply one authorized Supabase schema, migration, RLS, grant, or
database-backed contract change without duplicating the canonical SQL contract
inside the skill.

## When to use

- A task needs SQL, a migration, RLS, Data API grants, database functions,
  triggers, or a database-backed contract change.
- A Supabase review needs to verify a planned or implemented schema packet.

## When not to use

- Frontend-only types or mock data: use `skills/product-data-modeling`.
- A screen that only consumes an existing contract: use the matching UI or
  feature skill.
- Remote production database work: agents never perform it.

## Inputs expected

- One named task or bug and its allowed file scope.
- Whether the user authorized planning only or implementation.
- Whether existing data or an already-applied migration is affected.

## Read first

- The named task in `docs/TASKS.md`.
- Affected sections of `docs/DATA_MODEL.md` and `docs/API_CONTRACTS.md`.
- `docs/SECURITY.md` for environment, secret, and production boundaries.
- The installed Supabase CLI version and current official guidance when
  implementation is authorized.

## Routine

1. Restate the packet boundary and authorization level. Planning-only work
   stops at contracts; it does not initialize Supabase, install tooling, create
   or apply migrations, or touch a remote project.
2. Treat `docs/DATA_MODEL.md` as the only schema/RLS/grant contract. Resolve a
   conflict there instead of adding a second copy to this skill or a rule file.
3. When implementation is authorized, discover the current CLI command with
   `--help`, create a new migration through the CLI, and never edit an applied
   migration.
4. Implement only the named task's migration boundary. Follow the Task 11 /
   Task 12 ordering and authorization matrix in `docs/DATA_MODEL.md`; do not
   move policies or grants across packets.
5. Keep secrets out of files, output, Expo, and screenshots. Use local by
   default; staging requires the packet's explicit authorization; production
   is forbidden.
6. Update affected canonical docs and frontend contracts in the same branch.
   Do not change UI or mock behavior unless the task explicitly owns it.
7. Run the narrowest local schema/authorization checks plus project validation,
   then complete the documentation gate.

## Verification

- Diff contains only the allowed packet.
- New SQL matches `docs/DATA_MODEL.md` line by line.
- Local migration apply/reset succeeds when implementation is in scope.
- Required RLS, privilege-inventory, function-execution, and authorization
  scenarios for the task pass.
- A planning-only change is reported as not applied or runtime-tested.
- No production access occurred and no service-role secret entered the client.

## Stop conditions

- Authorization is planning-only but an install, initialization, migration, or
  remote action would be required.
- The change would drop/rewrite data or edit an applied migration without
  explicit destructive-change approval.
- Required SQL/RLS/grant behavior conflicts with the canonical data model.
- A service-role secret would enter the client or any production database
  access would occur.
- Two failed fixes leave a schema or authorization test unresolved.

## Memory step

- Update the task status or discovered follow-up in `docs/TASKS.md`.
- Record only a new durable high-impact data/security decision in
  `docs/DECISIONS.md`; routine implementation and validation are not decisions.

## Common mistakes

- Treating RLS as a substitute for Data API grants, or grants as a substitute
  for RLS.
- Copying table/policy details into this skill or `.cursor/rules` until they
  drift from `docs/DATA_MODEL.md`.
- Calling planning SQL implemented or validated without a local database run.
- Smuggling UI, seed, auth, dependency, or future-task work into a schema
  packet.
- Trusting default function execution privileges for a privileged helper.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe
/ What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
