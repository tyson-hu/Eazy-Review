import Slider from '@react-native-community/slider';
import { Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import {
  RATING_DIMENSION_MAX,
  RATING_DIMENSION_MIN,
  RATING_DIMENSION_STEP,
} from '@/src/features/ratings/validation';
import { formatDimensionScore10 } from '@/src/features/ratings/score';
import {
  SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER,
  UI_CHROME_MAX_FONT_SIZE_MULTIPLIER,
  useIsLargeContentSize,
} from '@/src/lib/accessibility/fontScale';

type DimensionStepperRowProps = {
  label: string;
  description: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  testID?: string;
};

/**
 * Dimension score control: native drag for large moves, ± for half-step
 * nudges, Clear for unanswered. null is unanswered; 0 is a real score.
 *
 * At large Dynamic Type, label/value stack and the slider sits above ±/Clear
 * so horizontal chrome does not clip text or steal tappable room.
 */
export function DimensionStepperRow({
  label,
  description,
  value,
  onChange,
  error,
  testID,
}: DimensionStepperRowProps) {
  const largeContent = useIsLargeContentSize();
  const hasError = Boolean(error);
  const isUnanswered = value == null;
  const canDecrement = isUnanswered || value! > RATING_DIMENSION_MIN;
  const canIncrement = isUnanswered || value! < RATING_DIMENSION_MAX;

  const decrement = () => {
    if (!canDecrement) {
      return;
    }
    if (value == null) {
      onChange(0);
      return;
    }
    const next = Math.round((value - RATING_DIMENSION_STEP) * 2) / 2;
    if (next < RATING_DIMENSION_MIN) {
      return;
    }
    onChange(next);
  };

  const increment = () => {
    if (!canIncrement) {
      return;
    }
    if (value == null) {
      onChange(RATING_DIMENSION_STEP);
      return;
    }
    const next = Math.round((value + RATING_DIMENSION_STEP) * 2) / 2;
    if (next > RATING_DIMENSION_MAX) {
      return;
    }
    onChange(next);
  };

  const clear = () => {
    onChange(null);
  };

  const valueText = (
    <AppText
      testID={testID ? `${testID}-value` : undefined}
      maxFontSizeMultiplier={SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER}
      className={`${largeContent ? 'mt-2' : 'min-w-[3.5rem] text-right'} text-lg font-semibold text-primary`}
      accessibilityLabel={
        isUnanswered
          ? `${label}, not rated`
          : `${label}, ${formatDimensionScore10(value)} of 10`
      }>
      {isUnanswered ? '—' : formatDimensionScore10(value)}
    </AppText>
  );

  const decrementButton = (
    <Pressable
      testID={testID ? `${testID}-dec` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Decrease ${label}`}
      accessibilityState={{ disabled: !canDecrement }}
      disabled={!canDecrement}
      onPress={decrement}
      className={`min-h-11 min-w-11 shrink-0 items-center justify-center rounded-card border border-border bg-card px-2 ${
        canDecrement ? '' : 'opacity-40'
      }`}>
      <AppText
        maxFontSizeMultiplier={UI_CHROME_MAX_FONT_SIZE_MULTIPLIER}
        className="text-xl font-semibold">
        −
      </AppText>
    </Pressable>
  );

  const incrementButton = (
    <Pressable
      testID={testID ? `${testID}-inc` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Increase ${label}`}
      accessibilityState={{ disabled: !canIncrement }}
      disabled={!canIncrement}
      onPress={increment}
      className={`min-h-11 min-w-11 shrink-0 items-center justify-center rounded-card border border-border bg-card px-2 ${
        canIncrement ? '' : 'opacity-40'
      }`}>
      <AppText
        maxFontSizeMultiplier={UI_CHROME_MAX_FONT_SIZE_MULTIPLIER}
        className="text-xl font-semibold">
        +
      </AppText>
    </Pressable>
  );

  const clearControl = !isUnanswered ? (
    <Pressable
      testID={testID ? `${testID}-clear` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Clear ${label}`}
      onPress={clear}
      className="min-h-11 shrink-0 items-center justify-center rounded-card px-2">
      <AppText
        maxFontSizeMultiplier={UI_CHROME_MAX_FONT_SIZE_MULTIPLIER}
        variant="caption"
        className="text-secondary">
        Clear
      </AppText>
    </Pressable>
  ) : largeContent ? null : (
    <View className="w-12 shrink-0" />
  );

  const slider = (
    <View className="min-w-0 flex-1">
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
        thumbTintColor="#0066cc"
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} score`}
        accessibilityHint="Adjust from 0 to 10 in half steps"
        accessibilityValue={
          isUnanswered
            ? { text: 'not rated' }
            : {
                min: RATING_DIMENSION_MIN,
                max: RATING_DIMENSION_MAX,
                now: value!,
                // Prefer absolute scale over iOS % of track range.
                text: `${formatDimensionScore10(value)} of 10`,
              }
        }
        accessibilityActions={[
          { name: 'increment', label: `Increase ${label}` },
          { name: 'decrement', label: `Decrease ${label}` },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            increment();
          } else if (event.nativeEvent.actionName === 'decrement') {
            decrement();
          }
        }}
      />
      <View className="mt-1 flex-row items-center justify-between">
        <AppText variant="caption" className="text-secondary">
          0
        </AppText>
        <AppText variant="caption" className="text-secondary">
          10
        </AppText>
      </View>
    </View>
  );

  return (
    <View testID={testID} className="border-b border-border pb-4">
      {largeContent ? (
        <View>
          <AppText
            variant="label"
            className="text-sm font-semibold normal-case tracking-normal text-primary">
            {label}
          </AppText>
          <AppText variant="caption" className="mt-1">
            {description}
          </AppText>
          {valueText}
        </View>
      ) : (
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <AppText
              variant="label"
              className="text-sm font-semibold normal-case tracking-normal text-primary">
              {label}
            </AppText>
            <AppText variant="caption" className="mt-1">
              {description}
            </AppText>
          </View>
          {valueText}
        </View>
      )}

      {largeContent ? (
        <View className="mt-3 gap-3">
          {slider}
          <View className="flex-row flex-wrap items-center gap-2">
            {decrementButton}
            {incrementButton}
            {clearControl}
          </View>
        </View>
      ) : (
        <View className="mt-3 flex-row items-center gap-2">
          {decrementButton}
          {slider}
          {incrementButton}
          {clearControl}
        </View>
      )}

      {hasError ? (
        <AppText
          variant="caption"
          className="mt-1.5 text-negative"
          accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
