# Repository experience and governance — delivery evidence

Date: 2026-09-06.
Baseline: `2bc6a200fb0e4d8505b809b39083091ab1d8269d`.
Branch: `codex/repository-experience`.
Status: Local implementation and verification complete;
[draft PR #58](https://github.com/tyson-hu/Eazy-Review/pull/58) is open.
No merge or human acceptance of the finished implementation recorded.

## Scope

README and development-guide separation, community documents and issue forms,
dependency-alert dispositions, pinned Actions, CodeQL, and approved GitHub
repository settings. No application code or dependency versions changed.
Task 22's broader testing work remains unselected.

## Project #4 reconciliation

Applied the 11 exact writes approved in chat on 2026-09-06:

- T21 Confidence changed from Contract to Accepted.
- INF-04's body now reflects accepted, merged PR #48.
- INF-05–INF-12 added as fully populated Completed Infrastructure draft items
  for the accepted outcomes in merged PRs #53–57.
- The board README snapshot now identifies the inspected master commit and
  preserves Task 20's Conditional status and Task 22's unselected state.

Read back all 68 items and verified unique IDs, every field on the eight new
cards, the exact README replacement and preservation of all unapproved fields
on the original 60 cards. No schema changes, issue conversions or item deletions.
The new repository-experience initiative was separately approved for publication.
INF-13 was created as In Review after draft PR #58 opened. Readback verified
all of its approved fields/body, 69 unique IDs and all 68 existing cards unchanged.

## Dependency findings

The two medium alerts remain open. Static call-site and upstream package review
found a potentially reachable decoder path without a compatible supported
update and an unaffected uuid.v4 call in native project-generation tooling.
[Detailed dispositions and revisit conditions](../../DEPENDENCY_SECURITY.md)
preserve the limits. No overrides, vulnerability dismissal or native exploit
claim was made.

## Executable trust and workflow review

Package/lock files, validation scripts, plugins and JavaScript configuration
are unchanged against the merged baseline. Active Git hooks were absent.
The existing check and generation commands were reviewed before host use.

Pinned the current existing action refs to verified commits. Deno and Supabase
use moving v2 branch refs rather than tags; both were resolved through the
commit endpoint. CodeQL v4's annotated tag was dereferenced to its commit.
Reviewed action manifests, inputs, runtime entry points and the Supabase
composite steps, including its pinned nested Bun setup action. This records
pin provenance and workflow integration review, not a full third-party code audit.

CodeQL uses source analysis without app installation/build and checks the PR
merge ref through ordinary checkout behavior. Expo and Database retain their
exact-head checkout policy. No privileged pull_request_target trigger, deployment
credential or production environment is used.

## Hosted controls and verification

Applied and read back the approved About description and build-journal URL,
automatic deletion of merged branches, and private vulnerability reporting.
Existing topics and security settings were preserved.

The active `protect-master` ruleset targets only master with no bypass actors.
It blocks deletion and force pushes, requires a PR and resolved review threads,
and requires an up-to-date `validate` check from GitHub Actions. The approving
review count is zero for this maintainer-led repository; recorded human
acceptance remains a separate delivery requirement. Existing merge methods
remain available. CodeQL and path-filtered Database CI are not universal
required checks.

Independent review identified and resolved two documentation issues: links to
local-only plans in the published ledger and an early Supabase stop command in
the setup sequence. Independent verification passed `npm run check:readonly`:
110 tests, documentation graph, secret scanning, typecheck and lint. All seven
GitHub YAML files parsed; 188 local Markdown links/images/heading fragments
resolved across the reviewed documents. Whitespace checks passed.

The README was rendered with GitHub's Markdown API in a curated local preview
using lightweight local CSS. Desktop (1311 px) and mobile (393 px) layouts had
no horizontal overflow and loaded the existing Feed image. The
[mobile top screenshot](screenshots/readme-mobile-top.png) records that preview;
it is documentation rendering evidence, not a new native app acceptance test.
Live GitHub About and ruleset pages were also inspected.

The versioned CodeQL workflow and community files require PR publication and
merge before their default-branch surfaces can be verified. Local YAML parsing
does not establish a successful hosted CodeQL or Database CI run.

## Host and agent onboarding extension

The user requested reusable workstation/agent setup and migration guidance in
the same draft PR. [Host setup](../../HOST_SETUP.md) now covers repository versus
host state, runtime pins, client entrypoints, skill discovery, optional service
connections, a bounded first-session prompt, verification and private migration.
The root [llms.txt](../../../llms.txt) is a compact reading map, linked from the
README; it does not replace AGENTS or provision tools. No host configuration,
credentials, skills, MCP servers or package versions were changed.

Independent review found no actionable issue. Independent documentation
verification passed 59 infrastructure tests, 26 secret tests, graph validation,
secret scan and whitespace checks. All 84 local links/fragments in README,
DEVELOPMENT, HOST_SETUP and llms.txt resolve; all 21 referenced npm scripts
exist, and runtime pins match package/CI. Executable inputs are unchanged
against the trusted merged baseline.

README and host-guide rendering were inspected through a curated local preview
of GitHub Markdown API output, including a 393 px mobile viewport and a 1311 px
desktop host-guide viewport; tables scroll within the document. Provider setup
references were checked against official Codex, Expo and ego lite documentation,
and the llms.txt convention. This is documentation validation, not evidence of
an install, credential migration or live MCP connection on a clean second host.
INF-13 already describes repository onboarding and remains In Review; no
additional board writes are proposed for this extension.

## Approved draft CI gate

The cost/review audit found no automation duplicating Codex review: CodeQL,
application and database checks provide complementary evidence. Standard
Ubuntu Actions compute is free for this public repository. The approved first
stage defers Database CI and CodeQL jobs while PRs are draft, explicitly handles
readiness and draft-conversion events, and preserves full required Expo
validation, Database path filters, master/schedule triggers and concurrency.
A documentation-only classifier remains deferred.

Skipped draft jobs mean deferred coverage, not passing analysis. Review and
acceptance require the affected checks on the current ready PR head. Live
draft/readiness test results are recorded in PR #58 after publication; local
event modeling alone does not prove hosted event delivery. No board or hosted
protection settings changed for this gate.
