# Agent Workflow

AGENTS.md is the entrypoint. Read the section here that affects this task.
The user request and relevant task/contract define the outcome. Ordinary work
does not require selecting a loop or reading every policy owner.

## Scope and completion

Implement the authorized outcome, inspect the diff, validate affected behavior,
and update docs whose meaning changed. Do not add unrelated features or
dependencies. A behavior-preserving refactor names the public behavior and
contracts that stay unchanged and uses comparable focused checks before and
after. Preserve user edit allowlists.

Local completion means the requested local result and its applicable evidence
are ready. Human acceptance, PR readiness, merge, deployment and board sync are
distinct delivery states governed by DOCUMENTATION_POLICY. Do not claim a
later state from local checks. Report what changed, why, actual validation,
limitations and the remaining decision in the format useful for this task.
Use .github/pull_request_template.md for PRs. Explain architecture when it helps
the review or the user asks; no mandatory teach-back exercise or heading quota.

## Validation

SECURITY.md owns executable trust. Review package scripts/hooks, tests,
JavaScript configs and affected validation inputs against a trusted base before
host execution; otherwise use exact-SHA disposable credential-free isolation.
An isolated worktree alone is not a security sandbox. Inspect commands in
package.json; do not invent missing scripts or install tooling incidentally.

Use focused checks during implementation. For the final tree select the rows
below that cover the change. Reuse a passed result while its relevant inputs
are unchanged; after an edit rerun affected checks, not every unrelated lane.
Honor explicit broader check requests and required exact-head delivery gates.

| Change or evidence | Check / owner |
| --- | --- |
| Spelling/literal copy only, no behavior, parsed field, contract, command, policy, generated content or metadata change | Intended diff and git diff --check; inspect specific layout/accessibility effect if relevant |
| Documentation only | Affected structural check below; no unrelated app checks |
| Canonical skills, manifest, wrappers, generator | Approved generation via npm run skills:generate; npm run check:skill-wrappers |
| ADR/index inputs | npm run decisions:build when generating; npm run decisions:check |
| Registered document graph, mirrors, task metadata | npm run check:agent-infra; impact --report is review input, not a blanket read/edit list |
| Type/logic or code style | npm run typecheck; npm run lint when style/imports change; focused existing npm test coverage for meaningful behavior |
| Finished code beyond copy-only, executable config or validation-contract change | npm run check:readonly once for relevant final inputs; contains wrapper/decision/secret/graph/type/lint checks |
| Routes/config requiring generated route state | Parent runs npm run prepare:routes, then checks tracked tsconfig.json drift |
| Full Expo gate when task, route/dependency change or release requires it | Parent runs npm run check:expo (check is its alias); includes preparation, readonly, frontend tests, Doctor and alignment |
| Database types | Local Supabase only; npm run types:generate / npm run types:check |
| Database/migration behavior | Schema workflow; local disposable npm run test:db:reset as applicable |
| Edge Function behavior | npm run check:functions; not covered by Node/Expo gates |
| Interactive/native evidence | interactive-preview-loop; automated checks do not establish native/physical acceptance |

Expo Doctor/dependency alignment can depend on host cache access. Use an
environment allowed by the trust rule and report cache/permission limitations;
never infer alignment from a blocked or partial check. Package scripts own exact
command composition; keep this selection map synchronized when it changes.

## Repository merge controls

Repository merge controls are described in the
[repository governance decision](decisions/2026-09-06-repository-governance.md).
The `protect-master` ruleset requires PRs, an up-to-date branch, the GitHub
Actions `validate` check and resolved conversations. It blocks force pushes
and deletion without bypass actors. Zero required GitHub approval reviews
supports the maintainer-led workflow; recorded human acceptance still follows
DOCUMENTATION_POLICY. Verify hosted rules before relying on their enforcement.

Database CI remains path-filtered and must pass for affected changes; it is
not a universal required check. CodeQL analyzes JavaScript/TypeScript and
Actions on PRs to master, master pushes and a weekly schedule. It does not
replace application, database or human checks. Do not enable duplicate CodeQL
default setup alongside the versioned workflow or require its check names
before observing successful runs. External Actions are pinned to full SHAs;
weekly grouped Dependabot PRs propose updates for review.

## Delegation and independent checking

Delegate when isolation, independent judgment or parallel work is worth its
cost. Children receive outcome, exact edit boundary, acceptance evidence and
relevant constraints/references; do not require eleven labeled fields. Missing
authority or an essential requirement blocks dependent work; a missing heading
does not. Supply self-contained scope because context/model behavior varies
by host. Use available configured models and role capabilities.

Parent owns integration, scope and acceptance. Explicitly bounded non-sensitive
implementation may be delegated. Integrated auth/private-data/recovery/deletion
and schema/security work remain parent-owned. Children cannot accept themselves
or expand their file boundary; return needed scope changes to the parent. The
parent can extend its own child packet within the user's authorized outcome,
but cannot waive a user-imposed allowlist or authorize a new product/external action.

Meaningful code or contract changes receive one integrated independent review
and final verification. Per-leaf review is conditional on distinct risk or
integration needs, not automatically additional to the integrated pass. A
verifier is read-only and does not run intentionally mutating preparation.
Fix accepted findings; re-review only materially changed behavior when needed.
Existing PR finding work is owned by pr-review-remediation, including its
separate provenance and review/repair budgets; do not restart it from this section.

## Failed checks and progress

For a reported defect, establish expected behavior and reproduce the failure;
trace the cause, make a focused correction, and verify the original and nearest
dependent behavior. Preserve a meaningful regression test where appropriate.
Within PR remediation, return evidence and status needs to that outer owner;
do not change its epoch, ledger, ADR, or GitHub scope from an inner repair.

Classify failures as caused by the change, pre-existing, environmental, uncertain
or blocked. Direct causation evidence is required before fixing within this
task. Preserve exact redacted command/error evidence. Compare with a safe clean
base when useful; never stash or discard user work for a comparison.

After two unsuccessful evidence-backed repairs of the same failure, pause that
repair path and reassess cause/scope. The parent may use one bounded isolated
diagnosis with at most two hypotheses; do not recycle hypotheses or reset that
budget through new child tasks. If unresolved, record the blocker and needed
decision. Unrelated authorized work may continue. A new materially different
failure requires classification, not an automatic restart or user interruption.

Update the linked working plan during long work. Use docs/notes/README.md for a
handoff or blocker record when interrupted, changing tasks, reaching a real
approval boundary, or losing useful context. Investigation→implementation and
backend→UI within the same authorized outcome are checkpoints, not mandatory
new sessions. On resumption compare the recorded SHA/state/next action with the
current tree and user request. TASKS owns durable task status; decisions belong
in ADRs only when they change a durable high-impact contract.
