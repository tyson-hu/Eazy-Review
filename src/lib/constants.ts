export const SCORE_LABELS = {
  excellent: 'Excellent',
  strong: 'Strong',
  good: 'Good',
  mixed: 'Mixed',
  risky: 'Risky',
} as const;

export function getScoreTone(score: number | null | undefined) {
  if (score == null) {
    return 'neutral' as const;
  }
  if (score >= 90) {
    return 'positive' as const;
  }
  if (score >= 80) {
    return 'positive' as const;
  }
  if (score >= 70) {
    return 'warning' as const;
  }
  if (score >= 60) {
    return 'warning' as const;
  }
  return 'negative' as const;
}

export function getScoreLabel(score: number | null | undefined) {
  if (score == null) {
    return 'No score yet';
  }
  if (score >= 90) {
    return SCORE_LABELS.excellent;
  }
  if (score >= 80) {
    return SCORE_LABELS.strong;
  }
  if (score >= 70) {
    return SCORE_LABELS.good;
  }
  if (score >= 60) {
    return SCORE_LABELS.mixed;
  }
  return SCORE_LABELS.risky;
}
