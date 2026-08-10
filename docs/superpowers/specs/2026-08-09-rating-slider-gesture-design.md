# Rating Slider Gesture Design

Status: **Implemented locally; simulator and physical-device acceptance remain separately recorded.**

Date: 2026-08-09

Task: Task 17 — My Rating Persistence And Rated Products

## Problem

The current custom rating slider claims every touch at contact and continues to
claim every move. It does not distinguish horizontal slider intent from
vertical page-scroll intent. On a phone held in one hand, a thumb naturally
travels along a curved path, so one drag can change the score, scroll the form,
or begin backward navigation.

The Rate/Edit route also inherits Expo Router's iOS navigation gesture defaults.
On iOS 26, full-screen dismiss gestures are enabled by default, which lets a
horizontal slider drag compete with Back even when the touch did not begin at
the leading screen edge.

## Desired Outcome

Rating should remain easy with one thumb:

- A horizontal or naturally curved horizontal drag adjusts only the slider.
- A predominantly vertical drag scrolls only the form.
- Adjusting a slider never navigates away from Rate/Edit.
- The standard leading-edge Back gesture remains available.
- Fine-step buttons, VoiceOver adjustment, and Clear remain available so
  dragging is never the only way to set or correct a score.

## Approved Direction

Replace the custom responder-driven track with Expo's supported native slider
from `@react-native-community/slider`.

The component uses the platform slider implementation on each supported
surface:

- Native platform slider on iOS.
- Native platform slider on Android.
- Range input behavior on web.

Configure it with minimum `0`, maximum `10`, and step `0.5`. Keep the existing
dimension label, description, visible value, minus button, plus button, Clear
action, validation copy, and My Rating calculation contract.

On the Rate/Edit route only, set `fullScreenGestureEnabled: false` while keeping
the normal iOS navigation gesture enabled. This restores Back to the standard
leading-edge gesture instead of disabling gesture navigation entirely.

## Interaction Contract

### Gesture ownership

1. A drag with clear horizontal intent changes the slider value and does not
   change the vertical scroll position.
2. A naturally curved horizontal drag remains owned by the slider after the
   slider begins adjusting, even when the finger drifts above or below the
   visible track.
3. A drag with clear vertical intent scrolls the Rate/Edit form and does not
   change the slider value.
4. A drag that begins within a slider's interaction region must not dismiss the
   route or reveal the previous route.
5. A leading-edge swipe outside a slider's interaction region must continue to
   perform the normal iOS Back gesture.
6. The implementation must not disable scrolling for the entire form or
   disable Back navigation for the entire route.

### Value behavior

- Range: `0` through `10`, inclusive.
- Step: `0.5`.
- `0` is a valid submitted score.
- `null` means unanswered and is visually distinct from `0`.
- Slider movement provides live visible value feedback.
- Enable `tapToSeek` on iOS. Preserve the package's native track behavior on
  Android and web.
- Minus and plus adjust by exactly `0.5` and remain the precise single-pointer
  alternative to dragging.
- Clear changes the dimension to `null`.
- The slider does not change the composite formula, validation, persistence,
  query, or database contracts.

### Touch geometry

- The slider interaction region is at least 44 points high.
- Minus and plus remain at least 44 by 44 points.
- Clear remains at least 44 points high.
- A visual thumb may be smaller than 44 points when the underlying interactive
  hit region remains at least 44 points.
- Adjacent controls must not overlap the slider's hit region.

### Feedback

- The numeric value updates during adjustment.
- The filled portion of the track may communicate progress, but color is not
  the only indication of the current value.
- Do not add haptics, animation, tick labels for every half-step, or other
  interaction ornament in this correction.

## Accessibility Contract

- The slider is exposed as an adjustable control named `<Dimension> score`.
- Assistive technology receives the current value, minimum, and maximum.
- Increment and decrement accessibility actions change the value by `0.5`.
- An unanswered dimension is announced as not rated rather than as zero.
- The visible minus, plus, and Clear controls retain complete labels and
  disabled states.
- The value remains understandable without perceiving track color.
- Dynamic Type must not overlap the slider, value, or adjacent controls.
- Dragging is not the only operation method; the fine-step controls satisfy the
  same scoring task with repeated single-pointer actions.

## Component Boundaries

`DimensionStepperRow` continues to own only presentation and dimension-value
interaction. It receives `value` and `onChange` and does not own form state,
validation, persistence, or navigation.

`RateForm` continues to own dimension state and composition. Its only
slider-related responsibility is rendering the row and preserving the form
during existing offline, timeout, validation, and save-error states.

The Rate/Edit route owns the route-scoped iOS navigation gesture option. No
global navigator behavior changes are allowed.

## Dependencies And Scope

- Add `@react-native-community/slider` using Expo's SDK-compatible installer
  and record the generated package-lock change.
- Do not add React Native Gesture Handler for this correction.
- Do not retain the custom touch-to-score responder helpers after the native
  slider replaces them.
- Do not change the ten-dimension rubric, half-step rules, composite formula,
  database schema, RLS, mutation behavior, or API contracts.
- Preserve all existing uncommitted Task 17 and Product Detail restoration
  changes.

## Test Contract

### Automated

- Rendering an unanswered dimension shows not rated and the native slider's
  minimum visual position without converting the form value to zero.
- Slider changes propagate valid half-step values through `onChange`.
- Minus, plus, and Clear retain boundary and null behavior.
- Accessibility label, value, and adjustable actions cover answered and
  unanswered states.
- Rate/Edit retains all existing signed-out, loading, offline, error, create,
  edit, validation, and save branches.
- The route config disables only full-screen Back on iOS and does not disable
  the standard navigation gesture.

### Interactive simulator and physical device

At 393-point width, verify these gestures on sliders near the top, middle, and
bottom of the form:

1. Horizontal-biased curve: approximately 60 points horizontal and 20 points
   vertical. The score changes; the page does not scroll.
2. Vertical-biased curve: approximately 10 points horizontal and 60 points
   vertical. The page scrolls; the score does not change.
3. Off-track drift: begin adjusting horizontally, then drift at least 40 points
   vertically while continuing horizontally. Adjustment continues without page
   scroll or route dismissal.
4. Slider Back isolation: drag left and right on each tested slider. Rate/Edit
   remains open.
5. System Back preservation: start at the leading screen edge outside a slider
   and swipe right. The route returns normally.
6. Coarse and fine adjustment: drag to a distant value, then use minus and plus
   to reach an exact half-step; also verify track seeking where the platform
   supplies it.
7. Accessibility: verify VoiceOver name, value, increment, decrement, and
   unanswered copy.
8. Resilience: repeat with XXL Dynamic Type and one-handed thumb reach.

Physical-device completion remains unclaimed until a real iPhone passes this
matrix.

## Documentation And Evidence

Implementation must synchronize the Rating Form interaction language in
`docs/DESIGN.md`, `docs/USER_FLOWS.md`, and Task 17 in `docs/TASKS.md`.

Capture simulator evidence and record the gesture matrix under a dedicated
Task 17 evidence folder. Screenshots can prove layout and Dynamic Type, but the
gesture results must be recorded as observed behavior because a still image
cannot prove gesture arbitration.

## Source Basis

- Expo documents the supported native community Slider package:
  <https://docs.expo.dev/versions/latest/sdk/slider/>.
- The package documents `testID`, inherited View props, and iOS `tapToSeek`:
  <https://github.com/callstack/react-native-slider/blob/main/README.md>.
- Expo Router documents that iOS 26 enables full-screen dismissal by default:
  <https://docs.expo.dev/versions/latest/sdk/router/>.
- Apple recommends familiar horizontal sliders, visible exact values and
  steppers where precision helps:
  <https://developer.apple.com/design/human-interface-guidelines/sliders>.
- Apple recommends controls with at least 44-by-44-point hit targets:
  <https://developer.apple.com/design/tips/>.
- WCAG 2.2 requires a non-dragging single-pointer alternative for functionality
  implemented through dragging:
  <https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html>.

## Acceptance Boundary

This correction is complete only when automated checks pass, simulator gesture
and Dynamic Type evidence is recorded, and the human physical-device matrix is
completed. Passing unit tests or screenshots alone must not be reported as
proof that diagonal gesture arbitration works on a real phone.
