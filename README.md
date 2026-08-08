# Eazy Review

Eazy Review is a mobile-first product review and discovery app focused on sneakers and products. The core loop is simple: browse products, open a product detail page, compare Eazy Score with Community Score, submit or edit My Rating, and find rated products later.

The repository contains the accepted mock Browse → Product Detail → Rating
Form experience plus the accepted local/staging Supabase schema and
least-privilege authorization foundation. Expo still uses mock data and
session-only My Rating state; `docs/TASKS.md` is the sole current-status and
implementation-order source.

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

## Stack Direction

- Expo SDK 57
- Expo Router
- React Native
- TypeScript
- NativeWind
- Supabase (schema/authorization shipped; Expo client foundation in Task 14)
- TanStack Query (foundation in Task 14; screen queries in Task 15+)

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
public env vars in `.env`, install once:

```bash
npm run ios:device
```

Xcode compiles a local native project under `ios/` (generated, gitignored —
never commit it), installs **Eazy Review** on the selected physical device, and
starts Metro. The app opens as an Expo **development build**, not Expo Go.

Signing (Apple team selection, device trust) is a human Xcode step. Do not put
Team IDs, certificates, or provisioning profiles in the repository.

If a fresh local build fails with **Sandbox deny** on writing `ip.txt`, device
install fails because **ExpoModulesCore.framework has no code signature**, or
the app **force-quits at launch** on iOS 27 / Xcode 27 (`EXC_BREAKPOINT` /
`NoSceneLifecycleAdoption`), regenerate native iOS with the project’s tracked
plugin applied (`npx expo prebuild --platform ios` then
`npm run ios:device`). That plugin turns off Xcode User Script Sandboxing,
builds Expo iOS modules from source for signing, and adopts the UIKit
**UIScene** life cycle (Info.plist scene manifest + `SceneDelegate`) required
by the iOS 27 SDK.

### Daily development

```bash
npm run start:dev-client
```

TypeScript/JavaScript edits Fast Refresh through Metro. Rebuild native only
after native dependency or Expo native config changes (`npm run ios:device`
again).

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

## Current Product State

Browse → Product Detail → Rating Form mock UX and the Tasks 11–14 database,
authorization, seed, client, query, lifecycle, and test foundations are
accepted. Task 15 connects anonymous Browse and Product Detail to the two
deterministic local catalog fixtures through the accepted Supabase and TanStack
Query boundary, with physical-iPhone LAN and offline/reconnect acceptance
recorded on this branch (including Metro-independent Release cold start).
Authentication and rating persistence remain out of scope. Task 15 did not
contact staging or production. `docs/TASKS.md` is the sole current-status and
implementation-order ledger.
