import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER } from '@/src/lib/accessibility/fontScale';
import { getScoreLabel, getScoreTone } from '@/src/lib/constants';

type ScoreBadgeProps = {
  label: string;
  /**
   * Composite score on the 0–100 scale (Eazy Score, Community Score, My Rating).
   * Never pass a 0–10 dimension here.
   */
  score100: number | null | undefined;
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
  score100,
  className,
  emptyLabel = 'No score yet',
  sourceLabel,
}: ScoreBadgeProps) {
  const tone = getScoreTone(score100);
  const scoreLabel = getScoreLabel(score100);

  return (
    <View
      className={`min-w-0 rounded-card border border-border bg-card px-3 py-2 ${className ?? ''}`}>
      <AppText variant="label">{label}</AppText>
      <AppText
        maxFontSizeMultiplier={SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER}
        className={`mt-1 text-xl font-semibold ${toneClasses[tone]}`}>
        {score100 == null ? '—' : `${score100} / 100`}
      </AppText>
      <AppText variant="caption" className="mt-0.5">
        {score100 == null ? emptyLabel : scoreLabel}
      </AppText>
      {sourceLabel ? (
        <AppText variant="caption" className="mt-0.5">
          {sourceLabel}
        </AppText>
      ) : null}
    </View>
  );
}
