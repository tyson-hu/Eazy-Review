/** Trusted display copy when a stored curated caption is not honest. */
export const TRUSTED_CURATED_CAPTION = 'Picked by Eazy Review';

const CLAIMS_MEASURED_OR_UNMEASURED_FALSE_BASIS =
  /trending|ranked by eazy score|ranked by number of community ratings/i;
const SAYS_HAND_PICKED = /hand[\s-]*picked|picked by/i;

/**
 * Curated captions must say the list is hand-picked and must not claim a
 * measured basis. Write-time editing stays SQL / Studio / seed; this keeps
 * Feed copy honest if a stored caption still violates that rule.
 */
export function honestCuratedCaption(caption: string): string {
  const trimmed = caption.trim();
  if (
    CLAIMS_MEASURED_OR_UNMEASURED_FALSE_BASIS.test(trimmed) ||
    !SAYS_HAND_PICKED.test(trimmed)
  ) {
    return TRUSTED_CURATED_CAPTION;
  }
  return trimmed;
}
