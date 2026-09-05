/** Trusted display copy when stored curated presentation is not honest. */
export const TRUSTED_CURATED_CAPTION = 'Picked by Eazy Review';
export const TRUSTED_CURATED_TITLE = 'Curated picks';
export const TRUSTED_CURATED_LEAD_LABEL = "Editor's pick";

const CLAIMS_MEASURED_BASIS =
  /\brated\b|\bratings?\b|\bscores?\b|\branked\b|\branks?\b|\btrending\b/i;
const SAYS_HAND_PICKED = /hand[\s-]*picked|picked by/i;

function claimsMeasuredBasis(value: string): boolean {
  return CLAIMS_MEASURED_BASIS.test(value);
}

/**
 * Curated captions must say the list is hand-picked and must not claim a
 * measured basis. Write-time editing stays SQL / Studio / seed; this keeps
 * Feed copy honest if a stored caption still violates that rule.
 */
export function honestCuratedCaption(caption: string): string {
  const trimmed = caption.trim();
  if (claimsMeasuredBasis(trimmed) || !SAYS_HAND_PICKED.test(trimmed)) {
    return TRUSTED_CURATED_CAPTION;
  }
  return trimmed;
}

/**
 * Section titles and spotlight eyebrows must not claim a score, rating,
 * rank, or Trending basis without a real signal.
 */
export function honestCuratedTitle(title: string): string {
  const trimmed = title.trim();
  return claimsMeasuredBasis(trimmed) ? TRUSTED_CURATED_TITLE : trimmed;
}

export function honestCuratedLeadLabel(leadLabel: string): string {
  const trimmed = leadLabel.trim();
  return claimsMeasuredBasis(trimmed)
    ? TRUSTED_CURATED_LEAD_LABEL
    : trimmed;
}
