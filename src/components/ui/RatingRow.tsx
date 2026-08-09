import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { formatDimensionScore10 } from '@/src/features/ratings/score';

type RatingRowProps = {
  label: string;
  /**
   * Dimension score on the 0–10 scale. Never pass a 0–100 composite here.
   */
  score10: number | null;
  className?: string;
};

export function RatingRow({ label, score10, className }: RatingRowProps) {
  const fillPercent =
    score10 == null ? 0 : Math.min(100, Math.max(0, (score10 / 10) * 100));
  const display =
    score10 == null ? '—' : `${formatDimensionScore10(score10)}/10`;

  return (
    <View className={className}>
      <View className="flex-row items-center justify-between">
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption">{display}</AppText>
      </View>
      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <View className="h-full rounded-full bg-accent" style={{ width: `${fillPercent}%` }} />
      </View>
    </View>
  );
}
