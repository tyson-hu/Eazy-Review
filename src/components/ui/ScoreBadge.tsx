import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { getScoreLabel, getScoreTone } from '@/src/lib/constants';

type ScoreBadgeProps = {
  label: string;
  score: number | null | undefined;
  className?: string;
  emptyLabel?: string;
  sourceLabel?: string;
};

const toneClasses = {
  positive: 'text-positive',
  warning: 'text-warning',
  negative: 'text-negative',
  neutral: 'text-secondary',
} as const;

export function ScoreBadge({
  label,
  score,
  className,
  emptyLabel = 'No score yet',
  sourceLabel,
}: ScoreBadgeProps) {
  const tone = getScoreTone(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <View className={`rounded-card border border-border bg-card px-3 py-2 ${className ?? ''}`}>
      <AppText variant="label">{label}</AppText>
      <AppText className={`mt-1 text-xl font-semibold ${toneClasses[tone]}`}>
        {score == null ? '—' : score}
      </AppText>
      <AppText variant="caption" className="mt-0.5">
        {score == null ? emptyLabel : scoreLabel}
      </AppText>
      {sourceLabel ? (
        <AppText variant="caption" className="mt-0.5">
          {sourceLabel}
        </AppText>
      ) : null}
    </View>
  );
}
