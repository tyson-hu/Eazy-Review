# Eazy Review

Eazy Review is an independent engineering project: a mobile-first sneaker and
product review app for browsing a catalog, comparing Eazy Score with Community
Score, and maintaining a personal My Rating.

## Current Status

- Anonymous Browse and Product Detail load published catalog records through
  Supabase/PostgreSQL.
- Email/password accounts gate rating. Completed ratings persist per user,
  refresh the trigger-owned Community Score, and appear in the authenticated
  Rated Products history.
- Local/development password recovery uses `eazyreview` app deep links and a
  recovery-only authorization state. Preview and production recovery setup
  remains later release work.
- Connected reads and writes distinguish offline, reconnect, timeout, and
  backend-unreachable states; auth/recovery logic guards stale-session races.
  Failed rating writes preserve form input for manual retry; there is no
  durable offline cache or write queue.
- Task 19 protected account deletion is **Done — human accepted on
  2026-08-30.** Draft PR #43 remains open; readiness, merge, and production
  remain separate gates. H1/H2 were **tested-pass** on reviewed head
  `4c8ab7a`; acceptance includes the confirmation-clarity fix. No coding agent
  or tool executed deletion. See the
  [Task 19 dashboard](docs/evidence/task-19-protected-account-deletion/RESULT.md)
  and [verification details](docs/evidence/task-19-protected-account-deletion/VERIFICATION.md).

Feed remains a placeholder. Current task status and implementation order live
in [`docs/TASKS.md`](docs/TASKS.md).

## Current Stack

- React Native, Expo SDK 57, and Expo Router
- TypeScript and NativeWind
- Supabase with PostgreSQL and PostgreSQL Row Level Security (RLS)
- TanStack Query and NetInfo for connected state and request lifecycle

## Engineering Evidence

- Least-privilege grants, owner-scoped RLS, server-derived scores, and
  concurrency behavior: [data model and authorization contract](docs/DATA_MODEL.md)
  and [Tasks 11–12 database acceptance](docs/evidence/task-11-12-database-acceptance/RESULT.md).
- Catalog and rating failure handling, including physical-device offline and
  reconnect checks: [connected-request reliability decision](docs/decisions/2026-08-09-connected-request-reliability.md),
  [Task 15 evidence](docs/evidence/task-15-public-catalog/RESULT.md), and
  [Task 17 evidence](docs/evidence/task-17-my-rating-persistence/RESULT.md).
- Authentication, session restoration, and password recovery:
  [Task 16 evidence](docs/evidence/task-16-auth-account/RESULT.md) and
  [Task 18 evidence](docs/evidence/task-18-password-recovery/RESULT.md).
- Protected account-deletion boundary, local orchestration, and human
  acceptance evidence:
  [Task 19 evidence](docs/evidence/task-19-protected-account-deletion/RESULT.md).
- Automated frontend, database, security, and concurrency gates:
  [Expo CI](.github/workflows/expo-ci.yml) and
  [Database CI](.github/workflows/database-ci.yml).

## Documentation Map

- `docs/BLUEBOOK.md`: master product and engineering plan.
- `docs/DESIGN.md`: sole product UI source of truth (principles, tokens,
  typography, elevation, components, and screen rules).
- `docs/research/apple-visual-analysis.md`: archived, non-authoritative visual
  research.
- `docs/DOCUMENTATION_POLICY.md`: required doc-update rules for future changes.
- `docs/SECURITY.md`: security rules for install, shell, and secrets handling (all agents and humans).
- `docs/AGENT_WORKFLOW.md`: agent session flow, context map, definition of done, handoff and PR formats.
- `docs/LOOP_ENGINEERING.md`: loop anatomy, stop conditions, retry policy, and the loop-to-skill index.
- `docs/USER_FLOWS.md`: core user journeys and route expectations.
- `docs/DATA_MODEL.md`: Supabase schema, RLS, triggers, and rating summary logic.
- `docs/API_CONTRACTS.md`: frontend types, API functions, and query keys.
- `docs/ROADMAP.md`: milestone plan.
- `docs/TASKS.md`: current implementation task order.
- `docs/MCP_WORKFLOW.md`: coding-agent, Stitch, and MCP workflow rules.
- `docs/STITCH_PROMPTS.md`: reusable UI exploration prompts.
- `docs/DECISIONS.md`: generated index of current high-impact decisions.
- `docs/decisions/`: human-authored ADR-style records, recording rules, and the legacy archive.
- `docs/RELEASE_CHECKLIST.md`: release-readiness checklist.

Before writing Expo code, read the exact SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/`.

## Quality Checks

Validation commands and when to use each live in `docs/AGENT_WORKFLOW.md` (Validation Commands). For CI or local web-bundle verification: `CI=1 npx expo export --platform web`.
Decision records use `npm run decisions:build` and `npm run decisions:check`.
Use npm `>=11.16.0 <12` (CI pins `11.17.0`). The repository rejects unsupported
npm versions and fails dependency installs when a lifecycle script is not
covered by the version-pinned `package.json#allowScripts` policy.
The read-only repository gate is `npm run check:readonly`; the parent-owned
full Expo gate is `npm run check:expo` (`npm run check` is its alias). Secret
scanning uses `npm run check:secrets` and is included in both gates; it
includes recognized text files under bundled `app/`, `assets/`, and `src/`,
even when gitignored or symlinked to regular files, plus every recognized
root-level text file present on disk, including dynamic Expo/EAS configs and
dotfiles such as `.npmrc` and `.editorconfig`. Dependency lockfiles are
included, and direct PostgreSQL URLs plus non-empty service-role,
database-password, JWT-signing-secret, or Supabase management-token assignments
fail the scan regardless of value length.
Supabase Edge Function sources use the separate `npm run check:functions`
format/lint/frozen-type/test lane owned by Database CI; Expo and
`check:readonly` do not imply Deno coverage.

## Local Supabase

Requires Docker Desktop and the Supabase CLI (`brew install supabase/tap/supabase`).

```bash
supabase start              # once per machine session
npm run test:db:reset       # clean reset + pgTAP + concurrency races
supabase stop
```

Expo must receive only the project URL and publishable/legacy anon key (see
`.env.example`). Copy to `.env` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=<local API URL from supabase status>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable or legacy anon key>
```

`.env.example` values are intentionally invalid placeholders so misconfigured
boots fail with a clear development error. Never put a service-role key in the
mobile bundle (`docs/SECURITY.md`). Remote staging actions require a separate
explicit human authorization; production database work is forbidden for agents.

Regenerate TypeScript database types from the **local** schema only:

```bash
supabase start
npm run types:generate   # writes src/types/database.generated.ts
npm run types:check      # fails if committed types are stale
```

Frontend unit tests (jest-expo + React Native Testing Library):

```bash
npm test
```

Accepted Tasks 11–12 database evidence is preserved in
`docs/evidence/task-11-12-database-acceptance/RESULT.md`.
The reset loads Task 13's deterministic two-product catalog seed: a complete
Air Force 1 White fixture and a sparse Samba White and Black fixture. The test
command first verifies that the same-database reapply fixture is byte-identical
to the canonical `supabase/seed.sql` source.

## Physical iPhone Development And Offline Testing

Expo Go is **not** the primary iOS runtime for connected catalog work or
Task 15 offline acceptance. Use a local Expo development build on a physical
iPhone (Continuous Native Generation / `expo run:ios`; no EAS required for
this workflow).

### First-time install (development build)

Connect the iPhone (Trust the computer; Developer Mode enabled). With valid
public env vars in `.env` / `.env.local`, install once:

```bash
npm run ios:device
```

Tracked Expo `ios.bundleIdentifier` is currently
`com.tysonhu.eazyreview.dev` for **local development builds only**. Choose a
non-`.dev` production/distribution bundle ID before TestFlight or App Store
work; do not assume the tracked ID is final for release.

Xcode compiles a local native project under `ios/` (generated, gitignored —
never commit it), installs **Eazy Review** on the selected physical device, and
starts Metro. The app opens as an Expo **development build**, not Expo Go.

Signing (Apple team selection, device trust) is a human Xcode step. Do not put
Team IDs, certificates, or provisioning profiles in the repository.

The tracked compatibility plugin (`plugins/withIosDeviceBuildFixes.js`)
currently applies three CNG fixes required by the tested Xcode 27 / iOS 27 SDK
environment: User Script Sandboxing off, Expo iOS modules built from source
(not precompiled XCFrameworks), and UIKit **UIScene** life cycle generation
(Info.plist scene manifest + `SceneDelegate` + scene-owned AppDelegate boot).
If a fresh local device path fails without that plugin, regenerate with it
applied (`npx expo prebuild --platform ios` then `npm run ios:device`).

Controlled no-plugin reproduction evidence for this branch is in
`docs/evidence/task-15-public-catalog/RESULT.md` (Xcode 27 compatibility
reproduction). In that A/B run, removing the plugin regenerated the stock
template (no scene manifest / SceneDelegate) and the installed app
force-quit at launch with `EXC_BREAKPOINT` /
`NoSceneLifecycleAdoption`; restoring the plugin cleared that launch failure
on the same physical iPhone path. The sandbox and precompiled-module sub-fixes
remain part of the same plugin for the tested environment; they were not
independently re-failed in that A/B run. Decision record:
`docs/decisions/2026-08-07-temporary-ios-device-build-cng-plugin.md`.

### Email confirmation and password recovery redirects

Signup confirmation and password recovery both use the app scheme
`eazyreview` so a physical device can open the app. Hosted Auth Site URL
values such as `http://localhost:3000` are unreachable on a phone.

- Signup confirmation: `emailRedirectTo` from
  `Linking.createURL('/auth/sign-in')` in `signUpWithPassword`.
- Password recovery: `redirectTo` from
  `Linking.createURL('/auth/reset-password')` in `requestPasswordReset`.
- Local Auth must allow the documented scheme/path variants in
  `supabase/config.toml` `additional_redirect_urls`.
- Staging/production Redirect URLs (and Site URL if used as fallback) are
  human-applied; without the `eazyreview` allowlist entry, Auth falls back to
  Site URL and confirmation links keep `redirect_to=http://localhost:3000`.

### Password recovery (Task 18 local)

Email/password recovery uses the app scheme `eazyreview` and the route
`/auth/reset-password`.

- Request screen: **Forgot password?** on Sign In or signed-out Account →
  `/auth/forgot-password`.
- Completion deep-link target: `/auth/reset-password`.
- `redirectTo` is built with `expo-linking` `createURL('/auth/reset-password')`
  (not a production host).
- For physical-device recovery, set the running local Auth email-link origin in
  the gitignored root `.env` (the `/auth/v1` suffix is required):

  ```bash
  SUPABASE_AUTH_EXTERNAL_URL=http://<Mac-LAN-IP>:54321/auth/v1
  ```

  This controls the verification link host in the email and is separate from
  `EXPO_PUBLIC_SUPABASE_URL`. A phone cannot reach a `127.0.0.1` verification
  link because that address points back to the phone.
- Local Supabase Auth must allow the documented scheme/path variants in
  `supabase/config.toml` `additional_redirect_urls`. Restart local Supabase
  after changing that list or `SUPABASE_AUTH_EXTERNAL_URL`, then request a
  fresh recovery email; old links retain their original host and redirect.
- Staging/production Auth redirect allowlists are **not** configured by this
  task (Tasks 25–26 + human).
- Prefer a Development build (`npm run ios:device`) for physical recovery-link
  acceptance. Do not log recovery tokens or paste complete recovery URLs into
  chats.

Evidence and the physical device checklist:
`docs/evidence/task-18-password-recovery/RESULT.md`.

Expo SDK packages must remain on the compatible patch versions reported by
Expo Doctor. Use `npx expo install <package>` for Expo-managed dependencies and
verify alignment with `npx expo install --check`; the exact versions are in
`package.json`.

### Daily development

```bash
npm run start:dev-client
```

TypeScript/JavaScript edits Fast Refresh through Metro. Rebuild native only
after native dependency or Expo native config changes (`npm run ios:device`
again).

Script roles (intentional):

| Script | Purpose |
| --- | --- |
| `npm start` / `npm run start:dev-client` | Metro only |
| `npm run start:ios` / `start:android` | Metro + open simulator/emulator |
| `npm run ios` / `npm run android` | **Native** compile (`expo run:*`), not Metro-only |
| `npm run ios:device` | Physical device Debug install |
| `npm run ios:device:release` | Physical device Release (embedded JS; offline cold-start) |

### Metro-independent offline cold launch (Release)

A debug development build loads JS from Metro. That is **not** a valid proof of
cold launch under 100% packet loss. For true offline cold launch:

```bash
npm run ios:device:release
```

This local Release configuration embeds the JavaScript bundle. After install:

1. Stop Metro completely.
2. Force-quit Eazy Review on the phone.
3. Confirm the app opens from the home-screen icon **without** a Metro URL /
   development-launcher screen.

### Network conditioning (phone only)

Use only the iPhone:

**Settings → Developer → Network Link Conditioner**

- Prefer a **100% Loss** profile for offline checks.
- Do **not** enable Network Link Conditioner on the Mac; leave the Mac network
  alone so Metro, toolchains, and local Supabase stay available to the agent.

Two different offline behaviors (Task 15 defers persistent Query cache):

| Scenario | Build | App process | What you prove |
| --- | --- | --- | --- |
| Cached in-memory offline | Development build (Metro OK) | Keep app alive after loading catalog online | Shell/navigation, offline UI, in-memory cache, Retry, refetch when connectivity returns |
| No-cache cold launch offline | **Release** build, Metro stopped | Force-quit, then launch under 100% Loss | Shell launches without Metro; Browse shows offline/error + Retry (no catalog expected after kill); refetch after reconnect |

Cached-in-memory testing intentionally does **not** force-quit the app.
Force-quitting clears the in-memory TanStack Query cache.

### Device-reachable Supabase URL (Mac LAN)

Physical Browse/Product Detail online data (and post-reconnect catalog
refetch on device) need `EXPO_PUBLIC_SUPABASE_URL` to resolve to a host the
phone can reach. On a physical iPhone, `localhost` / `127.0.0.1` / `::1`
are the **phone itself**, not the Mac — those values **fail on device**.

Use one machine-local URL for Mac web, simulator, and physical device during
local development:

1. Keep local Supabase running on the Mac (`supabase start`; API port
   `54321`). Docker should listen on all interfaces (`*:54321`), not
   loopback-only.
2. Put Mac and iPhone on the **same Wi-Fi** (avoid guest networks / client
   isolation; pause VPNs that block LAN if needed).
3. Read the Mac LAN IP (active Wi-Fi is often `en0`):

   ```bash
   ipconfig getifaddr en0
   # or: route -n get default  → interface, then ipconfig getifaddr <iface>
   ```

4. Create an untracked `.env.local` (gitignored via `.env.*`; do not commit
   it). Prefer this over changing committed docs:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=http://<Mac-LAN-IP>:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable or legacy anon key from supabase status>
   ```

   Example shape only: `http://192.168.1.123:54321`. Copy the real local
   public key from `supabase status` / your existing `.env` — never from
   `.env.example` placeholders, and never a service-role key
   (`docs/SECURITY.md`).

5. Before blaming app code, prove reachability:
   - Mac: `curl -i http://<Mac-LAN-IP>:54321/rest/v1/` (any HTTP response
     from PostgREST proves TCP/HTTP; `401`/`404` still OK).
   - iPhone Safari: open the same URL. Any Supabase/PostgREST response =
     network PASS. Timeout / server not found = network FAIL — fix LAN first.

6. Restart Metro after changing public env (`npm run start:dev-client`), then
   fully close and reopen the development build on the phone so the new URL
   is embedded. Env-only changes do **not** require a native rebuild; rebuild
   with `npm run ios:device` only when tracked native Expo config changes.

Do **not** auto-rewrite localhost to a LAN IP in application code, scan the
LAN from the app, open a tunnel (ngrok/Cloudflare/localtunnel), or point the
device at staging/production for this workflow. This LAN setup is intentional
local development only; it does not open Supabase to the public internet.

### Acceptance note

Physical-device results are **not** PASS until a human (or this machine with
the connected phone) observes them. Ship/setup of the development and Release
builds alone does **not** complete Task 15 acceptance. Observed physical
acceptance for this branch (2026-08-07) is recorded in
`docs/evidence/task-15-public-catalog/RESULT.md`.

## Documentation Discipline

Doc-update rules live in `docs/DOCUMENTATION_POLICY.md`; apply them before commit/PR handoff.
