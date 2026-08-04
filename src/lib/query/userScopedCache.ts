import type { QueryClient } from '@tanstack/react-query';

import { USER_SCOPED_KEY_ROOTS } from '@/src/lib/query/keys';

/**
 * Removes queries owned by a prior authenticated user so profile and rating
 * cache cannot leak across sign-out or account switch.
 *
 * Public catalog keys are intentionally left intact.
 *
 * Call this from Task 16 auth transitions (not wired in Task 14 screens).
 */
export function removeUserScopedQueries(queryClient: QueryClient): void {
  for (const root of USER_SCOPED_KEY_ROOTS) {
    queryClient.removeQueries({ queryKey: root });
  }
}
