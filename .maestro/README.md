# Local iOS Maestro candidate — blocked

T-0003 stopped after the permitted repair for the native Save Password modal
failed on a later run. `critical-flow.yaml` is a reproducible failing candidate,
**not an accepted or passing smoke test**. Do not resume it without the upstream
decision recorded by Dispatch Hub. See
[`RESULT.md`](../docs/evidence/t-0003-maestro/RESULT.md) for evidence and limits.

## Reviewed tooling

Maestro CLI 2.10.0 includes the MCP server. Installation used the official
[release archive](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.10.0),
not remote pipe-to-shell. Download `maestro.zip` from that release, verify SHA-256
`29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991`
against the release asset metadata and official
[Homebrew formula](https://github.com/mobile-dev-inc/homebrew-tap/blob/HEAD/Formula/maestro.rb),
and review `maestro/bin/maestro` before extracting and executing it. The tested
runtime was Java 21.0.2. Official references:
[installation](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli),
[MCP](https://docs.maestro.dev/get-started/maestro-mcp).

MCP was launched as `maestro mcp --no-viewer --working-dir=<this-worktree>` and
controlled through stdio JSON-RPC initialize, tools/list, and tools/call. The
agent used `inspect_screen` and `run` against an explicit simulator UDID. Inline
`run` YAML required an `appId` header and `---`. No global MCP configuration,
cloud service, or browser automation was used for native interactions.

## Reproduction after a new upstream authorization

Use an isolated worktree with reviewed executable inputs and dependencies.
Require Docker, local Supabase CLI, Xcode, a booted simulator, Java, and the
reviewed Maestro binary. This candidate reserves project `eazy-review-t0003`,
ports 55320–55329, and Metro port 8087; do not reuse those for unrelated data.

```sh
python3 scripts/maestro-local.py start
python3 scripts/maestro-local.py fixture
npm run start:dev-client -- --localhost --port 8087
# In a second terminal, after selecting an available simulator UDID:
EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 npm run ios -- --device <SIMULATOR_UDID> --no-bundler
python3 scripts/maestro-local.py run --maestro <REVIEWED_MAESTRO_BINARY> --device <SIMULATOR_UDID>
```

`fixture` creates a fresh confirmed synthetic account and published synthetic
product on `http://127.0.0.1:55321`; it copies existing migrations but skips catalog
seed data. It refuses linked projects, other API URLs, `.env`, or replacement of
an unrelated `.env.local`. It never resets another stack or deletes accounts.
Privileged HTTP requests disable proxies and reject redirects. The app receives
only the local public anon key. Do not supply hosted credentials.

The flow uses existing testIDs, the visible login gate, and all ten half-step
controls. Its intended expectations are score 5 after ten 0.5 values, then score
6 after editing Appearance to 1.5, with app restarts before each readback.
`run` would additionally verify the exact dedicated user's stored row after a
passing flow. **These save/readback expectations have not been reached.**

Maestro logs evaluated input values. The wrapper uses a private ignored
`.maestro/.local/` directory and scrubs disposable credentials from text artifacts
when the process exits. Do not inspect/share live raw logs or authentication
screenshots; interrupted or killed runs require a credential review before use.
Only curated non-sensitive evidence belongs in Git. The fixture JSON and local
public env remain ignored. Do not run Maestro directly with fixture credentials.

Stop the task-owned Metro process, then run
`python3 scripts/maestro-local.py stop` to stop only the dedicated stack. This
retains disposable volumes and performs no account deletion. The host's other
Supabase stack must remain untouched.

Offline safety regression: `python3 scripts/test-maestro-local.py`.
Project validation: `npm run check:readonly`. No new CI trigger is installed.
