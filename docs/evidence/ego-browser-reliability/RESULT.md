# Ego-browser reliability follow-up

Date: 2026-09-05 America/Chicago. User selected diagnosis and a representative
Expo journey after candidate C adopted ego-browser across the project SDLC.

Environment status: web preview `pass` for the bounded anonymous journey below;
iOS Simulator `not-run`; physical device `not-tested`. Overall: capture and
accessible-name workarounds verified; native JavaScript dialog automation
remains blocked. This is not full app/release acceptance.

## Reproduction and remedy

At CSS viewport393×852 and document scrollY683.5, captureScreenshot produced
another blank PNG. The same state captured through Page.captureScreenshot,
captureBeyondViewport:true, and a clip using pageInfo sx/sy/w/h showed the
Bottom control. Both images were inspected. This establishes a usable capture
workaround, not the internal cause of the vendor helper defect. No vendor
runtime or cache was patched.

The fixture's simplified snapshot omitted the Search products textbox name.
Accessibility.getFullAXTree supplied role textbox, name Search products and
ignored:false, along with four correctly named buttons. The same command
returned app controls recorded in app-controls.json. This is web AX evidence,
not native screen-reader verification or whole-app accessibility certification.

## Representative app journey

A separate Expo process served localhost:18764 from this checkout with
EXPO_NO_DOTENV=1 and public configuration read from the running local Supabase.
No values were printed or persisted to env files. Existing Expo8081 was not
changed. Metro bound IPv6 loopback; initial 127.0.0.1 attempts were refused,
then localhost returned HTTP200 and the journey proceeded.

1. Anonymous Browse loaded the local seeded catalog.
2. Search zz-no-such-product showed No products found (app-empty.txt).
3. Search Air Force returned the expected Nike product (app-search.txt).
4. Clicking the product opened its seeded UUID route and loaded Detail,
   Eazy Score, Community Score and Sign in to rate (app-detail.txt).
5. CDP viewport capture produced a visually inspected Detail screenshot with
   product content and the sign-in CTA. The PNG is786×1704 for393×852 CSS pixels;
   device scaling must not be mistaken for a viewport mismatch.
6. Clicking Sign in to rate opened the sign-in form with the product returnTo
   route (app-auth-gate.txt). No credentials, login, rating, account deletion,
   remote database access or other account mutation was submitted.

The app back-click was not independently verified as navigation and is not
counted as a passed step. Server logs included existing Supabase lock-option
and color-environment warnings; no claim of a warning-free runtime is made.

## Dialog limitation

One controlled fixture attempt enabled Page events, scheduled a local confirm,
then attempted Page.handleJavaScriptDialog after200ms. The runtime immediately
reported user control and stopped. Earlier trials had the same class of stop.
This is observed association, not proof of which internal component transferred
control or whether the user interacted. No automated dismissal was established.
The user explicitly continued; no further dialog attempts were made. Future
native-dialog criteria require human handling or a separately verified runtime
remedy; ordinary DOM dialogs are not classified as broken by this result.

## Cleanup and evidence

completeTaskSpace(6,{keep:false}) returned done:true. Owned fixture18763 and
Expo18764 processes were stopped; neither port has a remaining listener.

Selected for future Git delivery: this report, text/AX evidence, hashes and
screenshots/02-cdp-scrolled.png plus screenshots/03-app-detail.png. The blank
01-helper-scrolled.png is a local diagnostic capture excluded by .gitignore;
its hash preserves the failed baseline without presenting it as valid proof.
Selected proof is included in the combined B/C delivery.

Canonical procedure: docs/WEB_MOBILE_PREVIEW_SOP.md. Final review/check results
are recorded in docs/notes/preview-driver-c.md.
