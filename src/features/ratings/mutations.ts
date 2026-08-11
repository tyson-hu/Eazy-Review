import {
  onlineManager,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { saveUserRating } from '@/src/features/ratings/api';
import {
  normalizeRatingError,
  RatingError,
  RATING_USER_MESSAGES,
  type RatingError as RatingErrorType,
} from '@/src/features/ratings/errors';
import type { MyRating, SaveUserRatingInput } from '@/src/features/ratings/types';
import { useAuth } from '@/src/features/auth/hooks';
import { catalogKeys, ratingKeys } from '@/src/lib/query/keys';

export type SubmitRatingVariables = Omit<SaveUserRatingInput, 'userId'> & {
  userId?: string;
};

/**
 * Create or edit My Rating for the signed-in owner.
 *
 * networkMode: 'always' so offline still enters mutationFn and fails fast via
 * RatingError rather than pausing indefinitely (TanStack default 'online').
 *
 * Mutation retries are disabled. On success, invalidates public product caches
 * and owner rating scopes so Community Score / count and My Rating refresh
 * from server truth. Never optimistically writes aggregates.
 */
export function useSubmitRatingMutation(): UseMutationResult<
  MyRating,
  RatingErrorType,
  SubmitRatingVariables
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<MyRating, RatingErrorType, SubmitRatingVariables>({
    networkMode: 'always',
    mutationFn: async (variables) => {
      const userId = variables.userId ?? user?.id;
      if (!userId) {
        throw new RatingError(
          'unauthorized',
          RATING_USER_MESSAGES.unauthorized,
          { source: 'validation' },
        );
      }
      try {
        return await saveUserRating(
          {
            productId: variables.productId,
            userId,
            look: variables.look,
            outfit: variables.outfit,
            material: variables.material,
            craftsmanship: variables.craftsmanship,
            maintenance: variables.maintenance,
            comfort: variables.comfort,
            collection: variables.collection,
            value: variables.value,
            resalePotential: variables.resalePotential,
            acquisitionEase: variables.acquisitionEase,
            privateNote: variables.privateNote,
          },
          { isOnline: () => onlineManager.isOnline() },
        );
      } catch (error) {
        throw normalizeRatingError(error, {
          operation: 'save',
          isOffline: !onlineManager.isOnline(),
        });
      }
    },
    retry: false,
    onSuccess: async (_data, variables) => {
      const userId = variables.userId ?? user?.id;
      if (!userId) {
        return;
      }
      const { productId } = variables;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: catalogKeys.product(productId),
        }),
        queryClient.invalidateQueries({
          queryKey: catalogKeys.products(),
        }),
        queryClient.invalidateQueries({
          queryKey: ratingKeys.mine(userId, productId),
        }),
        queryClient.invalidateQueries({
          queryKey: ratingKeys.ratedProducts(userId),
        }),
      ]);
    },
  });
}
