# Local iOS Maestro smoke

T-0003 revision 2 resumes the R1 candidate under the upstream REWORK decision.
The flow dismisses the native Save Password dialog immediately after login,
before any business assertion. Its initial diagnostic run passed the complete
journey; committed repeatability evidence is recorded in
[`the revision 2 result`](../docs/evidence/t-0003-maestro-r2/RESULT.md).
The [R1 evidence](../docs/evidence/t-0003-maestro/RESULT.md) remains historical.

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

## Fixed local preconditions and reproduction

Use an isolated worktree with reviewed executable inputs and dependencies.
Require Docker, local Supabase CLI, Xcode, a booted simulator, Java, and the
reviewed Maestro binary. This candidate reserves project `eazy-review-t0003`,
ports 55320–55329, and Metro port 8087; do not reuse those for unrelated data.
The fixed device is iPhone 18 Pro / iOS 27.0,
`B5343C0A-1D6E-4FA5-9C7D-B201CD0B38D0`, with development app
`com.tysonhu.eazyreview.dev`. Reuse the installed R1 build when native inputs are
unchanged; restart Metro after JavaScript changes. Password-manager/AutoFill
settings were not changed: the tested
environment presents Save Password and the flow requires visible `Not Now`
within 10 seconds. Other prompt configurations are outside this fixture.

```sh
python3 scripts/maestro-local.py start
python3 scripts/maestro-local.py fixture
npm run start:dev-client -- --localhost --port 8087
# Build only if the dedicated development app is absent or native inputs changed:
EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 npm run ios -- --device <SIMULATOR_UDID> --no-bundler
# In a second terminal, once Metro is ready; repeat BOTH commands for each run:
python3 scripts/maestro-local.py fixture
python3 scripts/maestro-local.py run --maestro <REVIEWED_MAESTRO_BINARY> --device <SIMULATOR_UDID>
```

`fixture` creates a fresh confirmed synthetic account and published synthetic
product on `http://127.0.0.1:55321`; it copies existing migrations but skips catalog
seed data. It refuses linked projects, other API URLs, `.env`, or replacement of
an unrelated `.env.local`. It never resets another stack or deletes accounts.
Privileged HTTP requests disable proxies and reject redirects. The app receives
only the local public anon key. Do not supply hosted credentials.

The flow uses existing testIDs, the visible login gate, and all ten half-step
controls. Its expectations are score 5 after ten 0.5 values, then score
6 after editing Appearance to 1.5, with app restarts before each readback.
Score assertions use the invisible `my-rating-score` identifier on My Rating.
`run` additionally verifies all ten
stored dimensions, methodology, composite and exactly one dedicated rating row.
Browse uses its existing search field to filter by the fixture's unique SKU,
then opens the exact product testID. This avoids scroll-position dependence as
retained synthetic products accumulate. Each app restart resets that search.
Each repeat uses the same fixture recipe with fresh synthetic identities and
zero existing ratings, then `launchApp: clearState` proves the anonymous login
gate again. `run` refuses a fixture with an existing rating; it does not depend
on a previous run's account/session/rating. No deletion or database reset occurs.
`run-summary.json` records HEAD, tracked-tree cleanliness, simulator, product
identity, precondition and result. Require a clean committed tree for formal
repeatability evidence. Device password settings require no restoration.

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
