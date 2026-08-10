# Rating Slider Gesture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom rating-track responder with Expo SDK 57's native slider so natural curved thumb drags adjust scores without scrolling the form or triggering full-screen Back.

**Architecture:** `DimensionStepperRow` remains controlled but delegates drag recognition and platform accessibility to `@react-native-community/slider`; minus, plus, Clear, visible value, and validation remain local. A local Rate screen-options component applies route-scoped iOS gesture policy in every Rate/Edit state, preserving edge Back while disabling iOS 26 full-screen dismissal.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6, `@react-native-community/slider`, NativeWind, jest-expo, React Native Testing Library.

## Global Constraints

- Preserve all existing uncommitted Task 17, Product Detail restoration, slider, test, documentation, and evidence work.
- Use `@react-native-community/slider`; do not add React Native Gesture Handler.
- Slider range is `0` through `10`, inclusive, with step `0.5`; `0` is valid and `null` is unanswered.
- Keep minus, plus, Clear, visible numeric value, error copy, and `onChange(value: number | null)`.
- Disable `fullScreenGestureEnabled` only for Rate/Edit; keep `gestureEnabled: true` so leading-edge Back remains available.
- Do not change the rubric, composite formula, validation, persistence, queries, API contracts, database schema, RLS, mutation behavior, or Product Detail hierarchy.
- Do not add haptics, decorative animation, or half-step tick labels.
- No commit, push, PR, deployment, staging write, or production write without separate explicit authorization. Commit steps below are approval-gated checkpoints.
- Physical-device completion remains unclaimed until a real iPhone passes the gesture matrix.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add the Expo-compatible `@react-native-community/slider` dependency.
- Modify `src/components/ui/DimensionStepperRow.tsx`: replace responder math and the drawn track with the native slider.
- Modify `src/components/ui/DimensionStepperRow.test.tsx`: replace coordinate tests with native-slider contract tests.
- Modify `src/features/ratings/RateAndDetail.test.tsx`: use native slider value changes and assert Rate/Edit gesture options.
- Modify `app/product/[id]/rate.tsx`: centralize Rate screen options and apply route-scoped iOS gesture settings.
- Modify `docs/DESIGN.md`, `docs/USER_FLOWS.md`, and `docs/TASKS.md`: make gesture behavior canonical and correct the stale `1–10` validation line.
- Modify `docs/superpowers/specs/2026-08-09-rating-slider-gesture-design.md`: update implementation status after validation.
- Create `docs/evidence/task-17-rating-slider-gesture/RESULT.md` and two accepted iOS screenshots.

---

### Task 1: Native Dimension Slider

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/components/ui/DimensionStepperRow.tsx:1-259`
- Modify: `src/components/ui/DimensionStepperRow.test.tsx:1-80`
- Modify: `src/features/ratings/RateAndDetail.test.tsx:55-78`

**Interfaces:**
- Consumes: `RATING_DIMENSION_MIN`, `RATING_DIMENSION_MAX`, `RATING_DIMENSION_STEP`; controlled `value: number | null` and `onChange: (value: number | null) => void`.
- Produces: unchanged `DimensionStepperRow` props plus native slider test ID `${testID}-slider`, range `0–10`, and step `0.5`.

- [ ] **Step 1: Install the SDK-compatible dependency**

```bash
npx expo install @react-native-community/slider
git diff -- package.json package-lock.json
```

Expected: the SDK-compatible community Slider is added. Stop if unrelated packages change.

- [ ] **Step 2: Write failing native-slider contract tests**

Mock only the native rendering boundary in `DimensionStepperRow.test.tsx`:

```tsx
jest.mock('@react-native-community/slider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});
```

Remove imports and tests for `snapDimensionTouch` and `dimensionScoreFromTrackX`. Add:

```tsx
it('configures 0–10 half steps without turning unanswered into zero', async () => {
  const onChange = jest.fn();
  const rendered = await render(
    <DimensionStepperRow
      label="Appearance"
      description="How it looks"
      value={null}
      onChange={onChange}
      testID="dim"
    />,
  );
  const slider = rendered.getByTestId('dim-slider');
  expect(slider.props.minimumValue).toBe(0);
  expect(slider.props.maximumValue).toBe(10);
  expect(slider.props.step).toBe(0.5);
  expect(slider.props.tapToSeek).toBe(true);
  expect(slider.props.value).toBe(0);
  expect(slider.props.accessibilityRole).toBe('adjustable');
  expect(slider.props.accessibilityLabel).toBe('Appearance score');
  expect(slider.props.accessibilityValue).toEqual({ text: 'not rated' });
  expect(rendered.getByTestId('dim-value').props.children).toBe('—');
  expect(onChange).not.toHaveBeenCalled();
});

it('forwards half-step changes and exposes the answered value', async () => {
  const onChange = jest.fn();
  const rendered = await render(
    <DimensionStepperRow
      label="Appearance"
      description="How it looks"
      value={7}
      onChange={onChange}
      testID="dim"
    />,
  );
  const slider = rendered.getByTestId('dim-slider');
  expect(slider.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 7 });
  await act(async () => {
    fireEvent(slider, 'valueChange', 7.5);
  });
  expect(onChange).toHaveBeenLastCalledWith(7.5);
});
```

Keep the minus/plus/Clear test and add this zero-value case:

```tsx
it('keeps zero as an answered value', async () => {
  const rendered = await render(
    <DimensionStepperRow
      label="Appearance"
      description="How it looks"
      value={0}
      onChange={jest.fn()}
      testID="dim"
    />,
  );
  expect(rendered.getByTestId('dim-value').props.children).toBe('0');
  expect(rendered.getByTestId('dim-slider').props.accessibilityValue).toEqual({
    min: 0,
    max: 10,
    now: 0,
  });
});
```

- [ ] **Step 3: Update Rate/Edit test input**

Add the same Slider mock to `RateAndDetail.test.tsx`. Replace `fillAllDimensions` with:

```tsx
async function fillAllDimensions(
  rendered: Awaited<ReturnType<typeof renderWithProviders>>,
  value: number,
) {
  for (const dim of RATING_DIMENSIONS) {
    await act(async () => {
      fireEvent(
        rendered.getByTestId(`rate-dim-${dim.key}-slider`),
        'valueChange',
        value,
      );
    });
  }
}
```

- [ ] **Step 4: Verify the old implementation fails**

```bash
npm test -- --runInBand src/components/ui/DimensionStepperRow.test.tsx src/features/ratings/RateAndDetail.test.tsx
```

Expected: FAIL because the custom `View` track lacks native slider props.

- [ ] **Step 5: Implement the native slider**

Remove React refs, gesture event types, coordinate helpers, responder callbacks, fill ratio, and the drawn track/thumb. Import:

```tsx
import Slider from '@react-native-community/slider';
import { Pressable, View } from 'react-native';
```

Replace the custom slider block with:

```tsx
<Slider
  testID={testID ? `${testID}-slider` : undefined}
  style={{ width: '100%', height: 44 }}
  minimumValue={RATING_DIMENSION_MIN}
  maximumValue={RATING_DIMENSION_MAX}
  step={RATING_DIMENSION_STEP}
  tapToSeek
  value={value ?? RATING_DIMENSION_MIN}
  onValueChange={onChange}
  minimumTrackTintColor="#0066cc"
  maximumTrackTintColor="#e0e0e0"
  accessibilityRole="adjustable"
  accessibilityLabel={`${label} score`}
  accessibilityHint="Adjust from 0 to 10 in half steps"
  accessibilityValue={
    isUnanswered
      ? { text: 'not rated' }
      : { min: RATING_DIMENSION_MIN, max: RATING_DIMENSION_MAX, now: value! }
  }
/>
<View className="mt-1 flex-row items-center justify-between">
  <AppText variant="caption" className="text-secondary">0</AppText>
  <AppText variant="caption" className="text-secondary">10</AppText>
</View>
```

Keep outer controls at `h-11`; update the comment to promise native drag, not cross-platform tap-to-seek.

- [ ] **Step 6: Verify the native slider**

```bash
npm test -- --runInBand src/components/ui/DimensionStepperRow.test.tsx src/features/ratings/RateAndDetail.test.tsx
npm run typecheck
```

Expected: both suites PASS and TypeScript accepts the package's Slider props plus inherited View accessibility props.

- [ ] **Step 7: Approval-gated commit checkpoint**

After explicit authorization only:

```bash
git add package.json package-lock.json src/components/ui/DimensionStepperRow.tsx src/components/ui/DimensionStepperRow.test.tsx src/features/ratings/RateAndDetail.test.tsx
git commit -m "fix: use native rating slider gestures"
```

Expected: only the dependency, component, and coupled tests are staged.

---

### Task 2: Rate/Edit Navigation Gesture Isolation

**Files:**
- Modify: `app/product/[id]/rate.tsx:56-520`
- Modify: `src/features/ratings/RateAndDetail.test.tsx:20-45,180-230`

**Interfaces:**
- Consumes: Expo Router `Stack.Screen` options and `HeaderBackButton`.
- Produces: `RateStackScreen({ title }: { title: string })` with `gestureEnabled: true` and `fullScreenGestureEnabled: false` in every Rate/Edit state.

- [ ] **Step 1: Make the Stack.Screen mock observable**

Before the Expo Router mock in `RateAndDetail.test.tsx`, add:

```tsx
const mockStackScreen = jest.fn(() => null);
```

Use it in the mock:

```tsx
Stack: {
  Screen: (props: Record<string, unknown>) => {
    mockStackScreen(props);
    return null;
  },
},
```

Reset `mockStackScreen` in `beforeEach`.

- [ ] **Step 2: Add the failing route gesture test**

```tsx
it('keeps edge Back but disables full-screen dismissal on Rate/Edit', async () => {
  signInAsA();
  mockGetUserRating.mockResolvedValue(null);
  const rendered = await renderWithProviders(<RateProductScreen />, {
    queryClient: testClient(),
  });
  await waitFor(() =>
    expect(rendered.getByTestId('rate-dim-look')).toBeTruthy(),
  );
  const hasRateGestureOptions = mockStackScreen.mock.calls.some(([props]) => {
    const options = (props as { options?: Record<string, unknown> }).options;
    return (
      options?.gestureEnabled === true &&
      options?.fullScreenGestureEnabled === false
    );
  });
  expect(hasRateGestureOptions).toBe(true);
  await rendered.cleanup();
});
```

- [ ] **Step 3: Verify the test fails**

```bash
npm test -- --runInBand src/features/ratings/RateAndDetail.test.tsx
```

Expected: FAIL because current options do not specify either gesture property.

- [ ] **Step 4: Centralize Rate/Edit screen options**

Add above `RateForm` in `app/product/[id]/rate.tsx`:

```tsx
function RateStackScreen({ title }: { title: string }) {
  return (
    <Stack.Screen
      options={{
        title,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        headerLeft: ({ canGoBack }) => (
          <HeaderBackButton canGoBack={canGoBack} />
        ),
      }}
    />
  );
}
```

Replace every repeated Rate/Edit `<Stack.Screen>` with `<RateStackScreen title={title} />` in `RateForm` or `<RateStackScreen title="Rate" />` in loading, redirect, invalid-product, offline, and error states. Do not change global navigation or another route.

- [ ] **Step 5: Verify navigation and auth branches**

```bash
npm test -- --runInBand src/features/ratings/RateAndDetail.test.tsx src/features/auth/RateGate.test.tsx
npm run typecheck
```

Expected: both suites PASS; signed-out routing and loading/error branches remain unchanged.

- [ ] **Step 6: Approval-gated commit checkpoint**

After explicit authorization only:

```bash
git add 'app/product/[id]/rate.tsx' src/features/ratings/RateAndDetail.test.tsx
git commit -m "fix: isolate rating gestures from back navigation"
```

Expected: no global navigation changes are staged.

---

### Task 3: Canonical Slider Documentation

**Files:**
- Modify: `docs/DESIGN.md:430-460`
- Modify: `docs/USER_FLOWS.md:279-313`
- Modify: `docs/TASKS.md:580-645`
- Modify: `docs/superpowers/specs/2026-08-09-rating-slider-gesture-design.md:1-190`

**Interfaces:**
- Consumes: validated component and route behavior from Tasks 1–2.
- Produces: canonical native-drag, fine-adjustment, gesture, accessibility, and device-acceptance language.

- [ ] **Step 1: Update the Rating Form design contract**

Replace stale custom tap/drag wording in `docs/DESIGN.md` with:

```markdown
- Show: platform-native 0–10 half-step sliders for large changes between − / +
  fine controls; Clear = unanswered; 0 is valid; retain the live My Rating
  preview, private note, and bounded save progress.
- Gesture ownership: horizontal and curved horizontal drags adjust the slider
  without scrolling; vertical-biased drags scroll without changing the value.
  Rate/Edit disables iOS full-screen Back while preserving edge Back.
- Accessibility: each slider exposes dimension, value, range, and adjustable
  actions. Minus, plus, and Clear remain 44-point alternatives.
```

Change `Values must be between 1 and 10` to `Values must be between 0 and 10 in 0.5 increments`.

- [ ] **Step 2: Update the canonical user flow**

Under Rating Form Requirements in `docs/USER_FLOWS.md`, add:

```markdown
Interaction:
- Drag the native slider for large changes; use − / + for half-step changes;
  Clear returns the field to unanswered.
- Horizontal-biased curved drags belong to the slider; vertical-biased drags
  belong to page scrolling.
- Slider interaction never dismisses Rate/Edit; iOS edge Back remains.
- VoiceOver announces dimension and value and adjusts in half steps.
```

Keep query invalidation and private-note rules unchanged.

- [ ] **Step 3: Update Task 17 deliverables and acceptance**

Name the native community slider, half-step controls, route-scoped Back behavior, and unchanged data contracts. Add acceptance for these exact gestures:

```text
horizontal curve: dx approximately 60, dy approximately 20
vertical curve: dx approximately 10, dy approximately 60
off-track drift: dy at least 40 after horizontal activation
slider Back isolation; leading-edge Back preservation
VoiceOver half-step adjustment; XXL Dynamic Type
```

Do not add an ADR; this is a Task 17 UI-regression correction.

- [ ] **Step 4: Update status and scan for contradictions**

After automated validation, use:

```markdown
Status: **Implemented locally; simulator and physical-device acceptance remain separately recorded.**
```

Run:

```bash
rg -n "tap/drag|between 1 and 10|full-screen|leading-edge|platform-native" docs/DESIGN.md docs/USER_FLOWS.md docs/TASKS.md docs/superpowers/specs/2026-08-09-rating-slider-gesture-design.md
```

Expected: no unconditional tap-to-seek promise or stale 1–10 validation.

- [ ] **Step 5: Approval-gated commit checkpoint**

After explicit authorization only:

```bash
git add docs/DESIGN.md docs/USER_FLOWS.md docs/TASKS.md docs/superpowers/specs/2026-08-09-rating-slider-gesture-design.md
git commit -m "docs: formalize native rating slider behavior"
```

Expected: documentation only, with no ADR or acceptance overclaim.

---

### Task 4: Validation And Gesture Evidence

**Files:**
- Create: `docs/evidence/task-17-rating-slider-gesture/RESULT.md`
- Create: `docs/evidence/task-17-rating-slider-gesture/screenshots/ios-01-rate-slider-standard.png`
- Create: `docs/evidence/task-17-rating-slider-gesture/screenshots/ios-02-rate-slider-xxl.png`
- Modify: `docs/TASKS.md:530-645` only if recorded evidence changes Task 17 status.

**Interfaces:**
- Consumes: Tasks 1–3 and the approved gesture matrix.
- Produces: separate `pass`, `fail`, `blocked`, and `not-tested` results for automation, simulator gestures, VoiceOver, Dynamic Type, and physical device.

- [ ] **Step 1: Run focused and repository validation**

```bash
npm test -- --runInBand src/components/ui/DimensionStepperRow.test.tsx src/features/ratings/RateAndDetail.test.tsx src/features/auth/RateGate.test.tsx
npm run typecheck
npm run lint
npm run check:readonly
git diff --check
```

Expected: tests and checks exit zero. Record baseline warnings separately.

- [ ] **Step 2: Run the authoritative Expo gate outside the sandbox**

```bash
npm run check
```

Expected: all tests PASS, Expo Doctor passes, and dependency alignment accepts `@react-native-community/slider`. Inspect `git status --short` afterward for unexpected route-preparation drift.

- [ ] **Step 3: Capture the standard 393-point layout**

Open a signed-in Rate/Edit form on the 393×852 logical iPhone simulator with standard Dynamic Type and at least one answered dimension. Save:

```text
docs/evidence/task-17-rating-slider-gesture/screenshots/ios-01-rate-slider-standard.png
```

Inspect it before acceptance. It must show the native slider, visible value, 0/10 endpoints, 44-point controls, no clipping, and persistent save footer.

- [ ] **Step 4: Execute the simulator gesture matrix**

Test sliders near the top, middle, and bottom and record:

```text
horizontal curve: dx about 60, dy about 20 -> value changes; scroll stable
vertical curve: dx about 10, dy about 60 -> page scrolls; value stable
off-track drift: dy >= 40 after activation -> value continues; no scroll
slider drag: left/right within slider -> Rate/Edit remains open
edge Back: leading-edge swipe outside slider -> route returns
```

If the control tool cannot produce a trustworthy curved gesture, mark it `blocked`; do not infer it from a screenshot.

- [ ] **Step 5: Verify VoiceOver and XXL Dynamic Type**

Verify the announced dimension, answered/not-rated value, and half-step adjustment. Switch to XXL Dynamic Type, repeat coarse and fine adjustment, and save:

```text
docs/evidence/task-17-rating-slider-gesture/screenshots/ios-02-rate-slider-xxl.png
```

Inspect for overlap or clipping, then restore the prior Dynamic Type setting.

- [ ] **Step 6: Write evidence without overclaiming**

Create `RESULT.md` with:

```markdown
# Task 17 Rating Slider Gesture Evidence

## Scope
## Build And Device
## Automated Validation
## Simulator Gesture Matrix
## Accessibility And Dynamic Type
## Physical Device
## Accepted Screenshots
## Limits
```

Use `not-tested` for physical device unless the human reports a real-iPhone result. State that screenshots prove layout, not gesture arbitration.

- [ ] **Step 7: Audit final scope**

```bash
git status --short
git diff --check
git diff --stat
```

Expected: this correction touches only dependency metadata, slider component/tests, Rate/Edit route/test, canonical docs/spec, and dedicated evidence. Report the pre-existing Product Detail restoration diff separately.

- [ ] **Step 8: Approval-gated evidence commit checkpoint**

After explicit authorization only:

```bash
git add docs/evidence/task-17-rating-slider-gesture docs/TASKS.md
git commit -m "test: record rating slider gesture evidence"
```

Expected: evidence/status only. Do not mark Task 17 accepted or physical-device complete without the human gate.
