# Remaining agent audit — approved cleanup receipt

Status: R1/R2 approved by the user and applied on 2026-09-05. Email copy
quarantined; five exact Codex skill paths disabled. Fresh loader and file/config
readback pass; bounded model routing probes and independent verification
are complete with the limitations below. Prior approved Expo toggle remains applied. Branch
codex/expo-provider-consolidation, base7458fc4. Repository delivery contains this receipt and the ledger update; host settings
and quarantine contents remain local. Project4 remains last.

## Approved cleanup batch

### R1 — Email copy quarantine

Move only `~/.codex/skills/cloudflare-email-service/` to
`~/.codex/skill-quarantine/remaining-audit/cloudflare-email-service/`, after
recording all relative paths and hashes. Keep `~/.agents/skills/cloudflare-email-service/`.
Both trees contain six files, no symlinks; five reference files are identical.
The sole body difference substitutes Codex for Cursor in one coding-agent
example row. No unique technical content was identified in this duplicate. No inbound path dependency was
found in the bounded global/project active skill scan. No mail is sent/tested.

### R2 — Codex-only path disablements

Use supported `skills/config/write` with `enabled:false` and each exact path:

1. `/Users/tysonhu/.agents/skills/create-skill/SKILL.md`
2. `/Users/tysonhu/.agents/skills/review/SKILL.md`
3. `/Users/tysonhu/.agents/skills/review-bugbot/SKILL.md`
4. `/Users/tysonhu/.agents/skills/review-security/SKILL.md`
5. `/Users/tysonhu/.codex/plugins/cache/openai-curated-remote/build-web-apps/0.1.2/skills/supabase-best-practices/SKILL.md`

Use path selectors, never shared skill names. Preserve files and provider
installations. Do not change Cursor/Claude configuration. Do not quarantine
create-skill globally: Cursor's replacement creator availability is not proven.
Versioned provider-path disabling applies to this snapshot; a plugin upgrade
requires rechecking its new path, not a claim of permanent deduplication.

## Capability rationale and losses

| Surface | Evidence | Disposition / loss |
| --- | --- | --- |
| Generic creator | 504-line Codex-branded skill prescribes Cursor storage/default invocation, overlapping built-in authoring | Disable in Codex; project creator owns project lifecycle and bundled system creator retains generic authoring. Lose create-skill alias/examples in Codex; preserve files for other hosts |
| Review trio | 133 lines route to bugbot/security-review named roles unavailable in current Codex; only internal leaf references | Disable as a unit in Codex. Lose three command aliases, retain ordinary reviewer and security capabilities. Preserve files for Cursor's potentially supported native roles |
| Supabase performance overlap | Same34 reference names;32 byte-identical. Newer1.1.1 adds security-definer guidance; old entry links a missing partial-index filename | Disable only older build-web skill; retain newer Supabase provider performance skill and all other build-web/Supabase capabilities. No unique technical topic identified |
| Browser providers | Eazy Review already selects ego-browser; global browser plugins support other projects and distinct capabilities | Retain globally. No new wrapper or plugin-wide removal merely because project chose ego-browser |
| Supabase outer routine | Remote/setup/migration defaults conflict with project's local schema/security owner | Keep as scoped expertise; project owner already controls workflow. Do not disable whole Supabase plugin/MCP |
| Built-in/project creators | Generic authoring vs project lifecycle are separate responsibilities | Keep; do not merge into another policy layer |

Retention is not certification of vendor SQL or API examples. Scanned names
had no package ownership in `.agents/.skill-lock.json`. Only the parent review
entry references the review leaf names in the bounded global/project scan.
Unknown external projects/scripts remain outside that scan.

## Verification contract and rollback

1. Snapshot exact current per-path enabled/absent states and email hashes.
   Preserve unrelated config values; never publish a full credential-bearing config.
2. Prove retained creator and newer performance paths readable before cuts.
3. Apply one boundary, reload registration and discovery in app/Lab/home, then
   compare exact skill paths/enabled states. Capture fresh model metadata and
   bounded reads; distinguish catalog selection from fallback filesystem search.
4. Verify project skill maintenance still selects the project creator; general
   Codex authoring can use bundled creator; existing PR findings select project
   remediation; SQL reference selection can retrieve retained performance material.
   These are read-only scenarios, not actual schema/review-provider actions.
5. Restore the captured setting/absence if unsupported or unrelated capability
   is lost. Restore quarantined email directory only when original is absent,
   after hash verification. Never overwrite a newly installed copy.
6. Record actual reduction without equating file count to token/runtime savings.

Existing fresh app-server catalog includes creator/review entries but neither
Supabase provider performance entry, whereas supplied conversation metadata
includes both. That discrepancy precludes a current Supabase context-saving
claim. Do not silently disable a whole plugin to force a visible reduction.

## Otty hook evidence

Read both installed Codex and Claude wrappers in full. Codex hook registration
has PermissionRequest, SessionStart, Stop, UserPromptSubmit; Claude additionally
has PreToolUse and PostToolUse. Hooks are enabled in Codex configuration.

Executed eight cases through inspected wrappers with a parent-authored local
recorder replacing OTTY_CLI, an unused temporary socket path, and synthetic
payloads. No actual Otty CLI/socket or permission request was used:

- Codex top-level session, nested payload ID, missing-session skip and full
  base64 context forwarding on the permission branch.
- Claude Grok-event exclusion, running-subagent idle->processing conversion,
  environment session precedence and full base64 context forwarding.

All eight passed, exited0, and emitted no stdout approval response. Wrapper
hashes, synthetic arguments and results live in
`.codex/experiments/remaining-audit/hook-results.json`; harness beside it.
The callbacks are backgrounded; this test's inherited pipe closure lets the
runner observe the recorder finishing. It does not measure live IPC lifecycle.

Read-only preference-key inspection found no approval-policy keys in the
expected Otty plist. That absence does not establish a policy or a disabled
feature. The binary's interpretation of context and any auto-approval remain
unverified. Do not call the integration cosmetic, safe-by-proof or malicious.
Keep current hooks. No policy/configuration or binary patch is proposed.

Remaining hook proof must be an explicit application-level test: identify the
actual Otty approval setting and observe allow/deny/cancel for a harmless
synthetic request in an isolated terminal, with no credentials or high-impact
actions. Capture the effective outcome, not only a badge. If the app provides
no inspectable/testable interface, retain this precise external limitation;
do not simulate permission grants on a real working session.

## Audit completion map

A: structural simplification merged53. B/C: global duplicate receipt/browser
migration merged54. Agent-impact correction merged55; original thread resolved.
Expo provider: one approved toggle applied and verified, documented in the
[provider receipt](expo-provider-consolidation.md).
This remainder: R1/R2 approved and applied locally. Otty wrappers tested;
current disabled configuration was observed through real IPC; the enabled
approval engine remains an explicit untested boundary. See the
[Otty investigation](otty-downstream-investigation.md).
D2 finding-quality addition stays deferred without a concrete false-positive
case. Project4 reconciliation follows selected cleanup and final dispositions.

## R1/R2 execution receipt

The email quarantine preserved all six source file hashes and all six retained
copy hashes. Fresh discovery removed only the quarantined path. R2 used five
supported `skills/config/write` calls with exact paths and `enabled:false`;
all returned successfully. Config readback contains those five path entries.
No skill body, provider install, Cursor setting or Claude setting was edited.
All five target bodies and three retained-owner bodies match pre-change hashes.

Fresh app-server discovery across app, Lab and home has no errors. App entries
changed84→83 and enabled entries84→79; Lab/home entries79→78 and enabled79→74.
The only changes are removal of the duplicate email entry and disablement of
create-skill plus the three review aliases. Disabled entries remain in loader
inventory. Neither Supabase performance entry appeared before or after; its
exact path setting is verified, but no additional catalog reduction is claimed.
No token, speed or quality improvement was measured.

Local evidence is under `.codex/experiments/remaining-audit/`: `before.json`,
`after-email.json`, five `after-path-*.json` snapshots, fresh-process `after.json`,
and `operation.json` (pre-change skill settings, hashes and RPC receipts).
Email manifest is `~/.codex/skill-quarantine/remaining-audit/email-manifest.json`.
These local artifacts preserve operational detail and are not Git deliverables.

Rollback: verify quarantine hashes and original-path absence before moving the
email directory back; never overwrite an installed replacement. Before R2 the
skills configuration was absent. To restore its exact prior state, remove only
these five matching path records, preserving any subsequent unrelated settings
and removing an empty skills table only if still empty. Alternatively, supported
path-specific `enabled:true` restores availability but leaves explicit records
and is not byte-identical rollback. Do not restore the entire config from a
snapshot. Keep the separately approved Expo toggle unchanged.

## Final verification and routing

Independent read-only verification passed the quarantine/retained hashes,
exact five path settings and all three discovery deltas. Unrelated configuration
preservation was not independently compared against a full baseline; this proof
covers target settings, file hashes and discovery deltas.

A fresh Codex session selected the project creator, bundled system creator and
project PR-remediation skill from supplied metadata. It reported all four
disabled creator/review aliases absent. It read exactly the four permitted files
in one shell call and retrieved the retained SQL performance entry by explicit
path fallback; SQL metadata was absent. This proves retained reference access,
not successful SQL discovery or execution of any specialized workflow.

A fresh Cursor session selected project creator/remediation wrappers and still
advertised create-skill, review-bugbot and review-security. Its bare review alias
was absent; there is no before-Cursor baseline to attribute that absence to this
change. It also advertised its own cursor-public Supabase performance entry.
The Codex system/SQL paths were explicit fallbacks. Cursor rejected the requested
single shell read, then read only the first40 lines of each allowed file through
its Read tool. This supports bounded routing and entrypoint access, not full-body
loading or compliance with the one-call probe format. No configuration repair
was needed. Both probes performed no task implementation or database operation.
Model tool traces are saved as `codex-routing.jsonl` and `cursor-routing.jsonl`.
Host initialization is distinct from model actions and can start configured MCP
services; these probes do not establish credential-free process isolation.

Repository executable inputs match merged base7458fc4. Final affected checks:
`node scripts/check-agent-infrastructure.cjs` passes (86 documents,37 dependencies,
17 tasks); `node scripts/check-secrets.cjs` passes; `git diff --check` passes.
No app code changed, so app/database/browser suites were not rerun. No runtime
performance gain, full workflow acceptance or live Otty approval proof is claimed.
R1/R2 execution is complete locally. The records PR does not replay global
configuration. Human acceptance, merge and Project4 remain separate.

## Otty follow-up disposition

The [downstream investigation](otty-downstream-investigation.md) supersedes the
pending application inspection above. Otty1.4.1 reports Auto Approve disabled
and hidden. A synthetic hook reached an isolated pane as awaiting; the recorder
received zero input bytes in20 seconds. No configuration or hooks changed.
Keep hooks and disabled approval; enabled allow/deny/cancel remains untested
and conditional on future adoption. No further Otty change is recommended for
this audit. Remaining delivery is the records PR, then Project4 reconciliation.
