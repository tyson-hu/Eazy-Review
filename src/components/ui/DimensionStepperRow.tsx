import { Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import {
  RATING_DIMENSION_MAX,
  RATING_DIMENSION_MIN,
  RATING_DIMENSION_STEP,
} from '@/src/features/ratings/validation';
import { formatDimensionScore10 } from '@/src/features/ratings/score';

type DimensionStepperRowProps = {
  label: string;
  description: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  testID?: string;
};

/**
 * Accessible 0–10 stepper (0.5 steps). null is unanswered; 0 is a real score.
 */
export function DimensionStepperRow({
  label,
  description,
  value,
  onChange,
  error,
  testID,
}: DimensionStepperRowProps) {
  const hasError = Boolean(error);
  const isUnanswered = value == null;
  const canDecrement =
    isUnanswered || value! > RATING_DIMENSION_MIN;
  const canIncrement =
    isUnanswered || value! < RATING_DIMENSION_MAX;

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

  return (
    <View testID={testID} className="border-b border-border pb-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <AppText variant="label" className="text-sm font-semibold normal-case tracking-normal text-primary">
            {label}
          </AppText>
          <AppText variant="caption" className="mt-1">
            {description}
          </AppText>
        </View>
        <AppText
          testID={testID ? `${testID}-value` : undefined}
          className="min-w-[3.5rem] text-right text-lg font-semibold text-primary"
          accessibilityLabel={
            isUnanswered
              ? `${label}, not rated`
              : `${label}, ${formatDimensionScore10(value)} of 10`
          }>
          {isUnanswered ? '—' : formatDimensionScore10(value)}
        </AppText>
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          testID={testID ? `${testID}-dec` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: !canDecrement }}
          disabled={!canDecrement}
          onPress={decrement}
          className={`h-11 w-11 items-center justify-center rounded-card border border-border bg-card ${
            canDecrement ? '' : 'opacity-40'
          }`}>
          <AppText className="text-xl font-semibold">−</AppText>
        </Pressable>
        <Pressable
          testID={testID ? `${testID}-inc` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: !canIncrement }}
          disabled={!canIncrement}
          onPress={increment}
          className={`h-11 w-11 items-center justify-center rounded-card border border-border bg-card ${
            canIncrement ? '' : 'opacity-40'
          }`}>
          <AppText className="text-xl font-semibold">+</AppText>
        </Pressable>
        {!isUnanswered ? (
          <Pressable
            testID={testID ? `${testID}-clear` : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={clear}
            className="ml-2 h-11 items-center justify-center rounded-card px-3">
            <AppText variant="caption" className="text-secondary">
              Clear
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="caption" className="ml-2 text-secondary">
            Unanswered
          </AppText>
        )}
      </View>

      {hasError ? (
        <AppText variant="caption" className="mt-1.5 text-negative" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
