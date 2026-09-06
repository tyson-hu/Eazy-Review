# Host and agent setup

[README](../README.md) · [App development](DEVELOPMENT.md) · [LLM reading map](../llms.txt)

Use this guide to set up a new workstation, connect a coding agent to this
repository, or move your own work to another machine. The repeatable baseline
is the checked-out repository plus your own local tools and accounts. Cloning
does not provision the maintainer's accounts, global agent configuration, or
hosted infrastructure.

## 1. Choose your setup

| Goal | Required | Add when needed |
| --- | --- | --- |
| Read or contribute documentation | Git, editor | One coding-agent client |
| Run the app locally | Node/npm, Docker, Supabase CLI | Browser; native toolchain for native builds |
| Use an agent on the repo | One authenticated agent client, shared instructions | Project skills for their specialized tasks |
| Agent browser work | ego lite and its ego-browser skill/runtime | Human sign-in for the particular site |
| GitHub PR or Project work | GitHub CLI and your own authorized account | Maintainer permissions for upstream settings/board writes |
| Edge Function checks | Deno | Local Supabase for database integration checks |

The documented workstation/browser path is macOS; local iOS builds need Xcode.
Web/Android contributors can use their platform's toolchain, but this guide
does not certify a Windows/Linux migration or supply a replacement browser
driver. Follow [MCP_WORKFLOW](MCP_WORKFLOW.md#mcp-setup-philosophy) for tool policy.

## 2. Clone and establish the local runtime

For a new checkout (choose your own parent directory):

```bash
git clone https://github.com/tyson-hu/Eazy-Review.git eazy-review
cd eazy-review
git status --short --branch
git log -1 --oneline
git remote -v
```

Contributors without upstream write access should clone their fork instead.
When migrating unfinished work, fetch and select its saved branch/ref before
continuing. Do not reset or overwrite an existing checkout to match this example.
Create a working branch before editing; this project's convention is `codex/`.

Install tools using their official installers/package managers. Review
[install and executable trust](SECURITY.md#install-and-setup-scripts) first:
`package.json`, `.npmrc`, the lockfile, hooks, scripts, plugins and JavaScript
configuration are executable inputs, not harmless documentation. Review them
against a trusted base before agent-host execution; otherwise use disposable,
credential-free isolation pinned to an exact SHA. A worktree alone is not isolation.

| Tool | Repository baseline | Source |
| --- | --- | --- |
| Node.js | 24 | [Node downloads](https://nodejs.org/en/download), Expo CI |
| npm | 11.17.0; accepted range `>=11.16.0 <12` | `package.json` and `.npmrc` |
| Docker | Running local engine compatible with Supabase | [Docker Desktop](https://docs.docker.com/desktop/) |
| Supabase CLI | 2.110.0 matches Database CI | [Local CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started) |
| Deno, if running Function checks | 2.1.14 matches Database CI | [Deno installation](https://docs.deno.com/runtime/getting_started/installation/) |
| GitHub CLI, if using GitHub from the host | Current supported client | [GitHub CLI](https://cli.github.com/) |

These are the repository's current pins, not instructions to upgrade an
existing checkout. `package.json` and the two CI workflows own future changes.
In the same terminal your agent will use, check:

```bash
node --version
npm --version
git --version
docker info --format '{{.ServerVersion}}'
supabase --version
```

After trust review, install the locked dependencies and preserve any existing env:

```bash
npm ci
test -e .env || cp .env.example .env
```

Do not disable `strict-allow-scripts` or use force/peer-dependency bypass flags
to make installation pass. See [install rules](SECURITY.md#install-and-setup-scripts)
if npm reports an unapproved lifecycle script.

Continue with [Local Supabase](DEVELOPMENT.md#local-supabase) to start the
backend and initialize **disposable local** data. No hosted Supabase login or
project linking is needed for this path. Reset commands replace local data;
retain any needed development data before choosing a reset. `supabase start`
and `status` can print credentials: inspect them in your private human terminal,
not agent captures, issues or shared transcripts. Agents should suppress startup
credential output as Database CI does. Set only the local public URL and
publishable/legacy anon key in the ignored `.env`; never use server credentials
in the Expo bundle. Keep the local backend running while using `npm run web`.

For iPhone signing, development builds, LAN addresses and recovery redirects,
continue with the [device guide](DEVELOPMENT.md#physical-iphone-development-and-offline-testing).
A web preview does not verify a physical device. Stop Supabase at session end.

## 3. Open the repository in one agent client

Install and sign in to your chosen client using your own account. Open the
repository root, not its parent directory or a generated native folder. Use
the client's normal approval/sandbox controls; this guide does not require
unrestricted execution or Auto Approve. GitHub/Expo credentials are separate
from the model-provider login.

| Client | Shared context in this checkout | Host setup |
| --- | --- | --- |
| Codex | `AGENTS.md`; generated wrappers under `.agents/skills/` | Open the repo as a project. Host settings/MCP live outside committed files; `.codex/` is ignored. Use [Codex documentation](https://developers.openai.com/codex/) and the installed CLI's `--help` for that version. |
| Cursor | `.cursor/rules/` and `.cursor/agents/` point to canonical contracts | Open the repo and verify rules/skills/roles are visible. MCP registry is intentionally empty. Check role model availability before delegation. |
| Claude Code | `CLAUDE.md` imports `AGENTS.md`; `.claude/skills/` wrappers | Open a session at the root. `.claude/settings.json` enables official Expo but does not install or authenticate it. |
| Gemini or another client | `GEMINI.md` points to `AGENTS.md` | If imports/discovery are unsupported, explicitly give the agent `AGENTS.md` and the relevant canonical files. |

The four committed Cursor roles are implementer, reviewer, verifier and debugger.
Their capability boundaries are useful across hosts; their model names and
configuration syntax are not portable. Choose a model available in the target
client while retaining scope and read-only boundaries. Codex custom roles are
**not** installed by cloning `.cursor/agents/`. Start with the ordinary parent
agent; add host-local roles only when needed, using the current host's format.
Do not overwrite shared role files merely to reproduce personal model choices.

### Verify project skill discovery

`skills/manifest.json` owns the five project skills; `skills/<name>/SKILL.md`
owns each procedure. `.agents/skills/` and `.claude/skills/` are committed,
generated wrappers, so a fresh clone does not need skill generation.

| Skill | When it applies |
| --- | --- |
| `interactive-preview-loop` | Simulator/mobile-web journey evidence |
| `pr-human-review` | Explain a finished PR for human acceptance |
| `pr-review-remediation` | Triage and repair existing PR findings |
| `skill-creator` | Approved project skill maintenance |
| `supabase-schema-change` | Schema/RLS/grant/database function changes |

Ask the client to list available skills, then compare the project entries with
the manifest. Confirm a wrapper resolves to its canonical file. If a skill is
on disk but absent from discovery, report that distinction, reload the project
or explicitly provide the canonical path for the task. Do not claim discovery
works just because the file exists. Ordinary work does not need a skill.

After executable trust review, `npm run check:skill-wrappers` verifies the
committed wrappers; it does not prove the client's discovery works. Do not run
`skills:generate` during onboarding or copy vendor skills into this repo.
Skill/trigger/index changes follow the separate approval procedure in AGENTS.

## 4. Connect only the capabilities you need

The current repo has an empty `.cursor/mcp.json`, no root `.mcp.json`, and no
committed Codex MCP configuration. Keep personal server configuration local;
never commit tokens, headers, account/project references or copied global files.
[MCP_WORKFLOW](MCP_WORKFLOW.md#mcp-setup-philosophy) owns this choice even where a
client supports project-scoped config. A registered server, successful login,
and successful tool call are three separate checks.

### Browser: ego lite

Install [ego lite](https://lite.ego.app/) from the vendor, complete its human
onboarding, and enable its ego-browser skill in the chosen agent client.
Importing a browser profile is optional; sign in only to sites needed for your
task. Restart the terminal/client after onboarding if its PATH has not refreshed.

```bash
command -v ego-browser
ego-browser nodejs <<'EOF'
cliLog('ego-browser ready')
EOF
```

Then ask the agent to load its installed ego-browser skill, open the public
repository in a task-owned space, read the title and close that space. This
checks actual browser interaction; the readiness message checks only the CLI.
Follow the installed skill's current task-space lifecycle. A missing runtime
or unsupported host leaves browser criteria blocked/not run until resolved;
do not silently substitute Playwright. No browser installation is needed for
ordinary source-only edits. Otty is optional; see its
[adopted workflow and limits](MCP_WORKFLOW.md#optional-otty-terminal-workflow).

### Expo: official skills and optional MCP

For Expo guidance, install the official Expo provider for your client through
[Expo's client-specific instructions](https://docs.expo.dev/skills). Claude Code's
documented command is `claude plugin install expo@claude-plugins-official`.
Use the Codex/Cursor instructions for those clients rather than translating
Claude configuration by hand. Choose one Expo provider and check for duplicate
registrations; the maintainer's recorded setup selected the official provider.
Provider catalogs evolve, so record the installed source/version and match advice
to this repo's SDK and NativeWind versions rather than automatically upgrading.

If Expo service tools are needed, [Expo MCP](https://docs.expo.dev/eas/ai/mcp/)
uses Streamable HTTP at `https://mcp.expo.dev/mcp` with human OAuth sign-in.
The official plugin can register it for Codex/Claude; check first and avoid a
second server registration. A skills-only installation is not an MCP connection.

On Codex, inspect `codex --version` and `codex mcp --help` before using a recipe;
an older CLI on PATH can differ from the desktop app. Follow the installed
client's connection UI or [current MCP configuration documentation](https://developers.openai.com/codex/mcp/).
After registration, complete OAuth in that client, reopen the session and test
a bounded documentation read. Report missing account/plan access separately.
Do not test connection by starting a build, deployment, package install or feedback submission.

The repo does not include `expo-mcp` or enable its local automation server.
Those optional native tools require separate setup/dependency review; remote
documentation access does not prove simulator or physical-device automation.
Other design/research MCPs are optional and follow the same configure, human
authenticate, discover, bounded-read sequence. Database tools may target only
local or explicitly approved development/staging environments; production
database access and agent-executed account deletion are forbidden.

### GitHub: repository access and hosted settings

For PR work, install `gh`, then use `gh auth login` interactively with your own
account. Check `gh auth status` privately and verify the selected remote:

```bash
gh repo view --json nameWithOwner,defaultBranchRef
```

Reading a public repository is not write permission. Fork contributors open
PRs from their fork; they do not need upstream settings or Project #4 access.
For authorized maintainer board work, the `project` scope and account permission
are required. Follow [the exact-write policy](DOCUMENTATION_POLICY.md#github-project-4-mirror)
and [CLI procedure](MCP_WORKFLOW.md#github-project-4-via-gh); never repair an
agent's authentication or widen scopes silently.

About, branch rules, security settings, Actions permissions and Project #4 live
on GitHub. They survive a maintainer workstation move, but a clone/fork does
not provision them. For a new repository, inspect and deliberately configure
the relevant [governance controls](AGENT_WORKFLOW.md#repository-merge-controls).
Do not point another repository's automation at the maintainer's Project #4.
Eazy Review Lab is a separate journal repository/service, not this app's backend.

## 5. Confirm the setup before assigning work

Give the agent this first-session prompt:

```text
Read AGENTS.md from this checkout. Inspect Git status, branch and remote;
preserve unrelated work. Read docs/HOST_SETUP.md and only the contracts relevant
to setup. Report repository skill discovery separately from files on disk and
MCP registration separately from authentication/tool availability. Do not print
secrets or whole host configs. Do not install, generate, change credentials,
query a production database, modify a board, publish, deploy or delete accounts.
Return the missing prerequisites and the next bounded validation step.
```

Once the executable inputs are reviewed and dependencies installed, verify
the wrappers and graph with `npm run check:skill-wrappers` and
`npm run check:agent-infra`. For a complete new app environment, the parent
may run `npm run prepare:routes` to create required route state, inspect any
tracked `tsconfig.json` drift, then run `npm run check:readonly` and `npm test`.
Preparation writes files; do not give it to a read-only verifier. Select
database, Deno or full Expo gates from [Validation](AGENT_WORKFLOW.md#validation).

Record a short private setup receipt: OS/tool versions, repository branch/SHA,
client/model, skill discovery result, connected services and environment class
(local/development), commands/results and missing capabilities. Include no
tokens, environment contents, browser profiles or global config dumps.
Passing checks on one workstation does not certify another host.

## 6. Migrate without losing work

On the old host, inspect `git status`, `git branch -vv`, `git worktree list`
and `git stash list`. Account for each unpushed branch, worktree and stash.
Push only work approved for publication; otherwise transfer it privately with
a reviewed backup or Git bundle. A bundle does not include uncommitted or
ignored files: preserve those deliberately, outside public Git. Keep the old
checkout until the new host passes its checks.

| State | Restore strategy |
| --- | --- |
| Tracked code, instructions, skills, migrations and lockfile | Clone/fetch the intended repository and exact working branch/SHA |
| Uncommitted work and stashes | Inspect and transfer privately; verify the resulting diff before discarding the original |
| `.env`, signing material and service logins | Recreate through private setup/credential storage; authenticate anew, never publish or paste into agent chat |
| `.codex/`, global client settings and extra skills | Reinstall approved providers; selectively recreate reviewed non-secret settings with new paths/models |
| `docs/notes/handoff.md` and other ignored notes | Transfer a sanitized private handoff; reconstruct status from TASKS and live PRs if absent |
| `node_modules`, `.expo`, generated `ios/`/`android/`, build caches | Rebuild from the lockfile/toolchain; do not copy architecture-specific artifacts |
| Local Supabase state | Preserve needed local data privately before reset, or regenerate disposable fixtures from migrations/seed; never use production data for onboarding |
| Hosted GitHub settings and Project board | Read back existing state; do not recreate cards or replay old approvals |

Update absolute paths, LAN addresses/recovery origins, device signing and
model selections on the new host. Verify the new checkout's SHA/diff, repeat
the discovery and bounded connection checks, and run the relevant app gates.
Only then retire the old environment. Account deletion is never a migration step.

## Troubleshooting

| Symptom | Next check |
| --- | --- |
| npm rejects the install | Match the package-manager range and inspect pending script approvals; preserve the lockfile and strict policy |
| CLI works in Terminal but not the agent app | Check the agent's PATH/version and working directory; restart it after install; do not copy another host's entire shell config |
| Skill files exist but aren't offered | Reload the client and compare its discovery with the manifest; use an explicit canonical path and label the discovery gap |
| A migrated role requests missing models or retired skills | Compare it with current committed roles/workflow; repair only host-local configuration deliberately |
| MCP appears configured but tools fail | Check active client, enabled registration, OAuth/account and actual tool availability; do not duplicate servers or weaken permissions |
| App cannot reach Supabase | Check the local engine/CLI, ignored env values and host/LAN URL; a phone's localhost is the phone |
| Missing generated route types | Parent runs reviewed route preparation, then inspects tracked drift before rechecking |
| PR is blocked although local tests pass | Inspect checks on the current PR head and hosted rules; local validation is not hosted CI or human acceptance |

This guide was checked against repository files and provider documentation on
2026-09-06. It does not claim an end-to-end install on a clean second machine.
