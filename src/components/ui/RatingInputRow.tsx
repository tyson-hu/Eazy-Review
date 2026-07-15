import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Input } from '@/src/components/ui/Input';

type RatingInputRowProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  className?: string;
};

export function RatingInputRow({
  label,
  value,
  onChangeText,
  error,
  className,
}: RatingInputRowProps) {
  return (
    <View className={className}>
      <AppText variant="label">{label}</AppText>
      <Input
        className="mt-2"
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="1–10"
        accessibilityLabel={label}
      />
      {error ? (
        <AppText variant="caption" className="mt-1.5 text-negative">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
