/** Exact, timezone-stable verification date for catalog offer disclosures. */
export function formatVerifiedDate(checkedAt: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(checkedAt));
}
