import { onlineManager, useQuery } from '@tanstack/react-query';

import { getFeedCollections } from '@/src/features/feed/api';
import {
    type CatalogError,
    shouldRetryCatalogQuery,
} from '@/src/features/products/errors';
import {
    type CatalogQueryResult,
    useCatalogOnlineStatus,
} from '@/src/features/products/queries';
import { catalogKeys } from '@/src/lib/query/keys';
import type { FeedCollection } from '@/src/types/product';

export function useFeedCollectionsQuery(): CatalogQueryResult<FeedCollection[]> {
  const isOnline = useCatalogOnlineStatus();
  const query = useQuery<FeedCollection[], CatalogError>({
    queryKey: catalogKeys.feedCollections(),
    queryFn: ({ signal }) =>
      getFeedCollections({
        signal,
        isOnline: () => onlineManager.isOnline(),
      }),
    networkMode: 'online',
    retry: shouldRetryCatalogQuery,
  });

  return { ...query, isOffline: !isOnline };
}
