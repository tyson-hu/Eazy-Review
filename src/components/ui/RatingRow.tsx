import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';

type RatingRowProps = {
  label: string;
  value: number | null;
  max?: number;
  className?: string;
};

export function RatingRow({ label, value, max = 10, className }: RatingRowProps) {
  const fillPercent =
    value == null || max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <View className={className}>
      <View className="flex-row items-center justify-between">
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption">{value == null ? '—' : `${value}/${max}`}</AppText>
      </View>
      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <View className="h-full rounded-full bg-accent" style={{ width: `${fillPercent}%` }} />
      </View>
    </View>
  );
}
