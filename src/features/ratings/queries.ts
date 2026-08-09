import {
  onlineManager,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  getUserRatedProducts,
  getUserRating,
} from '@/src/features/ratings/api';
import type { RatingError } from '@/src/features/ratings/errors';
import type { MyRating, RatedProductItem } from '@/src/features/ratings/types';
import { useAuth } from '@/src/features/auth/hooks';
import { useCatalogOnlineStatus } from '@/src/features/products/queries';
import { ratingKeys } from '@/src/lib/query/keys';

export type RatingQueryResult<T> = UseQueryResult<T, RatingError> & {
  isOffline: boolean;
};

/**
 * Owner My Rating for Product Detail / Rate form.
 * Disabled until an authenticated user id is known.
 * Key family: `ratingKeys.mine(userId, productId)` — never catalog keys.
 */
export function useUserRatingQuery(
  productId: string,
): RatingQueryResult<MyRating | null> {
  const { user, isSignedIn } = useAuth();
  const userId = user?.id ?? '';
  const isOnline = useCatalogOnlineStatus();

  const query = useQuery<MyRating | null, RatingError>({
    queryKey: ratingKeys.mine(userId || 'anonymous', productId || 'unknown'),
    queryFn: ({ signal }) =>
      getUserRating(productId, userId, {
        signal,
        isOnline: () => onlineManager.isOnline(),
      }),
    enabled: isSignedIn && Boolean(userId) && productId.length > 0,
    staleTime: 30_000,
    retry: 0,
  });

  return { ...query, isOffline: !isOnline };
}

/**
 * Owner Rated Products list.
 * Key family: `ratingKeys.ratedProducts(userId)`.
 */
export function useUserRatedProductsQuery(): RatingQueryResult<
  RatedProductItem[]
> {
  const { user, isSignedIn } = useAuth();
  const userId = user?.id ?? '';
  const isOnline = useCatalogOnlineStatus();

  const query = useQuery<RatedProductItem[], RatingError>({
    queryKey: ratingKeys.ratedProducts(userId || 'anonymous'),
    queryFn: ({ signal }) =>
      getUserRatedProducts(userId, {
        signal,
        isOnline: () => onlineManager.isOnline(),
      }),
    enabled: isSignedIn && Boolean(userId),
    staleTime: 30_000,
    retry: 0,
  });

  return { ...query, isOffline: !isOnline };
}
