import type { QueryClient } from '@tanstack/react-query';

import { USER_SCOPED_KEY_ROOTS } from '@/src/lib/query/keys';

/**
 * Removes queries owned by a prior authenticated user so profile and rating
 * cache cannot leak across sign-out or account switch.
 *
 * Guarantees cancel-then-remove ordering: waits for each cancel request to
 * complete before removing queries under the same user-scoped root, so a late
 * response cannot repopulate prior-user data after the purge.
 *
 * Public catalog keys are intentionally left intact.
 *
 * Call this from Task 16 auth transitions.
 */
export async function removeUserScopedQueries(
  queryClient: QueryClient,
): Promise<void> {
  for (const root of USER_SCOPED_KEY_ROOTS) {
    await queryClient.cancelQueries({ queryKey: root });
    queryClient.removeQueries({ queryKey: root });
  }
}
