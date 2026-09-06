---
id: decision-repository-governance
date: 2026-09-06
status: accepted
area: tooling-ci
tasks: []
pr: 58
tags: [ci, repository, security]
supersedes: []
---

# Protect master with proportional repository controls

## Context

The public repository had no master protection rule. Its existing Expo
`validate` job runs for every PR, while Database CI is intentionally
path-filtered. The project is maintained by one person and already requires
recorded human acceptance and resolution of review threads before merge.

## Decision

Use an active `protect-master` branch ruleset scoped to `refs/heads/master`,
with no bypass actors. Require a PR, an up-to-date branch, `validate` from
the GitHub Actions app and resolved conversations. Block force pushes and
branch deletion. Keep merge, squash and rebase available; do not require
linear history, signed commits, deployments or a merge queue.

Require zero GitHub approval reviews, with stale approvals dismissed, without
requiring code-owner or latest-push approval. This does not waive the separate
human-acceptance and review policy. Requiring another write-access reviewer
would block the current sole-maintainer workflow.

Pin external Actions to full commit SHAs and review weekly grouped Actions
Dependabot PRs. Preserve the Expo dependency strategy and existing security
updates. Use one versioned CodeQL workflow for JavaScript/TypeScript and
Actions, with minimal permissions and no application installation or build.
Keep private vulnerability reporting available, with the canonical public
reporting policy in docs/SECURITY.md.

Defer Database CI and CodeQL jobs on draft PRs, explicitly triggering on
`ready_for_review` so readiness runs them without a new commit. Preserve
Database path filters and all master/scheduled behavior. Converting to draft
triggers cancellation through the existing concurrency groups. Keep the full
required Expo `validate` job on every PR update; do not path-filter or skip it.
This reduces iteration time, not compute charges: standard hosted Actions
runners are free for this public repository. A docs-only classifier is deferred.

## Consequences

Routine changes are reviewable PRs with a stable required check. Database CI
still must pass for affected changes, but a path-filtered workflow cannot be
a universal required check: skipped workflows may never report a result.
CodeQL provides an additional signal and is not a substitute for runtime
checks or human acceptance. No new CodeQL check is required before successful
hosted runs establish its actual behavior and identity.

A skipped draft analysis is deferred coverage, not a successful database or
security test. Require the affected checks on the current ready PR head before
acceptance/merge. These deterministic checks complement Codex review; their
execution does not depend on an external reviewer finishing.

Rulesets and reporting settings live on GitHub. Merging this document does
not apply them; authorized changes require separate hosted readback. An
administrator can edit repository settings, so “no bypass actors” is not a
claim of immutable administrative control.

## Revisit when

A second regular reviewer joins, workflow names or trigger paths change, or
a reliable always-reported database gate becomes necessary. Reassess required
checks before renaming/removing a job. Revisit an Action pin when Dependabot
proposes an update; review its source and applicable CI before accepting it.

## Related

- [Agent workflow](../AGENT_WORKFLOW.md)
- [Documentation and acceptance policy](../DOCUMENTATION_POLICY.md)
- [Security policy](../SECURITY.md)
- [GitHub ruleset options](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Skipped required checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)
