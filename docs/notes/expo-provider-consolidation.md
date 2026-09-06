# Expo provider consolidation receipt

Status: Approved change applied and independently verified; host boundaries recorded. Branch codex/expo-provider-consolidation from merged55 base7458fc4.
Only the approved global curated-provider enabled field changed. No skill,
cache or application file changed.

## Recommended cut

In `~/.codex/config.toml`, change only
`[plugins."expo@openai-curated"].enabled` from `true` to `false`.
Retain `[plugins."expo@claude-plugins-official"].enabled = true`.
Do not uninstall, delete caches, copy vendor skills, edit project skill indexes,
change the repository's Claude plugin declaration, or alter MCP/auth settings.
This is a host-global Codex change, not an Eazy Review-only setting.

Consequence: use official Expo1.12.4 as the selected provider. The curated1.0.2
provider's standalone Codex Run-button setup and NativeWind5/Tailwind4 setup
recipes become unavailable from its discovery in hosts that currently load it.
Neither has an equivalent official recipe; accepting this cut must acknowledge
those losses. Existing user Run configurations are not removed. This repo has
no `.codex/environments/environment.toml`; NativeWind4.2.6 is installed.
If those specialist recipes are needed later, reconsider or temporarily enable
the provider under that task's scope; do not maintain a copied partial plugin.

## Coverage map

| Curated capability | Retained official owner |
| --- | --- |
| building-native-ui | expo-native-ui and expo-router |
| codex-expo-run-actions | None: explicit discovery loss |
| expo-api-routes | eas-hosting |
| expo-cicd-workflows | eas-workflows; local schema-validator workflow differs |
| expo-deployment | eas-app-stores, eas-hosting, eas-workflows |
| expo-dev-client | expo-dev-client |
| expo-module | expo-module |
| expo-tailwind-setup | No equivalent installation recipe: explicit discovery loss |
| expo-ui-jetpack-compose | expo-ui platform reference |
| expo-ui-swift-ui | expo-ui platform reference |
| native-data-fetching | expo-data-fetching |
| upgrading-expo | expo-upgrade |
| use-dom | expo-dom |

The independent body/reference comparison covers all13 curated entrypoints:
11 have retained capability coverage, two have named gaps. This is not a claim
of byte identity or complete recipe equivalence. Official offers23 entrypoints,
including additional EAS Observe/cloud simulator/update insight and architecture
specialists. Disabling official instead would discard those capabilities and
SDK57-specific guidance while retaining SDK55-only UI recipes. Not recommended.

Official still prescribes its own router, UI preferences, authenticated workflow
validation and feedback submission. Project contracts must remain controlling;
selecting one provider does not eliminate internal guidance conflicts. No
framework upgrade, dependency install, EAS action or feedback was executed.

## Ownership and pre-change runtime evidence

Installed snapshots:
- `~/.codex/plugins/cache/claude-plugins-official/expo/1.12.4`:23 skills,
  Codex/Claude/Cursor/Grok manifests and Expo MCP declaration.
- `~/.codex/plugins/cache/openai-curated-remote/expo/1.0.2`:13 skills,
  Codex manifest only; no MCP declaration found at root.

Pre-change desktop plugin/list reported both installed and enabled with IDs matching
the recommendation above. Official source is expo/skills git SHA
80090ccda0ce5973c1354743d1d02602664b15be. Curated registered source is instead
`~/.codex/.tmp/plugins/plugins/expo`; all13 entrypoint bodies match the cached
curated snapshot. Do not confuse registered ID, source and cache-directory name.
Repository `.claude/settings.json` separately enables official Expo. Global
Claude settings contain no Expo enabledPlugins entries. Those declarations do
not prove behavior on every host. No callable Expo MCP tool is exposed in this
session despite official's MCP declaration; no auth/connection claim is made.

Fresh bundled desktop skills/list forceReload in Eazy Review, Eazy Review Lab
and home returned23 official Expo skills and zero curated entries, with no
loader errors. This conversation's supplied catalog advertised both36 entries.
The discrepancy is observed; collision/cache/layering mechanisms remain unknown.
A fresh Codex metadata-only model probe also observed23 official entries.
CLI process-only enabled=false overrides for each provider both left23 official
entries; the negative control failed, so these are NOT valid disable proofs.
The plan therefore does not promise13 fewer live entries or a token reduction.
It removes an ambiguous enabled-provider registration and establishes one owner.

## Validation after approval

1. Re-read both provider registrations and save their exact prior values plus
   non-sensitive path/hash evidence. Abort or reassess if versions/IDs drift.
2. Edit only the curated enabled field; preserve all unrelated configuration.
3. Obtain fresh plugin/list and skills/list in all three contexts. Require
   curated disabled in registration, official enabled, retained official
   capabilities available, no unrelated skill loss or loader errors.
4. Run fresh Codex and Cursor metadata/retrieval probes: module/upgrade guidance,
   project NativeWind4 and local-development contract respected. If Cursor
   does not honor Codex config, report that boundary; do not modify Cursor or
   Claude configuration as an incidental extension.
5. If new discovery does not reflect the intended setting, restore the prior
   field and record the host-specific issue. No repeat blind toggling.
6. Record actual catalog delta and limits, then run affected documentation
   checks. Other projects' runtime behavior remains untested; no blanket claim.

Undo: restore only the original curated enabled value (true), then repeat
registration/discovery readback. Retained caches allow restoration without
reinstallation. No broad config backup containing credentials is published.

## Evidence and remaining work

Local artifacts under `.codex/experiments/expo-provider-consolidation/` include
plugin/list, three-context baseline, two inconclusive process overrides, and
fresh-catalog probe output. The old audit remains historical. No user usage history, credential values or vendor scripts were inspected.
The metadata-only model probe made no tool calls, but its host startup attempted
MCP initialization: Expo OAuth refresh was rejected (invalid_grant), and an
unrelated Astro docs server name failed validation. No token values were
exposed and no auth repair was attempted. Retaining the official skill provider
does not imply its MCP is authenticated. No installed advice is asserted to be current API
truth; comparisons describe these installed snapshots.

The subsequent [remaining audit receipt](remaining-agent-audit.md) records
Supabase/creator/review/browser dispositions and the email quarantine. The
[Otty investigation](otty-downstream-investigation.md) records the current
disabled configuration. Project #4 remains last.

## Implementation receipt

User approved the exact cut. Changed only global config
plugins."expo@openai-curated".enabled from true to false; official remains true.
Before/after hashes and one-field parsed comparison are stored in local
operation.json. Fresh plugin/list confirms curated installed but disabled and
official installed/enabled. Fresh skills/list in all three contexts has exactly
the same paths as baseline and no errors. This establishes configuration
consolidation, not a live-catalog size reduction. Caches remain untouched.
Independent verification reconstructed the exact pre-change config hash by
reversing only false->true in the curated stanza, proving other bytes unchanged.
All saved skill objects (84/79/79 total in app/Lab/home, including23 Expo) match
baseline, not merely their names. Fresh Codex read exactly official module,
upgrade, repo AGENTS and package.json and retained the supplied NativeWind4 and
development-build constraints.

Fresh Cursor reported no Expo entries in its supplied catalog. It located the
official files through filesystem searches and project notes, then read them
successfully and preserved those project constraints. This is explicit-path
retrieval evidence, NOT automatic selection or an equivalent clean four-file
probe: Cursor exceeded that read allowlist by searching extra locations and
reading the proposal. No before-change Cursor catalog was captured in this
phase, so absence cannot be attributed to this toggle. The approved Codex
registration/discovery checks pass; Cursor configuration is a separate boundary
and was not edited. No install, build, upgrade or account action was requested
by the probes. Host MCP startup behavior remains distinct from model actions.
No install/uninstall, auth repair or Project #4 write was performed. Repository
delivery contains records of these host-local changes, not a configuration replay.

Final docs checks: a clean tracked-file snapshot reports a valid graph with
86 documents, 37 dependencies, 17 tasks and 93 active files scanned. The local
checkout reports 94 because it also contains local-only notes. Secret scan
and git whitespace pass. No unrelated
application checks were needed. Two provider registrations became one enabled
provider; observed live skill-count delta is zero. Existing caches and separate
Claude configuration remain unchanged.
