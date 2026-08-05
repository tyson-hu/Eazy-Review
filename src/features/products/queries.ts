import {
  onlineManager,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { getProductById, getProducts } from '@/src/features/products/api';
import {
  type CatalogError,
  shouldRetryCatalogQuery,
} from '@/src/features/products/errors';
import { catalogKeys } from '@/src/lib/query/keys';
import type {
  ProductCardData,
  ProductDetailPublicData,
} from '@/src/types/product';

export type CatalogQueryResult<T> = UseQueryResult<T, CatalogError> & {
  isOffline: boolean;
};

function subscribeToOnlineState(onChange: () => void): () => void {
  return onlineManager.subscribe(onChange);
}

function getOnlineSnapshot(): boolean {
  return onlineManager.isOnline();
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

export function useCatalogOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToOnlineState,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
}

export function useProductsQuery(): CatalogQueryResult<ProductCardData[]> {
  const isOnline = useCatalogOnlineStatus();
  const query = useQuery<ProductCardData[], CatalogError>({
    queryKey: catalogKeys.products(),
    queryFn: ({ signal }) =>
      getProducts({
        signal,
        isOnline: () => onlineManager.isOnline(),
      }),
    networkMode: 'online',
    retry: shouldRetryCatalogQuery,
  });

  return { ...query, isOffline: !isOnline };
}

export function useProductQuery(
  productId: string,
): CatalogQueryResult<ProductDetailPublicData> {
  const isOnline = useCatalogOnlineStatus();
  const query = useQuery<ProductDetailPublicData, CatalogError>({
    queryKey: catalogKeys.product(productId),
    queryFn: ({ signal }) =>
      getProductById(productId, {
        signal,
        isOnline: () => onlineManager.isOnline(),
      }),
    enabled: productId.length > 0,
    networkMode: 'online',
    retry: shouldRetryCatalogQuery,
  });

  return { ...query, isOffline: !isOnline };
}
