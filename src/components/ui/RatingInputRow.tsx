import { useId } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Input } from '@/src/components/ui/Input';

type RatingInputRowProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  /** Stronger first-row treatment for the primary score (e.g. Overall). */
  emphasized?: boolean;
  className?: string;
};

export function RatingInputRow({
  label,
  value,
  onChangeText,
  error,
  emphasized = false,
  className,
}: RatingInputRowProps) {
  const errorId = useId();
  const hasError = Boolean(error);

  return (
    <View
      className={`${emphasized ? 'border-b border-border pb-5' : ''} ${className ?? ''}`}>
      <AppText
        variant="label"
        className={emphasized ? 'text-sm font-semibold normal-case tracking-normal text-primary' : undefined}>
        {label}
      </AppText>
      <Input
        className={emphasized ? 'mt-2 min-h-14 border-accent text-lg' : 'mt-2'}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="1–10"
        accessibilityLabel={label}
        invalid={hasError}
        describedBy={hasError ? errorId : undefined}
        errorMessage={error}
      />
      {error ? (
        <AppText
          nativeID={errorId}
          accessibilityLiveRegion="polite"
          variant="caption"
          className="mt-1.5 text-negative">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
