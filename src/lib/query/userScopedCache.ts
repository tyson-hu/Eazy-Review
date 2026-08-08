import type { QueryClient } from '@tanstack/react-query';

import { USER_SCOPED_KEY_ROOTS } from '@/src/lib/query/keys';

/**
 * Removes queries owned by a prior authenticated user so profile and rating
 * cache cannot leak across sign-out or account switch.
 *
 * Cancels in-flight user-scoped queries first so a late response cannot
 * repopulate prior-user data after the purge.
 *
 * Public catalog keys are intentionally left intact.
 *
 * Call this from Task 16 auth transitions.
 */
export function removeUserScopedQueries(queryClient: QueryClient): void {
  for (const root of USER_SCOPED_KEY_ROOTS) {
    void queryClient.cancelQueries({ queryKey: root });
    queryClient.removeQueries({ queryKey: root });
  }
}
