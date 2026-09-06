# Global skill cleanup — candidate B

Status: Implemented, independently verified and human accepted in PR #54 on 2026-09-05. User selected
this phase after accepting candidate A. Branch: `codex/global-skill-cleanup`,
base `39a28a6bc1831305dcfbc82ced9c430f9e5bfc00` (merged PR #53).
Project #4 remains deferred by the user. User authorized combined B/C PR delivery.

## Operation receipt

Eight byte-identical installations (354 files) moved from `~/.codex/skills/`
to `~/.codex/skill-quarantine/2026-09-05-candidate-b/`. Active copies retained
unchanged under `~/.agents/skills/`:

- agents-sdk (20 files)
- cloudflare (321)
- durable-objects (4)
- sandbox-sdk (3)
- web-perf (1)
- workers-best-practices (3)
- wrangler (1)
- vibe-usage (1)

Each pair matched by relative path and SHA256 before moving; no symlinks.
The quarantine `manifest.json` records original, retained and backup paths,
per-file hashes and operation status. Backups remain recoverable; no skill
capability or plugin was intentionally removed. This removes eight redundant
non-plugin discovery entries in fresh Codex catalogs, not eight skill names.
No measured runtime token, latency or monetary saving is claimed.

## Validation and observations

- Fresh desktop-bundled Codex 0.153.3 app-server `skills/list`, with
  `forceReload: true`, checked Eazy Review, Eazy Review Lab and home contexts.
  After each individual move, exactly its redundant path disappeared; no
  other path disappeared or appeared and loader errors stayed empty. Final
  catalogs retain one non-plugin `.agents` entry for each of the eight names.
- Fresh Cursor Ask probes before/after the Wrangler move selected and read
  the old `.codex` then retained `.agents` entry successfully.
- Final fresh Codex and Cursor probes both read retained `agents-sdk/SKILL.md`
  and its linked `references/state-scheduling.md`. These were retrieval
  tests; no scheduling, deployment or usage-sync command was executed.
- Cursor reports seven retained `.agents` entries and its existing separate
  `.claude/skills/vibe-usage` entry. That Claude copy was not part of the eight
  pairs and remains untouched. Distinct plugin entries remain advertised.
- Static Markdown relative-link scan: 987 resolving links, three pre-existing
  missing Cloudflare targets (`../websockets/README.md`, `../access/`,
  `../warp/`), also missing in the unchanged quarantine copy. This scan does
  not cover every possible plain-text or executable reference.
- Bounded scans found no inbound removed-path references in global active
  skill/rule roots, active Eazy Review/Lab instructions, or the inspected
  host configuration files. No package ownership metadata for these copies
  was found; the detected `.agents/.skill-lock.json` owns other skills.

Artifacts: `.codex/experiments/global-skill-cleanup/` contains baseline/final
and per-move loader JSON, read-only loader probe, reference checks, and fresh
Codex/Cursor JSONL traces. These and the quarantine are local, outside Git.
The older Homebrew Codex CLI was not substituted for the desktop loader.

Independent read-only review approved the bounded operation: all 354 retained
and quarantined files match the manifest; surviving loader metadata is
unchanged across all three contexts. Direct agent-infrastructure validation
(86 documents, 37 dependencies, 17 tasks, 89 active files), secret scan and
Git whitespace check pass. No executable repository inputs changed.

## Limits and exclusions

Fresh CLI/loader evidence does not prove attachment in every already-open IDE
session or behavior in arbitrary repositories/external consumers. Existing
conversation catalogs may remain stale until a fresh session. Codex still reports description truncation and an experimental-feature warning;
retrieval succeeded, but context-budget pressure is not established as resolved.
Retained file
contents are identical, but their upstream technical advice was not audited.
Distinct plugin versions, vendor caches, nonidentical cloudflare-email-service,
hooks, preview-driver candidate C and application code are outside this cut.

## Undo

For each manifest item, verify its original path is still absent and the
quarantine file set and SHA256 values still match the manifest. Move that
quarantine directory back to the exact original path without overwriting any
new installation; leave the retained `.agents` copy in place. Force-reload
Codex discovery and confirm both original and retained entries return. If
another installer has recreated the original, compare first; do not overwrite.

## Resumption

Implementation, independent review and targeted documentation checks are complete.
B is local host maintenance: a repository PR can preserve its receipt,
but cannot apply or undo these global directory moves on another host.
Remaining audit work includes distinct global/plugin overlaps, preview-driver
candidate C and downstream hook evidence. Select the next bounded scope before
changing those systems. Keep Project #4 until the end as requested.
