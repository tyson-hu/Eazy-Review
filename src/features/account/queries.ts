import { useQuery } from '@tanstack/react-query';

import { getMyProfile } from '@/src/features/account/api';
import { useAuth } from '@/src/features/auth/hooks';
import { useCatalogOnlineStatus } from '@/src/features/products/queries';
import { accountKeys } from '@/src/lib/query/keys';
import type { AccountProfile } from '@/src/types/account';

/**
 * Owner profile for Account. Disabled when signed out.
 * Failures do not alter AuthProvider session state.
 */
export function useMyProfileQuery() {
  const { user, isSignedIn } = useAuth();
  const userId = user?.id ?? '';
  const isOnline = useCatalogOnlineStatus();

  const query = useQuery<AccountProfile>({
    queryKey: accountKeys.profile(userId || 'anonymous'),
    queryFn: ({ signal }) => getMyProfile(userId, { signal }),
    enabled: isSignedIn && Boolean(userId),
    staleTime: 60_000,
    retry: 0,
  });

  return { ...query, isOffline: !isOnline };
}
