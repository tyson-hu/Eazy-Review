/** `1 rating`, `12 ratings`. Callers decide what to show for zero. */
export function formatRatingCount(ratingCount: number): string {
  return `${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'}`;
}

/**
 * Community count context shared with the Product Detail badge rule in
 * `docs/DESIGN.md`: fewer than five ratings are an early score.
 */
export function formatCommunityRatingContext(ratingCount: number): string {
  const countLabel = formatRatingCount(ratingCount);
  return ratingCount < 5 ? `Early score · ${countLabel}` : countLabel;
}
